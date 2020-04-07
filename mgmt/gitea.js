const { Router } = require('express')
const bodyParser = require('body-parser')
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

const { ensurePrismaService } = require('./prisma')
const s3 = require('./s3')
const Deployment = require('./db/Deployment')

const {
	GITEA_MACHINE_USER,
	GITEA_MACHINE_PASSWORD,

	GITEA_WEBHOOK_SECRET,
	GITEA_URL,

	ENDPOINTS_ENDPOINT,
	S3_ENDPOINT,
	BUILDER_BUCKET_ID,
} = process.env

const base64 = str => Buffer.from(str).toString('base64')

const giteaFetch = (url, asUser) => (
	got(url, {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Basic ${base64(`${GITEA_MACHINE_USER}:${GITEA_MACHINE_PASSWORD}`)}`,
			...(asUser ? {
				Sudo: asUser,
			} : {}),
		},
	})
)

const giteaStream = (url, asUser) => (
	got.stream(url, {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Basic ${base64(`${GITEA_MACHINE_USER}:${GITEA_MACHINE_PASSWORD}`)}`,
			...(asUser ? {
				Sudo: asUser,
			} : {}),
		},
	})
)

const giteaPost = (url, body, asUser) => (
	got.post(url, {
		body: body,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Basic ${base64(`${GITEA_MACHINE_USER}:${GITEA_MACHINE_PASSWORD}`)}`,
			...(asUser ? {
				Sudo: asUser,
			} : {}),
		},
	})
)

const giteaApiReq = (endpoint, { method, body }) => (
	giteaPost(`${GITEA_URL}${endpoint}`, JSON.stringify(body))
	.then(r => {
		if (r.status > 399) {
			throw new Error(`${r.status}`)
		}
	
		return r
	})
	.then(r => r.json())
)
 
const reportStatus = (fullName, hash, { targetUrl, context, description }, state) => {
	return giteaApiReq(`/api/v1/repos/${fullName}/statuses/${hash}`, {
		method: 'post',
		body: {
			target_url: targetUrl, 
			context,
			description,
			state,
		},
	})
}

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

// reportStatus('joshbalfour/blah', '8de47cdc6a8990511b9b49ff026b341068248976', {
// 	target_url: 'https://google3.com',
// 	context: 'this is different context 3',
// 	description: 'hello world 3!',
// }, 'success').then(console.log).catch(console.error)

const pipeline = promisify(stream.pipeline);

const ensureBuilderBundle = async lang => {
	const builderKey = `builders/${lang}.tar.gz`

	// const existing = await s3.headObject({ Key: builderKey })

	// if (!existing) {
		const { writeStream, promise } = s3.uploadStream({ Key: builderKey })
		const tarStream = tar.pack(path.resolve(__dirname, 'builders', lang))
		tarStream.pipe(createGzip()).pipe(writeStream)

		await promise
	// }

	return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/${builderKey}`
}

const runTests = async ({ ref, after, repository, pusher }) => {
	const invocationId = uuid()
	console.log(invocationId, `gitea webhook triggered because ${pusher.login} pushed ${after} to ${ref} on ${repository.full_name}`)

	const codeZipUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.zip`

	let hasAPI = true
	let staticContentLocation = false

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

				if (realPath === 'ultima.yml') {
					promises.push(
						streamToBuf(entry)
						.then(buf => {
							return buf.toString('utf8')
						})
						.then(text => yaml.safeLoad(text))
						.then(config => {
							console.log(config)
							if (config.web) {
								staticContentLocation = config.web.builtPath
							}
							if (config.hasAPI === false) {
								hasAPI = false
							}
						})
						.catch(e => {
							console.error('failed to parse ultima.yml', e)
						})
					)
				}

				if (realPath === 'schema.graphql') {
					console.log(invocationId, 'processing schema.graphql')
					reportStatus(repository.full_name, after, {
						targetUrl: 'https://google.com',
						context: 'Datastore',
						description: 'updating schema',
					}, 'pending')

					streamToBuf(entry).then(buf => {
						return buf.toString('utf8')
					}).then(schema => {
						return ensurePrismaService({
							id: repository.full_name.split('/').join('-'), 
							stage: ref.split('refs/heads/')[1], 
							schema, 
							dryRun: false,
						})
					}).then(() => {
						return reportStatus(repository.full_name, after, {
							targetUrl: 'https://google.com',
							context: 'Datastore',
							description: 'updating schema',
						}, 'success')
					}).catch(console.error)
					return
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

	const codeTarUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.tar.gz`

	const lang = 'nodejs'

	const builderEndpointId = `builder-${repository.full_name.split('/').join('-')}-${uuid()}`

	console.log(invocationId, `ensuring builder endpoint for lang ${lang} exists with id ${builderEndpointId}`)
	// ensure builder endpoint exists
	await Deployment.ensure({
		id: builderEndpointId,
		stage: 'builder',
		bundleLocation: await ensureBuilderBundle(lang),
	})
	console.log(invocationId, `builder endpoint with id ${builderEndpointId} exists`)
	// pipe tarStream to builder endpoint, response is stream of result

	const builtBundleKey = `${repository.full_name.split('/').join('-')}/${after}.tar.gz`
	const { writeStream, promise } = s3.uploadStream({ Key: builtBundleKey })

	let staticUrl
	if (staticContentLocation) {
		const bucketName = `${repository.full_name.split('/').join('-')}-${after}`
		console.log('uploading', staticContentLocation, 'to', bucketName)
		await s3.ensureWebBucket(bucketName)

		await new Promise((resolve, reject) => {
			let promises = []
			writeStream
				.pipe(tarStream.extract())
				.on('entry', (header, stream, next) => {
					const path = header.name
					console.log('found', path)
					if (path.startsWith(staticContentLocation)) {
						const realPath = path.split(staticContentLocation).join('')
						const { writeStream, promise } = s3.uploadStream({ Key: realPath, Bucket: bucketName })
						stream.pipe(writeStream)
						promises.push(promise)
					}
	
					next()
				})
				.on('error', reject)
				.on('finish', () => {
					Promise.all(promises).then(resolve)
				})
		})
	}

	await pipeline(
		giteaStream(codeTarUrl),
		got.stream.post(`${ENDPOINTS_ENDPOINT}/${builderEndpointId}/`, {
			headers: {
				// 'content-type': 'application/octet-stream',
				'x-parent-invocation-id': invocationId,
			},
		}),
		writeStream
	)
	
	console.log(invocationId, `piping built result to to ${builtBundleKey}`)
	const resultingBundleLocation = await promise
	console.log(invocationId, `piped built result to to ${builtBundleKey}`, resultingBundleLocation)

	let endpointUrl
	if (hasAPI) {
		const resultingEndpointId = `${repository.full_name.split('/').join('-')}-${after}`

		console.log(invocationId, `creating deployment ${resultingEndpointId} for ${resultingBundleLocation}`)
		await Deployment.ensure({
			id: resultingEndpointId,
			stage: ref,
			bundleLocation: resultingBundleLocation,
		})

		endpointUrl = `${ENDPOINTS_ENDPOINT}/${resultingEndpointId}/`
		console.log(invocationId, `created deployment ${resultingEndpointId} available on ${endpointUrl}, requesting...`)

		const firstRequest = await got(endpointUrl).then(r => r.body)
		console.log(invocationId, `${endpointUrl} responded`, firstRequest)

		if (firstRequest.status === 'error') {
			console.error(invocationId, endpointUrl, 'deployment failed', firstRequest.message)
			return {}
		}
	}

	console.log(invocationId, `complete`)

	return {
		endpointUrl,
		staticUrl,
	}
}

const router = new Router()

router.use(bodyParser.json())

router.post('/gitea-hook', (req, res) => {
	console.log('gitea webhook called')
	try {
		const { headers, body: { secret } } = req

		if (secret !== GITEA_WEBHOOK_SECRET) {
			console.error('gitea webhook rejected because of mismatched secret', secret)
			return res.json(false)
		}
		
		if (headers['x-gitea-event'] === 'push') {
			// do shit
			runTests(req.body)
				.then(console.log)
				.catch(console.error)
		}

		return res.json('ayy')
	} catch (e) {
		console.error(e)
	}

	return res.json('internal error')
})

module.exports = app => {
	app.use(router)

	const ref = 'refs/heads/master'
	const after = '4f0010e3d1b3597a3acaf9e0aed5415b76df13d0'
	const repository = 'test/basic-frontend'
	const pusher = 'test'

	runTests({ ref, after, repository: { full_name: repository }, pusher: { login: pusher } }).then(console.log).catch(console.error)
}
