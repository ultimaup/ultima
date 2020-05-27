const got = require('got')
const unzip = require('unzip-stream')
const tar = require('tar-fs')
const tarStream = require('tar-stream')
const path = require('path')
const uuid = require('uuid').v4
const { createGzip } = require('zlib')
const stream = require('stream');
const {promisify} = require('util');
const yaml = require('js-yaml');
const gunzip = require('gunzip-maybe')
const mime = require('mime-types')
const fse = require('fs-extra')

const s3 = require('./s3')
const Deployment = require('./db/Deployment')
const Action = require('./db/Action')
const RouteModel = require('./db/Route')
const route = require('./route')

const { ensureSchema, getSchemaEnv, genPass } = require('./dbMgmt')

const { giteaStream } = require('./gitea')

const {
	GITEA_URL,

	ENDPOINTS_ENDPOINT,
	S3_ENDPOINT,
	BUILDER_BUCKET_ID,
	REGISTRY_CACHE_ENDPOINT,
} = process.env

const streamToBuf = stream => {
	return new Promise(resolve => {
		const bufs = []
		stream.on('data', (d) => { bufs.push(d) })
		stream.on('end', function(){
			const buf = Buffer.concat(bufs)
			resolve(buf)
		})
	})
}

const pipeline = promisify(stream.pipeline);

const ensureBuilderBundle = async () => {
    let githash = 'dev'

    if (await fse.exists('.githash')) {
        githash = await fse.readFile('.githash')
        return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/builders/build-agent-${githash}.tar.gz`
    }

    const Key = `builders/build-agent-${githash}.tar.gz`
    const builderPath = path.resolve(__dirname, 'build-agent')
    const { writeStream, promise } = s3.uploadStream({ Key })
    const tarStream = tar.pack(builderPath)
    tarStream.pipe(createGzip()).pipe(writeStream)

    return await promise
}


const removeLeadingSlash = (str) => {
	if (str[0] === '/') {
		return str.substring(1)
	}
	return str
}

const repoRelative = (loc) => {
	return path.resolve('/', loc).substring(1)
}

const createParentAction = async ({ owner, repoName, branch, hash, triggeredBy, data }) => {
	const id = uuid()

	await Action.query().insert({
		id,
		owner,
		repoName,
		branch,
		hash,
		metadata: JSON.stringify({ ...data, triggeredBy }),
	})

	return id
}

const markActionComplete = async (id, updates = {}) => {
	const u = updates
	if (u.data) {
		u.metadata = JSON.stringify(u.data)
		delete u.data
	}
	await Action.query().where('id', id).update({
		completedAt: new Date(),
		...updates,
	}).skipUndefined()
}

const checkAliasUse = async ({ alias, subdomain }) => {
	const existing = await RouteModel.query().where({ alias })
	return !!existing.find(route => !route.source.startsWith(subdomain))
}

const logAction = async (parentId, { type, title, description, data, completedAt }) => {
	const id = uuid()
	const action = {
		id,
		parentId,
		type, title, description,
		metadata: data ? JSON.stringify(data) : data,
	}
	if (completedAt) {
		action.completedAt = new Date()
	}
	await Action.query().insert(action)
	return id
}

const removeDeployment = async deploymentId => {
	return got.post(`${ENDPOINTS_ENDPOINT}/remove-deployment/${deploymentId}`).json()
}

const buildResource = async ({ invocationId, config, resourceName, repository,user, schemaEnv, codeTarUrl, parentActionId, after, branch, repo, user  }) => {
	const builderEndpointId = `${repository.full_name.split('/').join('-')}-builder-${resourceName}-${uuid()}`

	const builderAlocation = await logAction(parentActionId, { type: 'debug', title: 'allocating builder', data: { resourceName } })

	const runtime = (config[resourceName] && config[resourceName].runtime) || 'node'

	console.log(invocationId, `ensuring ${runtime} builder endpoint exists with id ${builderEndpointId}`)

	let container
	try {
		// ensure builder endpoint exists
		await Deployment.ensure({
			id: builderEndpointId,
			stage: 'builder',
			repoName: repository.full_name,
			owner: user,
			command: './build-agent-bin',
			bundleLocation: await ensureBuilderBundle(),
			runtime,
			env: {
				CI: true,
				npm_config_registry: REGISTRY_CACHE_ENDPOINT,
				yarn_config_registry: REGISTRY_CACHE_ENDPOINT,
				...schemaEnv,
				...routesEnv(config, { branch, repo, user })
			},
		})
		container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${builderEndpointId}/`).then(r => r.body))

		await markActionComplete(builderAlocation, { data: { builderEndpointId, resourceName } })
	} catch (e) {
		await markActionComplete(builderAlocation, { type: 'error' })
		throw e
	}

	console.log(invocationId, `builder endpoint with id ${builderEndpointId} exists`)
	// pipe tarStream to builder endpoint, response is stream of result
	let resultingBundleLocation
	let builtBundleKey
	const buildActionId = await logAction(parentActionId, { type: 'info', title: 'building', data: { logTag: builderEndpointId, resourceName } })
	try {
		builtBundleKey = `${repository.full_name.split('/').join('-')}/${resourceName}/${after}.tar.gz`
		const { writeStream, promise } = s3.uploadStream({ Key: builtBundleKey })

		await pipeline(
			giteaStream(codeTarUrl),
			got.stream.post(container.hostname, {
				headers: {
					// 'content-type': 'application/octet-stream',
					'x-parent-invocation-id': invocationId,
					'x-resource-name': resourceName,
				},
			}),
			writeStream
		)

		console.log(invocationId, `piping built result to ${builtBundleKey}`)
		resultingBundleLocation = await promise
		console.log(invocationId, `piped built result to ${builtBundleKey}`, resultingBundleLocation)
	} catch (e) {
		await markActionComplete(buildActionId, { type: 'error' })
		throw e
	}

	await removeDeployment(builderEndpointId)

	await markActionComplete(buildActionId, { data: { logTag: builderEndpointId, resultingBundleLocation, resourceName } })
	return {
		resultingBundleLocation,
		builtBundleKey,
		resourceName,
	}
}

