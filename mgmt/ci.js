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
    }

	return `${S3_ENDPOINT}/build-artifacts/build-agent/build-${githash}.tar.gz`
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

		let hasAPI = true
		let staticContentLocation = undefined
		if (!config) {
			logAction(parentActionId, { type: 'info', title: 'no .ultima.yml found', description: 'assuming nodejs api app', completedAt: true })
		} else {
			if (config.web) {
				staticContentLocation = repoRelative(config.web.buildLocation)
				logAction(parentActionId, { type: 'debug', title: 'static website found', description: `will host resulting ${staticContentLocation} folder`, completedAt: true })
			}
			if (config.hasAPI === false) {
				hasAPI = false
				logAction(parentActionId, { type: 'debug', title: 'not hosting an API', description: `hasAPI key found to be false`, completedAt: true })
			}
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

		const lang = 'nodejs'

		const builderEndpointId = `${repository.full_name.split('/').join('-')}-builder-${uuid()}`

		const builderAlocation = await logAction(parentActionId, { type: 'debug', title: 'allocating builder' })

		console.log(invocationId, `ensuring builder endpoint for lang ${lang} exists with id ${builderEndpointId}`)

		let container
		try {
			// ensure builder endpoint exists
			await Deployment.ensure({
				id: builderEndpointId,
				stage: 'builder',
				repoName: repository.full_name,
				owner: user,
				bundleLocation: await ensureBuilderBundle(lang),
				runtime: (config.api && config.api.runtime) || 'node',
				env: {
					CI: true,
					npm_config_registry: REGISTRY_CACHE_ENDPOINT,
					yarn_config_registry: REGISTRY_CACHE_ENDPOINT,
					...schemaEnv,
				},
			})
			container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${builderEndpointId}/`).then(r => r.body))

			await markActionComplete(builderAlocation, { data: { builderEndpointId } })
		} catch (e) {
			await markActionComplete(builderAlocation, { type: 'error' })
			throw e
		}

		console.log(invocationId, `builder endpoint with id ${builderEndpointId} exists`)
		// pipe tarStream to builder endpoint, response is stream of result
		let resultingBundleLocation
		let builtBundleKey
		const buildActionId = await logAction(parentActionId, { type: 'info', title: 'building app', data: { logTag: builderEndpointId } })
		try {
			builtBundleKey = `${repository.full_name.split('/').join('-')}/${after}.tar.gz`
			const { writeStream, promise } = s3.uploadStream({ Key: builtBundleKey })

			await pipeline(
				giteaStream(codeTarUrl),
				got.stream.post(container.hostname, {
					headers: {
						// 'content-type': 'application/octet-stream',
						'x-parent-invocation-id': invocationId,
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

		await markActionComplete(buildActionId, { data: { logTag: builderEndpointId, resultingBundleLocation } })

		let staticUrl
		if (staticContentLocation) {
			const bucketName = after.substring(0,8)
			const actualBucketName = await s3.ensureWebBucket(bucketName)
			console.log('uploading', staticContentLocation, 'to', actualBucketName)
			const deployActionId = await logAction(parentActionId, { type: 'info', title: 'deploying static website' })

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

			await markActionComplete(deployActionId, { data: { staticUrl } })

			staticUrl = `${S3_ENDPOINT}/${actualBucketName}`
		}

		let endpointUrl
		let resultingEndpointId
		if (hasAPI) {
			resultingEndpointId = `${repository.full_name.split('/').join('-')}-${after}`

			const deployActionId = await logAction(parentActionId, { type: 'info', title: 'deploying api' })

			console.log(invocationId, `creating deployment ${resultingEndpointId} for ${resultingBundleLocation}`)
			await Deployment.ensure({
				id: resultingEndpointId,
				repoName: repository.full_name,
				hash: after,
				stage: ref,
				command: config.api.start,
				bundleLocation: resultingBundleLocation,
				env: schemaEnv,
				runtime: (config.api && config.api.runtime) || 'node',
			})
			
			try {
				const container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${resultingEndpointId}/`).then(r => r.body))
				endpointUrl = container.hostname
			} catch (e) {
				await markActionComplete(deployActionId, { type: 'error', title: 'deployment failed', data: { error: e } })
				throw e
			}

			if (endpointUrl) {
				console.log(invocationId, `deployed ${resultingEndpointId} to`, endpointUrl)
				await markActionComplete(deployActionId, { title: 'deployment succeeded', data: { endpointUrl } })
			} else {
				console.error(invocationId, endpointUrl, 'deployment failed')
				return {}
			}
		}

		let endpointRouteUrl
		if (endpointUrl) {
			const routeActionId = await logAction(parentActionId, { type: 'debug', title: 'updating endpoint route' })
			const subdomain = `${branch}-${repo}-${user}`
			// get current route
			const [currentRoute] = await route.get(subdomain)

			// add endpoint route
			const endpointRoute = {
				subdomain,
				destination: endpointUrl,
				deploymentId: resultingEndpointId,
			}

			if (currentRoute) {
				await removeDeployment(currentRoute.deploymentId)
			}
			
			let message
			let type
			if (config && config.api && config.api['branch-domains']) {
				const alias = config.api['branch-domains'][branch]
				if (alias) {
					if (await checkAliasUse({ alias, subdomain })) {
						type = 'warning'
						message = 'warning: unable to use custom domain as it\'s currently in use by another project.'
					} else {
						endpointRoute.alias = alias
					}
				}
			}

			endpointRouteUrl = await route.set(endpointRoute)
			await markActionComplete(routeActionId, { type, description: message, data: { endpointUrl, endpointRouteUrl } })
		}

		let staticRouteUrl
		if (staticUrl) {
			const routeActionId = await logAction(parentActionId, { type: 'debug', title: 'updating static route' })
			// add static route
			const subdomain = `static-${branch}-${repo}-${user}`
			const [currentRoute] = await route.get(subdomain)
			const staticRoute = {
				subdomain,
				destination: staticUrl,
				extensions: ['index.html'],
				deploymentId: `${repository.full_name.split('/').join('-')}-${after}`,
			}
			if (currentRoute) {
				await removeDeployment(currentRoute.deploymentId)
			}

			let message
			let type
			if (config && config.web && config.web['branch-domains']) {
				const alias = config.web['branch-domains'][branch]
				if (alias) {
					if (await checkAliasUse({ alias, subdomain })) {
						type = 'warning'
						message = 'warning: unable to use custom domain as it\'s currently in use by another project.'
					} else {
						staticRoute.alias = alias
					}
				}
			}

			staticRouteUrl = await route.set(staticRoute)
			await markActionComplete(routeActionId, { type, description: message, data: { staticUrl, staticRouteUrl } })
		}

		await markActionComplete(parentActionId, {
			data: {
				...actionData,
				endpointUrl,
				endpointRouteUrl,

				staticUrl,
				staticRouteUrl,
			},
		})

		console.log(invocationId, `complete`)

		return {
			endpointUrl,
			endpointRouteUrl,

			staticUrl,
			staticRouteUrl,

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