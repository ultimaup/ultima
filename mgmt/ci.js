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

const s3 = require('./s3')
const Deployment = require('./db/Deployment')
const Action = require('./db/Action')
const route = require('./route')

const { giteaStream } = require('./gitea')

const {
	GITEA_URL,

	ENDPOINTS_ENDPOINT,
	S3_ENDPOINT,
	BUILDER_BUCKET_ID,
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

const ensureBuilderBundle = async lang => {
	const builderKey = `builders/${lang}.tar.gz`

	const existing = await s3.headObject({ Key: builderKey })

	if (!existing) {
		const { writeStream, promise } = s3.uploadStream({ Key: builderKey })
		const tarStream = tar.pack(path.resolve(__dirname, 'builders', lang))
		tarStream.pipe(createGzip()).pipe(writeStream)

		await promise
	}

	return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/${builderKey}`
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
	})
}

const logAction = async (parentId, { type, title, description, data }) => {
	const id = uuid()
	await Action.query().insert({
		id,
		parentId,
		type, title, description,
		metadata: data ? JSON.stringify(data) : data,
	})
	return id
}

const runTests = async ({ ref, after, repository, pusher, commits }) => {
	const commitMessage = commits.find(c => c.id === after)
	console.log(`gitea webhook triggered because ${pusher.login} pushed ${after} to ${ref} on ${repository.full_name}`)

	const branch = ref.split('refs/heads/')[1]
	const [user,repo] = repository.full_name.split('/')

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

	try {
		let config
		let shouldDie = false

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
					resolve()
				})
		})

		if (shouldDie) {
			throw new Error(shouldDie)
		}

		let hasAPI = true
		let staticContentLocation = undefined
		if (!config) {
			logAction(parentActionId, { type: 'info', title: 'no .ultima.yml found', description: 'assuming nodejs api app' })
		} else {
			if (config.web) {
				staticContentLocation = repoRelative(config.web.buildLocation)
				logAction(parentActionId, { type: 'debug', title: 'static website found', description: `will host resulting ${staticContentLocation} folder` })
			}
			if (config.hasAPI === false) {
				hasAPI = false
				logAction(parentActionId, { type: 'debug', title: 'not hosting an API', description: `hasAPI key found to be false` })
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
				bundleLocation: await ensureBuilderBundle(lang),
			})
			container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${builderEndpointId}/`).then(r => r.body))

			await markActionComplete(builderAlocation, { data: { builderEndpointId } })
		} catch (e) {
			await markActionComplete(builderAlocation, { type: 'error' })
			throw e
		}

		console.log(invocationId, `builder endpoint with id ${builderEndpointId} exists`)
		// pipe tarStream to builder endpoint, response is stream of result

		const buildActionId = await logAction(parentActionId, { type: 'info', title: 'building app', data: { logTag: builderEndpointId } })

		const builtBundleKey = `${repository.full_name.split('/').join('-')}/${after}.tar.gz`
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
		const resultingBundleLocation = await promise
		console.log(invocationId, `piped built result to ${builtBundleKey}`, resultingBundleLocation)

		await markActionComplete(buildActionId, { data: { logTag: builderEndpointId, resultingBundleLocation } })

		let staticUrl
		if (staticContentLocation) {
			const bucketName = after.substring(0,8)
			const actualBucketName = await s3.ensureWebBucket(bucketName)
			console.log('uploading', staticContentLocation, 'to', actualBucketName)
			const deployActionId = await logAction(parentActionId, { type: 'info', title: 'deploying static website' })

			// TODO: use stream from earlier instead of fetching from s3 again
			const builtBundleStream = s3.getStream({ Key: builtBundleKey })

			await new Promise((resolve, reject) => {
				builtBundleStream
					.pipe(gunzip())
					.pipe(tarStream.extract())
					.on('entry', (header, stream, next) => {
						const loc = header.name
						console.log('found', loc)
						if (loc === staticContentLocation || header.type !== 'file') {
							return next()
						}
						if (loc.startsWith(staticContentLocation)) {
							const realPath = loc.substring(staticContentLocation.length)
							const { writeStream, promise } = s3.uploadStream({
								Key: removeLeadingSlash(realPath),
								Bucket: actualBucketName,
								ContentType: mime.lookup(realPath) || 'application/octet-stream',
							})
							stream.pipe(writeStream)
							promise.then(() => {
								console.log('uploaded', realPath, 'to', actualBucketName)
								next()
							})
						} else {
							next()
						}
					})
					.on('error', reject)
					.on('finish', resolve)
			})

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
				bundleLocation: resultingBundleLocation,
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
			// add endpoint route
			const endpointRoute = {
				subdomain: `${branch}.${repo}.${user}`,
				destination: endpointUrl,
				deploymentId: resultingEndpointId,
			}
			endpointRouteUrl = await route.set(endpointRoute)
			await markActionComplete(routeActionId, { data: { endpointUrl, endpointRouteUrl } })
		}

		let staticRouteUrl
		if (staticUrl) {
			const routeActionId = await logAction(parentActionId, { type: 'debug', title: 'updating static route' })
			// add static route
			const staticRoute = {
				subdomain: `static.${branch}.${repo}.${user}`,
				destination: staticUrl,
				extensions: ['index.html'],
				deploymentId: `${repository.full_name.split('/').join('-')}-${after}`,
			}
			staticRouteUrl = await route.set(staticRoute)
			await markActionComplete(routeActionId, { data: { staticUrl, staticRouteUrl } })
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