const deployWebResource = async ({ ref, resourceName, parentActionId, after, builtBundleKey, staticContentLocation }) => {
	const bucketName = after.substring(0,8)
	const actualBucketName = await s3.ensureWebBucket(bucketName)
	console.log('uploading', staticContentLocation, 'to', actualBucketName)
	const deployActionId = await logAction(parentActionId, { type: 'info', title: 'deploying web resource', data: { resourceName } })

	// TODO: use stream from earlier instead of fetching from s3 again
	const builtBundleStream = s3.getStream({ Key: builtBundleKey })

	const ts = tarStream.extract()
	ts.on('entry', (header, stream, next) => {
		const loc = header.name
		console.log('found', loc)
		if (loc === staticContentLocation || header.type !== 'file') {
			console.log('skipping', loc)
			stream.resume()
			stream.on('end', next)
			return
		}
		if (!loc.startsWith(staticContentLocation)) {
			console.log('skipping', loc)
			
			stream.resume()
			stream.on('end', next)
			return
		} else {
			const realPath = loc.substring(staticContentLocation.length)
			console.log('uploading', loc)
			const { writeStream, promise } = s3.uploadStream({
				Key: removeLeadingSlash(realPath),
				Bucket: actualBucketName,
				ContentType: mime.lookup(realPath) || 'application/octet-stream',
			})
			stream.pipe(writeStream)
			promise.then(() => {
				console.log('uploaded', realPath, 'to', actualBucketName)
				next()
			}).catch(e => {
				console.error('failed to upload', realPath, 'to', actualBucketName, e)
				throw e
			})
		}
	})

	try {
		await pipeline(
			builtBundleStream,
			gunzip(),
			ts,
		)
	} catch (e) {
		await markActionComplete(deployActionId, { type: 'error' })
		console.error(e)
		throw e
	}
	
	const staticUrl = `${S3_ENDPOINT}/${actualBucketName}`

	await markActionComplete(deployActionId, { data: { url: staticUrl, resourceName } })

	return {
		resourceName,
		url: staticUrl,
	}
}

const getSubdomain = ({ 
	resourceName,
	branch,
	repo,
	user,
}) => `${resourceName}-${branch}-${repo}-${user}`

