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
const crypto = require('crypto')

const s3 = require('./s3')
const Deployment = require('./db/Deployment')
const Action = require('./db/Action')
const RouteModel = require('./db/Route')
const Resource = require('./db/Resource')
const route = require('./route')
const billing = require('./billing')

const { ensureSchema, getSchemaEnv, genPass } = require('./dbMgmt')
const feedbackDeploymentStatus = require('./feedbackDeploymentStatus')

const {
	ENDPOINTS_ENDPOINT,
	S3_ENDPOINT,
	BUILDER_BUCKET_ID,
	REGISTRY_CACHE_ENDPOINT,

	PUBLIC_ROUTE_ROOT_PROTOCOL,
	PUBLIC_ROUTE_ROOT,
	PUBLIC_ROUTE_ROOT_PORT,
	SALT,
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

	feedbackDeploymentStatus(id).catch(console.error)

	return id
}

const markActionComplete =  async (id, updates = {}) => {
	const u = updates
	if (u.data) {
		u.metadata = JSON.stringify(u.data)
		delete u.data
	}
	await Action.query().where('id', id).update({
		completedAt: new Date(),
		...updates,
	}).skipUndefined()

	feedbackDeploymentStatus(id).catch(console.error)
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

const buildResource = async ({ invocationId, config, resourceName, repository,user, schemaEnv, codeTarUrl, parentActionId, after, branch, repo }) => {
	const builderEndpointId = `${repository.full_name.split('/').join('-').split('.').join('-')}-builder-${resourceName}-${uuid()}`

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
		builtBundleKey = `${repository.full_name.split('/').join('-').split('.').join('-')}/${resourceName}/${after}.tar.gz`
		const { writeStream, promise } = s3.uploadStream({ Key: builtBundleKey })

		await pipeline(
			(await codeTarUrl()),
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
	} finally {
		await removeDeployment(builderEndpointId)
	}

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
	const builtBundleStream = builtBundleKey ? s3.getStream({ Key: builtBundleKey }) : (await codeTarUrl())

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
}) => `${resourceName}-${branch}-${repo}-${user}`.split('.').join('-').split('/').join('-')

