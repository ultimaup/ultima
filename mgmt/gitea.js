const { Router } = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const unzip = require('unzip-stream')

const { ensurePrismaService } = require('./prisma')

const {
	GITEA_MACHINE_USER,
	GITEA_MACHINE_PASSWORD,

	GITEA_WEBHOOK_SECRET,
	GITEA_URL,
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

const runTests = async ({ ref, after, repository, pusher }) => {
	console.log(`gitea webhook triggered because ${pusher.login} pushed ${after} to ${ref} on ${repository.full_name}`)

	const codeZipUrl = `${GITEA_URL}/${repository.full_name}/archive/${after}.zip`
	const res = await giteaFetch(codeZipUrl)

	// handle "special" files special-y
	res.body.pipe(unzip.Parse())
		.on('entry', entry => {
			const { path, type } = entry
			console.log('found', path)

			let realPath = path.split('/')
			realPath.shift()
			realPath = realPath.join('/')

			if (realPath === 'schema.graphql') {
				console.log('processing schema.graphql')
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
}