const routesEnv = (config, { branch, repo, user }) => {
	const obj = {}
	Object.keys(config).map(resourceName => {
		const subdomain = getSubdomain({ resourceName, branch, repo, user })
		return {
			resourceName,
			url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${subdomain}.${PUBLIC_ROUTE_ROOT}:${PUBLIC_ROUTE_ROOT_PORT}`,
		}
	}).forEach(({ resourceName, url }) => {
		obj[`${repo.toUpperCase().split('-').join('_')}_${resourceName.toUpperCase()}_URL`] = url
	})
	return obj
}

const deployApiResource = async ({ ref, invocationId, repository, config, resourceName, after, parentActionId, resultingBundleLocation, schemaEnv, branch, repo, user }) => {
	const resultingEndpointId = `${repository.full_name.split('/').join('-')}-${after}`
	let endpointUrl
	const deployActionId = await logAction(parentActionId, { type: 'info', title: 'deploying api', resourceName })
	const runtime = (config[resourceName] && config[resourceName].runtime) || 'node'
	console.log(invocationId, `creating deployment ${resultingEndpointId} for ${resultingBundleLocation}`)
	await Deployment.ensure({
		id: resultingEndpointId,
		repoName: repository.full_name,
		hash: after,
		stage: ref,
		command: config[resourceName].start,
		bundleLocation: resultingBundleLocation,
		env: {
			...schemaEnv,
			...routesEnv(config, { branch, repo, user }),
		},
		runtime,
	})
	
	try {
		const container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${resultingEndpointId}/`).then(r => r.body))
		endpointUrl = container.hostname
	} catch (e) {
		await markActionComplete(deployActionId, { type: 'error', title: 'deployment failed', data: { error: e, resourceName } })
		throw e
	}

	if (endpointUrl) {
		console.log(invocationId, `deployed ${resultingEndpointId} to`, endpointUrl)
		await markActionComplete(deployActionId, { title: 'deployment succeeded', data: { url: endpointUrl, resourceName } })
	} else {
		console.error(invocationId, endpointUrl, 'deployment failed')
		throw new Error('deployment failed')
	}

	return {
		resourceName,
		url: endpointUrl,
		deploymentId: resultingEndpointId,
	}
}

const deployRoute = async ({ config, parentActionId, resourceName, deploymentId, url ,branch, repo, user }) => {
	const routeActionId = await logAction(parentActionId, { type: 'debug', title: 'Putting resource live', data: { resourceName } })
	const subdomain = getSubdomain({ resourceName,
		branch,
		repo,
		user,
	})
	// get current route
	const [currentRoute] = await route.get(subdomain)

	// add endpoint route
	const resourceRoute = {
		subdomain,
		destination: url,
		deploymentId,
		extensions: config[resourceName].type === 'api' ? [] : ['index.html']
	}

	let type
	let message
	const alias = config && config[resourceName] && config[resourceName]['branch-domains']
	if (alias) {
		if (await checkAliasUse({ alias, subdomain })) {
			type = 'warning'
			message = 'warning: unable to use custom domain as it\'s currently in use by another project.'
		} else {
			resourceRoute.alias = alias
		}
	}

	const resourceUrl = await route.set(resourceRoute)
	if (currentRoute && currentRoute.deploymentId) {
		await removeDeployment(currentRoute.deploymentId)
	}
	
	await markActionComplete(routeActionId, { type, message, data: { resourceName, resourceUrl, url } })
	
	return {
		resourceUrl,
		resourceName,
	}
}

