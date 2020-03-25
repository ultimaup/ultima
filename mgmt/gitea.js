const { Router } = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const unzip = require('unzip-stream')
const tar = require('tar-fs')
const path = require('path')
const uuid = require('uuid').v4
const { createGzip } = require('zlib')

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

const giteaFetch = (url, opts, asUser) => (
	fetch(url, {
		...opts,
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
	giteaFetch(`${GITEA_URL}${endpoint}`, {
		method,
		body: JSON.stringify(body),
	})
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
	const res = await giteaFetch(codeZipUrl)

	// handle "special" files special-y
	res.body.pipe(unzip.Parse())
		.on('entry', entry => {
			const { path, type } = entry
			// console.log('found', path)

			let realPath = path.split('/')
			realPath.shift()
			realPath = realPath.join('/')

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
		.on('error', console.error)

	const codeTarUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.tar.gz`
	const tarStream = await giteaFetch(codeTarUrl)

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
	const builtBundleStream = await fetch(`${ENDPOINTS_ENDPOINT}/${builderEndpointId}/`, {
		method: 'POST',
		body: tarStream.body,
		headers: {
			// 'content-type': 'application/octet-stream',
			'x-parent-invocation-id': invocationId,
		},
	})

	console.log(invocationId, `builder endpoint ${builderEndpointId} returned ${builtBundleStream.status}`)

	if (builtBundleStream.status > 200) {
		throw new Error('failed to start builder')
	}

	const builtBundleKey = `${repository.full_name.split('/').join('-')}/${after}.tar.gz`

	const { writeStream, promise } = s3.uploadStream({ Key: builtBundleKey })
	builtBundleStream.body.pipe(writeStream)
	
	console.log(invocationId, `piping built result to to ${builtBundleKey}`)
	const resultingBundleLocation = await promise
	console.log(invocationId, `piped built result to to ${builtBundleKey}`, resultingBundleLocation)

	const resultingEndpointId = `${repository.full_name.split('/').join('-')}-${after}`

	console.log(invocationId, `creating deployment ${resultingEndpointId} for ${resultingBundleLocation}`)
	await Deployment.ensure({
		id: resultingEndpointId,
		stage: ref,
		bundleLocation: resultingBundleLocation,
	})

	const endpointUrl = `${ENDPOINTS_ENDPOINT}/${resultingEndpointId}/`
	console.log(invocationId, `created deployment ${resultingEndpointId} available on ${endpointUrl}, requesting...`)

	const firstRequest = await fetch(endpointUrl).then(r => r.text())
	console.log(invocationId, `${endpointUrl} responded`, firstRequest)

	if (firstRequest.status === 'error') {
		console.error(invocationId, endpointUrl, 'deployment failed', firstRequest.message)
		return {}
	}

	console.log(invocationId, `complete`)

	return {
		endpointUrl,
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
	const after = '05a816f6ebdb30d82ad65963532c94a325a359e0'
	const repository = 'test/todo'
	const pusher = 'test'

	runTests({ ref, after, repository: { full_name: repository }, pusher: { login: pusher } }).then(console.log).catch(console.error)
}