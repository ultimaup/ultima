const { Router } = require('express')
const bodyParser = require('body-parser')
const tar = require('tar-fs')
const { createGzip } = require('zlib')
const uuid = require('uuid').v4
const path = require('path')
const got = require('got')

const Deployment = require('./db/Deployment')
const s3 = require('./s3')
const route = require('./route')
const { headersToUser } = require('./jwt')

const {
	S3_ENDPOINT,
    BUILDER_BUCKET_ID,
    ENDPOINTS_ENDPOINT,
} = process.env

const router = new Router()

router.use(bodyParser.json())

const ensureDevelopmentBundle = async lang => {
	const key = `development/${lang}.tar.gz`

	const existing = await s3.headObject({ Key: key })

	if (!existing) {
		const { writeStream, promise } = s3.uploadStream({ Key: key })
		const tarStream = tar.pack(path.resolve(__dirname, 'development', lang))
		tarStream.pipe(createGzip()).pipe(writeStream)

		await promise
	}

	return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/${key}`
}


router.use('/dev-session', async (req, res, next) => {
    try {
        req.user = headersToUser(req)
        next()
    } catch (e) {
        res.status(403).json({
            status: 'error',
            message: 'unauthorized',
        })
    }
})

router.post('/dev-session', async (req, res) => {
    const invocationId = uuid()
    const lang = 'nodejs'

    const user = req.user.username

    const devEndpointId = `dev-${user}-${uuid()}`
    console.log(invocationId, `ensuring dev endpoint for lang ${lang} exists with id ${devEndpointId}`)

	// ensure dev endpoint exists
	await Deployment.ensure({
		id: devEndpointId,
		stage: 'development',
        bundleLocation: await ensureDevelopmentBundle(lang),
        ports: ['CHILD_DEBUG_PORT', 'CHILD_PORT'],
    })

    console.log(invocationId, `dev endpoint with id ${devEndpointId} exists`)

    const container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${devEndpointId}/`).then(r => r.body))
    const endpointUrl = container.hostname
    console.log(invocationId, 'got internal url', endpointUrl)
    const internalUrl = endpointUrl.split('http://').join('h2c://')

    const sid = `${invocationId.split('-')[0]}-${user}`

    const endpointRoute = {
        subdomain: `${sid}.dev`,
        destination: internalUrl,
    }

    const url = await route.set(endpointRoute)

    const debugUrl = await route.set({
        subdomain: `debug.${sid}.dev`,
        destination: container.ports.find(({ name }) => name === 'CHILD_DEBUG_PORT').url,
    })

    const appUrl = await route.set({
        subdomain: `app.${sid}.dev`,
        destination: container.ports.find(({ name }) => name === 'CHILD_PORT').url,
    })

    res.json({
        url,
        debugUrl,
        appUrl,
    })
})

module.exports = app => {
	app.use(router)
}