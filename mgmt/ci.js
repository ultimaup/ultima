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

const runTests = async ({ ref, after, repository, pusher }) => {
	const invocationId = uuid()
	console.log(invocationId, `gitea webhook triggered because ${pusher.login} pushed ${after} to ${ref} on ${repository.full_name}`)

	const codeZipUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.zip`

	let hasAPI = true
	let staticContentLocation = undefined

	await new Promise((resolve, reject) => {
		let promises = []
		// handle "special" files special-y
		giteaStream(codeZipUrl)
			.pipe(unzip.Parse())
			.on('entry', entry => {
				const { path, type } = entry
				// console.log('found', path)

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
						.then(config => {
							console.log(config)
							if (config.web) {
								staticContentLocation = repoRelative(config.web.buildLocation)
							}
							if (config.hasAPI === false) {
								hasAPI = false
							}
						})
						.catch(e => {
							console.error('failed to parse .ultima.yml', e)
						})
					)
				}

				// if (realPath === 'schema.graphql') {
				// 	console.log(invocationId, 'processing schema.graphql')
				// 	reportStatus(repository.full_name, after, {
				// 		targetUrl: 'https://google.com',
				// 		context: 'Datastore',
				// 		description: 'updating schema',
				// 	}, 'pending')

				// 	streamToBuf(entry).then(buf => {
				// 		return buf.toString('utf8')
				// 	}).then(schema => {
				// 		return ensurePrismaService({
				// 			id: repository.full_name.split('/').join('-'), 
				// 			stage: ref.split('refs/heads/')[1],
				// 			schema, 
				// 			dryRun: false,
				// 		})
				// 	}).then(() => {
				// 		return reportStatus(repository.full_name, after, {
				// 			targetUrl: 'https://google.com',
				// 			context: 'Datastore',
				// 			description: 'updating schema',
				// 		}, 'success')
				// 	}).catch(console.error)
				// 	return
				// }

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

	const codeTarUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.tar.gz`

	const lang = 'nodejs'

	const builderEndpointId = `${repository.full_name.split('/').join('-')}-builder-${uuid()}`

	console.log(invocationId, `ensuring builder endpoint for lang ${lang} exists with id ${builderEndpointId}`)
	// ensure builder endpoint exists
	await Deployment.ensure({
		id: builderEndpointId,
		stage: 'builder',
		bundleLocation: await ensureBuilderBundle(lang),
	})
	const container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${builderEndpointId}/`).then(r => r.body))
	console.log(invocationId, `builder endpoint with id ${builderEndpointId} exists`)
	// pipe tarStream to builder endpoint, response is stream of result

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

	let staticUrl
	if (staticContentLocation) {
		const bucketName = after.substring(0,8)
		const actualBucketName = await s3.ensureWebBucket(bucketName)
		console.log('uploading', staticContentLocation, 'to', actualBucketName)

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

		staticUrl = `${S3_ENDPOINT}/${actualBucketName}`
	}

	let endpointUrl
	let resultingEndpointId
	if (hasAPI) {
		resultingEndpointId = `${repository.full_name.split('/').join('-')}-${after}`

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
			console.error(e)
		}

		if (endpointUrl) {
			console.log(invocationId, `created deployment ${resultingEndpointId} available on ${endpointUrl}, requesting...`)
			console.log(invocationId, `deployed to`, endpointUrl)
		} else {
			console.error(invocationId, endpointUrl, 'deployment failed')
			return {}
		}
	}

	const branch = ref.split('refs/heads/')[1]
	const [user,repo] = repository.full_name.split('/')

	let endpointRouteUrl
	if (endpointUrl) {
		// add endpoint route
		const endpointRoute = {
			subdomain: `${branch}.${repo}.${user}`,
			destination: endpointUrl,
			deploymentId: resultingEndpointId,
		}
		endpointRouteUrl = await route.set(endpointRoute)
	}

	let staticRouteUrl
	if (staticUrl) {
		// add static route
		const staticRoute = {
			subdomain: `static.${branch}.${repo}.${user}`,
			destination: staticUrl,
			extensions: ['index.html'],
			deploymentId: `${repository.full_name.split('/').join('-')}-${after}`,
		}
		staticRouteUrl = await route.set(staticRoute)
	}

	console.log(invocationId, `complete`)

	return {
		endpointUrl,
		endpointRouteUrl,

		staticUrl,
		staticRouteUrl,

		repoName: repository.full_name,
		branch,
	}
}

module.exports = {
    runTests,
}