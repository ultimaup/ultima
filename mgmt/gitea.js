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
const gunzip = require('gunzip-maybe')
const mime = require('mime-types')
const {CookieJar} = require('tough-cookie')

const { ensurePrismaService } = require('./prisma')
const s3 = require('./s3')
const Deployment = require('./db/Deployment')
const route = require('./route')

const {
	GITEA_MACHINE_USER,
	GITEA_MACHINE_PASSWORD,

	GITEA_WEBHOOK_SECRET,
	GITEA_URL,
	GITEA_COOKIE_NAME,

	ENDPOINTS_ENDPOINT,
	S3_ENDPOINT,
	BUILDER_BUCKET_ID,
} = process.env

const base64 = str => Buffer.from(str).toString('base64')

const giteaFetch = (endpoint, opts, asUser) => {
	const conf = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Basic ${base64(`${GITEA_MACHINE_USER}:${GITEA_MACHINE_PASSWORD}`)}`,
			...(asUser ? {
				Sudo: asUser,
			} : {}),
			...(opts.headers || {}),
		},
		...opts,
	}

	return got(`${GITEA_URL}${endpoint}`, conf)
}

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


const ensureGiteaUserExists = async ({ id, username, imageUrl, name, email }) => {
    try {
        await giteaFetch('/api/v1/user', {}, username)
        return true
    } catch (e) {
        if (!e.message.includes('404')) {
            throw e
        }
    }

    // register
    await giteaFetch('/api/v1/admin/users', {
        method: 'post',
        body: JSON.stringify({
            email,
            "full_name": name,
            "login_name": username,
            username,
            avatar_url: imageUrl,
            "must_change_password": false,
            "password": id,
            "send_notify": false,
            "source_id": 0,
        })
    })

    await giteaFetch('/api/v1/user', {}, username)
}

const getGiteaSession = async (username, password) => {
    const cookieJar = new CookieJar()

    await giteaFetch('/user/login', { cookieJar, headers: { Authorization: undefined } })

    const _csrf = cookieJar.toJSON().cookies.find(({ key }) => key === '_csrf').value
    const sessionId = cookieJar.toJSON().cookies.find(({ key }) => key === GITEA_COOKIE_NAME).value

    const loggedIn = await got.post(`${GITEA_URL}/user/login`, {
        cookieJar,
        form: {
            "user_name": username,
            password,
            _csrf,
        },
        followRedirect: false,
    })

    if (loggedIn.statusCode < 300) {
        return sessionId
    } else {
        return null
    }
}


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
	if (hasAPI) {
		const resultingEndpointId = `${repository.full_name.split('/').join('-')}-${after}`

		console.log(invocationId, `creating deployment ${resultingEndpointId} for ${resultingBundleLocation}`)
		await Deployment.ensure({
			id: resultingEndpointId,
			repoName: repository.full_name,
			stage: ref,
			bundleLocation: resultingBundleLocation,
		})

		const container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${resultingEndpointId}/`).then(r => r.body))
		endpointUrl = container.hostname
		console.log(invocationId, `created deployment ${resultingEndpointId} available on ${endpointUrl}, requesting...`)
		console.log(invocationId, `deployed to`, endpointUrl)

		if (!endpointUrl) {
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


module.exports = {
	router: app => {
		app.use(router)
	
		const ref = 'refs/heads/master'
		const after = '9f2e98b3dceee8fa6ebe05343e0c9891c3567251'
		const repository = 'josh/todo-frontend'
		const pusher = 'josh'
	
		// runTests({ ref, after, repository: { full_name: repository }, pusher: { login: pusher } }).then(console.log).catch(console.error)
	},
	ensureGiteaUserExists,
	getGiteaSession,
}
