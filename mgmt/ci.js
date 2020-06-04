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
const Resource = require('./db/Resource')
const route = require('./route')

const { ensureSchema, getSchemaEnv, genPass } = require('./dbMgmt')

const { giteaStream } = require('./gitea')

const {
	GITEA_URL,

	ENDPOINTS_ENDPOINT,
	S3_ENDPOINT,
	BUILDER_BUCKET_ID,
	REGISTRY_CACHE_ENDPOINT,

	PUBLIC_ROUTE_ROOT_PROTOCOL,
	PUBLIC_ROUTE_ROOT,
	PUBLIC_ROUTE_ROOT_PORT,
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


const ensureBuilderBundle = async (force) => {
    let githash = 'dev'

    if (await fse.exists('.githash')) {
		githash = await fse.readFile('.githash')
		if (!force) {
			return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/builders/build-agent-${githash}.tar.gz`
		}
    }

    const Key = `builders/build-agent-${githash}.tar.gz`
    const builderPath = path.resolve(__dirname, 'build-agent')
    const { writeStream, promise } = s3.uploadStream({ Key })
    const tarStream = tar.pack(builderPath)
    tarStream.pipe(createGzip()).pipe(writeStream)

	await promise
	
	return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/builders/build-agent-${githash}.tar.gz`
}

console.log('uploading builder bundle')
ensureBuilderBundle(true).then(() => {
    console.log('uploaded builder bundle')
}).catch(e => {
    console.error('error uploading builder bundle')
    console.error(e)  
})

const repoRelative = (...loc) => {
	return path.resolve('/', ...loc).substring(1)
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

const removeOrphans = async ({
	repository,
	ref,
	resourceNames,
}) => {
	const orphans = await Resource.query().where({
		repoName: repository.full_name,
		stage: ref,
	}).whereNot({
		type: 'postgres',
	}).whereNotIn('name', resourceNames)

	await Promise.all(orphans.map(async ({ deploymentId, routeId, id }) => {
		if (deploymentId) {
			await removeDeployment(deploymentId)
		}
		if (routeId) {
			await Resource.query().update({
				routeId: null,
			}).where({ id })
		}
	}))
}

const buildResource = async ({ invocationId, config, resourceName, repository,user, schemaEnv, codeTarUrl, parentActionId, after, branch, repo  }) => {
	const builderEndpointId = `${repository.full_name.split('/').join('-')}-builder-${resourceName}-${uuid()}`

	if (!config[resourceName].build && !config[resourceName].install && !config[resourceName].test && config[resourceName].type === 'web') {
		return {
			codeTarUrl,
			resourceName,
		}
	}

	const builderAlocation = await logAction(parentActionId, { type: 'debug', title: 'allocating builder', data: { resourceName } })

	const runtime = (config[resourceName] && config[resourceName].runtime) || 'node'
	const customEnv = (config[resourceName] && config[resourceName].environment) || {}

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
				ULTIMA_RESOURCE_CONFIG: JSON.stringify(config[resourceName]),
				...customEnv,
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

const deployWebResource = async ({ ref, repository, resourceName, parentActionId, after, builtBundleKey, codeTarUrl, staticContentLocation }) => {
	const bucketName = `${after.substring(0,8)}-${resourceName}`
	const actualBucketName = await s3.ensureWebBucket(bucketName)
	console.log('uploading', staticContentLocation, 'to', actualBucketName)
	const deployActionId = await logAction(parentActionId, { type: 'info', title: 'deploying web resource', data: { resourceName } })

	// TODO: use stream from earlier instead of fetching from s3 again
	const builtBundleStream = builtBundleKey ? s3.getStream({ Key: builtBundleKey }) : giteaStream(codeTarUrl)

	const ts = tarStream.extract()
	ts.on('entry', (header, stream, next) => {
		let loc = codeTarUrl ? header.name.substring(header.name.split('/')[0].length + 1) : header.name
		if (!codeTarUrl) {
			console.log(loc, staticContentLocation)
		}
		if (loc === staticContentLocation || header.type !== 'file') {
			stream.resume()
			stream.on('end', next)
			return
		}
		if (!loc.startsWith(staticContentLocation)) {			
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

	const resourceId = uuid()
	await Resource.query().insert({
		id: resourceId,
		name: resourceName,
		type: 'web',
		repoName: repository.full_name,
		deploymentId: actualBucketName,
		stage: ref,
	})

	await markActionComplete(deployActionId, { data: { url: staticUrl, resourceName } })

	return {
		resourceName,
		url: staticUrl,
		resourceId,
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
	const resultingEndpointId = `${repository.full_name.split('/').join('-')}-${resourceName}-${after}`
	let endpointUrl
	const deployActionId = await logAction(parentActionId, { type: 'info', title: 'deploying api', resourceName })
	const runtime = (config[resourceName] && config[resourceName].runtime) || 'node'
	console.log(invocationId, `creating deployment ${resultingEndpointId} for ${resultingBundleLocation}`)
	const customEnv = (config[resourceName] && config[resourceName].environment) || {}
	
	const deployment = await Deployment.ensure({
		id: resultingEndpointId,
		repoName: repository.full_name,
		hash: after,
		stage: ref,
		command: config[resourceName].start,
		bundleLocation: resultingBundleLocation,
		env: {
			...customEnv,
			...schemaEnv,
			...routesEnv(config, { branch, repo, user }),
		},
		runtime,
	})
	
	try {
		const container = await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${resultingEndpointId}/`).json()
		endpointUrl = container.hostname
	} catch (e) {
		await markActionComplete(deployActionId, { type: 'error', title: 'deployment failed', data: { error: e, resourceName } })
		throw e
	}

	let resourceId
	if (endpointUrl) {
		resourceId = uuid()
		await Resource.query().insert({
			id: resourceId,
			type: 'api',
			repoName: repository.full_name,
			deploymentId: deployment.id,
			name: resourceName,
			stage: ref,
		})
		console.log(invocationId, `deployed ${resultingEndpointId} to`, endpointUrl)
		await markActionComplete(deployActionId, { title: 'deployment succeeded', data: { url: endpointUrl, resourceName } })
	} else {
		console.error(invocationId, endpointUrl, 'deployment failed')
		throw new Error('deployment failed')
	}

	return {
		resourceName,
		url: endpointUrl,
		resourceId,
		deploymentId: resultingEndpointId,
	}
}

const deployRoute = async ({ resourceId, config, parentActionId, resourceName, deploymentId, url ,branch, repo, user }) => {
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
	const alias = config && config[resourceName] && config[resourceName]['branch-domains'] && config[resourceName]['branch-domains'][branch]
	if (alias) {
		if (await checkAliasUse({ alias, subdomain })) {
			type = 'warning'
			message = 'warning: unable to use custom domain as it\'s currently in use by another project.'
		} else {
			resourceRoute.alias = alias
		}
	}

	// TODO: this is dumb
	if (currentRoute && currentRoute.source) {
		await Resource.query().update({
			routeId: null,
		}).where('routeId', currentRoute.source)
	}
	
	const resourceUrl = await route.set(resourceRoute)
	const newRoute = await RouteModel.query().where({ destination: url }).first()
	await Resource.query().update({
		routeId: newRoute.source,
	}).where('id', resourceId)

	if (currentRoute && currentRoute.deploymentId) {
		await removeDeployment(currentRoute.deploymentId)
	}

	await markActionComplete(routeActionId, { type, description: message, data: { resourceName, resourceUrl, url } })
	
	return {
		resourceUrl,
		resourceName,
	}
}

const removeLeadingSlash = (str) => {
	if (str[0] === '/') {
		return str.substring(1)
	}
	return str
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

	let config = {}
	let shouldDie = false

	let legacyInstaller = null
	let legacyPackage = null
	let hasConfig = false

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
									hasConfig = true
								})
								.catch(e => {
									logAction(parentActionId, { type: 'error', title: 'failed to parse .ultima.yml', data: { error: e } })
									shouldDie = 'failed to parse .ultima.yml'
									console.error('failed to parse .ultima.yml', e)
								})
						)
					}

					if (realPath === 'package.json') {
						legacyInstaller = 'npm install'
						promises.push(
							streamToBuf(entry)
								.then(buf => {
									return buf.toString('utf8')
								})
								.then(text => JSON.parse(text))
								.then(pkgJson => {
									legacyPackage = pkgJson
								})
								.catch(e => {
									logAction(parentActionId, { type: 'error', title: 'failed to parse package.json', data: { error: e } })
									shouldDie = 'failed to parse package.json'
									console.error('failed to parse package.json', e)
								})
						)
					}
					if (realPath === 'yarn.lock') {
						legacyInstaller = 'yarn'
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

		if (config.hasAPI) {
			delete config.hasAPI
		}

		if (!hasConfig || (!config.api && legacyPackage)) {
			config.api = {
				runtime: 'node',
				type: 'api',
				start: 'npm run start',
				install: {
					command: legacyInstaller == 'yarn' ? 'yarn --mutex file --frozen-lockfile' : 'npm install',
					watch: [
						legacyInstaller === 'yarn' ? 'yarn.lock' : 'package-lock.json',
					]
				},
				dev: {
					command: (legacyPackage && legacyPackage.scripts && legacyPackage.scripts.dev && 'npm run dev') || 'npm run start',
					watch: [
						'*.js',
					],
				},
			}
			if (legacyPackage && legacyPackage.scripts && legacyPackage.scripts.build) {
				config.api.build = 'npm run build'
			}
			if (legacyPackage && legacyPackage.scripts && legacyPackage.scripts.test) {
				config.api.test = 'npm run test'
			}
		}

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
				const schema = `${repository.full_name.split('/').join('-')}-${branch}`
				const schemaInfo = {
					username: `${repository.full_name.split('/').join('-')}-${branch}`,
					password: genPass(`${repository.full_name.split('/').join('-')}-${branch}`),
					schema,
				}

				await ensureSchema(schemaInfo)

				schemaEnv = getSchemaEnv(schemaInfo)
				if (!(await Resource.query().where('deploymentId', schema).where('repoName', repository.full_name).first())) {
					const resourceId = uuid()
					await Resource.query().insert({
						id: resourceId,
						type: 'postgres',
						repoName: repository.full_name,
						deploymentId: schema,
						name: 'database',
						stage: ref,
					})
				}
				await markActionComplete(dbActionId, { data: { schemaName: schemaInfo.schema } })
			} catch (e) {
				await markActionComplete(dbActionId, { type: 'error', data: { error: e } })
				throw e
			}
		}

		const codeTarUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.tar.gz`

		const resourceRoutes = await Promise.all(Object.keys(config).map(resourceName => {
			return buildResource({
				invocationId, config, resourceName, repository,user, schemaEnv, codeTarUrl, parentActionId, after, branch, repo
			}).then(({ resultingBundleLocation, builtBundleKey, codeTarUrl, resourceName }) => {
				if (config[resourceName].type === 'api') {
					return deployApiResource({ ref, codeTarUrl, invocationId, repository, config, resourceName, after, resultingBundleLocation, schemaEnv, branch, repo, user })
				} else {
					const staticContentLocation = codeTarUrl ? repoRelative(config[resourceName].directory || '', repoRelative(config[resourceName].buildLocation)) : repoRelative(config[resourceName].buildLocation)
					return deployWebResource({ ref, codeTarUrl, invocationId, repository, parentActionId, resourceName, after, builtBundleKey, staticContentLocation })
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

		await removeOrphans({
			repository,
			ref,
			resourceNames: Object.keys(config),
		})

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