const runTests = async ({ ref, after, repository, pusher, commits }) => {
	console.log(`gitea webhook triggered because ${pusher.login} pushed ${after} to ${ref} on ${repository.full_name}`)

	const branch = ref.split('refs/heads/')[1]
	const [user,repo] = repository.full_name.split('/')

	if (after === '0000000000000000000000000000000000000000') {
		console.log('branch deleted, removing environment')
		const [currentRoute] = await route.get(`${branch}.${repo}.${user}`)
		if (currentRoute) {
			await removeDeployment(currentRoute.deploymentId)
			console.log('environment removed', currentRoute)
		}
		console.log('done')
		return null
	}
	let schemaEnv = {}
	const commitMessage = commits.find(c => c.id === after)

	const actionData = {
		commits,
		pusherImageUrl: pusher.avatar_url,
	}

	const parentActionId = await createParentAction({
		owner: user, 
		repoName: repo, 
		branch, 
		hash: after,
		description: commitMessage,
		triggeredBy: pusher.login,
		data: actionData,
	})

	const invocationId = parentActionId

	const codeZipUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.zip`

	let config
	let shouldDie = false

	try {
		await new Promise((resolve, reject) => {
			let promises = []
			// handle "special" files special-y
			giteaStream(codeZipUrl)
				.pipe(unzip.Parse())
				.on('entry', entry => {
					const { path, type } = entry
					let realPath = path.split('/')
					realPath.shift()
					realPath = realPath.join('/')

					if (realPath === '.ultima.yml') {
						promises.push(
							streamToBuf(entry)
							.then(buf => {
								return buf.toString('utf8')
							})
							.then(text => yaml.safeLoad(text))
							.then(configFromYml => {
								config = configFromYml
								console.log(configFromYml)
							})
							.catch(e => {
								logAction(parentActionId, { type: 'error', title: 'failed to parse .ultima.yml', data: { error: e } })
								shouldDie = 'failed to parse .ultima.yml'
								console.error('failed to parse .ultima.yml', e)
							})
						)
					}

					if (path === '.env.example') {
						// send to env handler
						return
					}

					// leave the rest
					entry.autodrain()
				})
				.on('error', reject)
				.on('finish', () => {
					Promise.all(promises).then(resolve)
				})
		})

		if (shouldDie) {
			throw new Error(shouldDie)
		}

		const hasAPI = !config || Object.values(config).some(cfg => cfg.type === 'api')
		if (!config) {
			logAction(parentActionId, { type: 'info', title: 'no .ultima.yml found', description: 'assuming nodejs api app', completedAt: true })
		} else {
			logAction(parentActionId, { type: 'debug', title: `Found ${Object.keys(config).length} resources to deploy`, completedAt: true })
		}

		if (hasAPI) {
			const dbActionId = await logAction(parentActionId, { type: 'info', title: 'allocating schema' })

			try {
				const schemaInfo = {
					username: `${repository.full_name.split('/').join('-')}-${branch}`,
					password: genPass(`${repository.full_name.split('/').join('-')}-${branch}`),
					schema: `${repository.full_name.split('/').join('-')}-${branch}`,
				}

				await ensureSchema(schemaInfo)

				schemaEnv = getSchemaEnv(schemaInfo)
				await markActionComplete(dbActionId, { data: { schemaName: schemaInfo.schema } })
			} catch (e) {
				await markActionComplete(dbActionId, { type: 'error', data: { error: e } })
				throw e
			}
		}

		const codeTarUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.tar.gz`

		const resourceRoutes = await Promise.all(Object.keys(config).map(resourceName => {
			return buildResource({
				invocationId, config, resourceName, repository,user, schemaEnv, codeTarUrl, parentActionId, after, branch, repo, user
			}).then(({ resultingBundleLocation, builtBundleKey, resourceName }) => {
				if (config[resourceName].type === 'api') {
					return deployApiResource({ ref, invocationId, repository, config, resourceName, after, resultingBundleLocation, schemaEnv, branch, repo, user })
				} else {
					const staticContentLocation = repoRelative(config[resourceName].buildLocation)
					return deployWebResource({ ref, invocationId, parentActionId, resourceName, after, builtBundleKey, staticContentLocation })
				}
			})
		}))

		const liveResourceRoutes = await Promise.all(resourceRoutes.map(route => deployRoute({ ...route, config, parentActionId ,branch, repo, user })))

		await markActionComplete(parentActionId, {
			data: {
				...actionData,
				liveResourceRoutes,
			},
		})

		console.log(invocationId, `complete`)

		return {
			liveResourceRoutes,

			repoName: repository.full_name,
			branch,
		}
	} catch (e) {
		console.error(e)
		await markActionComplete(parentActionId,{
			type: 'error',
			description: e.message,
			data: {
				...actionData,
				error: e,
			},
		})
	}

	return null
}

module.exports = {
    runTests,
}