const routesEnv = (config, { branch, repo, user }) => {
	const obj = {}
	Object.entries(config).filter(([resourceName, { type }]) => {
		return type !== 'bucket'
	}).map(([resourceName]) => {
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
	const resultingEndpointId = `${repository.full_name.split('/').join('-').split('.').join('-')}-${resourceName}-${after}`
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
	console.log(`deploying route for ${repo} ${resourceName}`)
	const routeActionId = await logAction(parentActionId, { type: 'debug', title: 'Putting resource live', data: { resourceName } })
	const subdomain = getSubdomain({ resourceName,
		branch,
		repo,
		user,
	})
	// get current route
	const [currentRoute] = await route.get(subdomain)

	console.log(resourceName, 'got current route', currentRoute)

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
	console.log(resourceName, 'alias', alias)

	if (alias) {
		if (await checkAliasUse({ alias, subdomain })) {
			type = 'warning'
			message = 'warning: unable to use custom domain as it\'s currently in use by another project.'
		} else {
			resourceRoute.alias = alias
		}
	}

	console.log(resourceName, 'alias checked', alias)

	// TODO: this is dumb
	if (currentRoute && currentRoute.source) {
		await Resource.query().update({
			routeId: null,
		}).where('routeId', currentRoute.source)
	}
	
	const resourceUrl = await route.set(resourceRoute)
	console.log(resourceName, 'resourceUrl set', resourceUrl)
	const newRoute = await RouteModel.query().where({ destination: url }).first()
	await Resource.query().update({
		routeId: newRoute.source,
	}).where('id', resourceId)

	console.log(resourceName, 'updated new route', newRoute)

	if (currentRoute && currentRoute.deploymentId) {
		console.log(resourceName, 'removing current deployment', currentRoute)
		await removeDeployment(currentRoute.deploymentId)
		console.log(resourceName, 'removed current deployment', currentRoute)
	}

	console.log(resourceName, 'marking action complete')
	await markActionComplete(routeActionId, { type, description: message, data: { resourceName, resourceUrl, url } })
	
	console.log(resourceName, 'marked action complete')
	return {
		resourceUrl,
		resourceName,
	}
}

const genBucketPass = seed => crypto.createHash('sha256').update(`${seed}-${SALT.split().reverse().join()}`).digest('hex')

const genBucketHash = (repoName, ref) => crypto.createHash('sha256').update([repoName, ref].join('/')).digest('hex').substring(0, 8)

const genBucketName = (resourceName, repository, ref) => `${repository.full_name.split('/')[1].split('.').join('-').substring(0,40)}-${genBucketHash(repository.full_name.split('/')[1].split('.').join('-'), ref)}-${resourceName}`

const deployBucketResource = async ({ owner, resourceName, ref, repository, parentActionId, invocationId }) => {
	const deployBucketActionId = parentActionId && (await logAction(parentActionId, { type: 'info', title: 'Allocating bucket', data: { resourceName } }))
	try {
		await s3.ensureFileUserExists(owner, genBucketPass(owner))
		// create bucket as user
		const actualBucketName = await s3.ensureFileBucket(genBucketName(resourceName, repository, ref), owner)
	
		let resourceId
		if (actualBucketName) {
			resourceId = uuid()
			await Resource.query().insert({
				id: resourceId,
				type: 'bucket',
				repoName: repository.full_name,
				deploymentId: actualBucketName,
				name: resourceName,
				stage: ref,
			})
			console.log(invocationId, `deployed ${actualBucketName}`)
			if (deployBucketActionId) {
				await markActionComplete(deployBucketActionId, { title: 'Allocating bucket succeeded', data: { resourceId, actualBucketName, resourceName } })
			}
		} else {
			console.error(invocationId, actualBucketName, 'bucket deployment failed')
			throw new Error('bucket deployment failed')
		}
	
		return {
			resourceName,
			resourceId,
			actualBucketName,
		}
	} catch (e) {
		console.error(invocationId, `allocating ${resourceName} bucket failed`, e)
		if (deployBucketActionId) {
			await markActionComplete(deployBucketActionId, { type: 'error', title: 'Allocating bucket failed', data: { error: e.message, resourceName } })
		}
	}
}

const genBucketEnv = (config, owner, repository, ref) => {
	const key = owner
	const secret = genBucketPass(owner)

	const bucketNames = Object.entries(config).filter(([resourceName, { type }]) => type === 'bucket').map(([resourceName]) => ({
		resourceName,
		actualBucketName: `${owner}-${genBucketName(resourceName, repository, ref)}`,
	}))

	const bucketEnv = {
		ULTIMA_BUCKET_ACCESS_KEY_ID: key,
		ULTIMA_BUCKET_ACCESS_KEY_SECRET: secret,
		ULTIMA_BUCKET_S3_SERVER: S3_ENDPOINT,
	}

	bucketNames.forEach(({ resourceName, actualBucketName }) => {
		bucketEnv[`${resourceName.toUpperCase()}_BUCKET_NAME`] = actualBucketName
	})

	return bucketEnv
}

const removeLeadingSlash = (str) => {
	if (str[0] === '/') {
		return str.substring(1)
	}
	return str
}

const runPipeline = async ({ ref, after, repository, pusher, commits, codeTarUrl, codeZipUrl }) => {
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
		feedbackDeploymentStatus,
	})

	const invocationId = parentActionId

	let config = {}
	let shouldDie = false

	try {
		try {
			await billing.repoPaidFor({ owner: user, repo })
		} catch (e) {
			const message = 'Billing issue - please verify your subscription allows you to deploy this repository.'
			await logAction(parentActionId, { type: 'error', title: message })
			throw message
		}
		await new Promise(async (resolve, reject) => {
			let promises = []
			const zipStream = await codeZipUrl()
			// handle "special" files special-y
			zipStream
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

		if (config.hasAPI) {
			delete config.hasAPI
		}

		if (shouldDie) {
			throw new Error(shouldDie)
		}

		const hasAPI = !config || Object.values(config).some(cfg => cfg.type === 'api')
		if (!config) {
			logAction(parentActionId, { type: 'info', title: 'no .ultima.yml found', description: 'assuming nodejs api app', completedAt: true })
		} else {
			const plural = Object.keys(config).length > 1
			logAction(parentActionId, { type: 'debug', title: `Found ${Object.keys(config).length} ${plural ? 'resources': 'resource'} to deploy`, completedAt: true })
		}

		if (hasAPI) {
			const dbActionId = await logAction(parentActionId, { type: 'info', title: 'allocating schema' })

			try {
				const schema = `${repository.full_name.split('/').join('-').split('.').join('-')}-${branch}`
				const schemaInfo = {
					username: `${repository.full_name.split('/').join('-').split('.').join('-')}-${branch}`,
					password: genPass(`${repository.full_name.split('/').join('-').split('.').join('-')}-${branch}`),
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

		if (Object.values(config).some(({ type }) => type === 'bucket')) {
			schemaEnv = {
				...schemaEnv,
				...genBucketEnv(config, user, repository, ref)
			}
		}

		await Promise.all(
			Object.entries(config)
				.filter(([resourceName, { type }]) => type === 'bucket')
				.map(([resourceName]) => {
					return deployBucketResource({
						owner: user,
						resourceName,
						repository,
						parentActionId,
						invocationId,
						ref,
					})
				})
		)

		const resourceRoutes = await Promise.all(
			Object.entries(config)
				.filter(([resourceName, { type }]) => type !== 'bucket')
				.map(([resourceName]) => {
					return buildResource({
						invocationId, config, resourceName, repository,user, schemaEnv, codeTarUrl, parentActionId, after, branch, repo
					}).then(({ resultingBundleLocation, builtBundleKey, codeTarUrl, resourceName }) => {
						if (config[resourceName].type === 'api') {
							return deployApiResource({ ref, codeTarUrl, invocationId, repository, parentActionId, config, resourceName, after, resultingBundleLocation, schemaEnv, branch, repo, user })
						} else {
							const staticContentLocation = codeTarUrl ? repoRelative(config[resourceName].directory || '', repoRelative(config[resourceName].buildLocation)) : repoRelative(config[resourceName].buildLocation)
							return deployWebResource({ ref, codeTarUrl, invocationId, repository, parentActionId, resourceName, after, builtBundleKey, staticContentLocation })
						}
					})
				})
		)

		console.log('resourceRoutes', JSON.stringify(resourceRoutes, null, '\t'))

		const liveResourceRoutes = await Promise.all(
			resourceRoutes
				.map(route => deployRoute({ ...route, config, parentActionId ,branch, repo, user })
			)
		)

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
	runPipeline,
	genBucketEnv,
	genBucketPass,
	deployBucketResource,
}
