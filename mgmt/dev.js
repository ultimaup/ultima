const { Router } = require('express')
const bodyParser = require('body-parser')
const tar = require('tar-fs')
const { createGzip } = require('zlib')
const uuid = require('uuid').v4
const path = require('path')
const got = require('got')
const fse = require('fs-extra')

const Deployment = require('./db/Deployment')
const s3 = require('./s3')
const route = require('./route')
const { headersToUser, sign } = require('./jwt')
const { ensureSchema, getSchemaEnv, genPass } = require('./dbMgmt')

const {
	S3_ENDPOINT,
    BUILDER_BUCKET_ID,
    ENDPOINTS_ENDPOINT,
	INTERNAL_MGMT_ENDPOINT,
} = process.env

const router = new Router()

router.use(bodyParser.json())

const ensureDevelopmentBundle = async lang => {
	const builderPath = path.resolve(__dirname, 'development', lang)
	const builderPkg = await fse.readJSON(path.resolve(builderPath, 'package.json'))
	const key = `development/${lang}-${builderPkg.version}.tar.gz`

	const existing = await s3.headObject({ Key: key })

	if (!existing) {
		const { writeStream, promise } = s3.uploadStream({ Key: key })
		const tarStream = tar.pack(builderPath)
		tarStream.pipe(createGzip()).pipe(writeStream)

		await promise
	}

	return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/${key}`
}


router.use('/dev-session', async (req, res, next) => {
    try {
        req.user = await headersToUser(req)
        next()
    } catch (e) {
        res.status(403).json({
            status: 'error',
            message: 'unauthorized',
        })
    }
})

const startDevSession = async ({ user, details: { repoName, owner } }) => {
    const invocationId = uuid()
    const lang = 'nodejs'

    const devEndpointId = `${user.username}-dev-${uuid()}`.toLowerCase()
    console.log(invocationId, `ensuring dev endpoint for lang ${lang} exists with id ${devEndpointId}`)

    const schemaInfo = {
        username: devEndpointId,
        password: genPass(devEndpointId),
        schema: devEndpointId,
    }

    await ensureSchema(schemaInfo)

    const schemaEnv = getSchemaEnv(schemaInfo)

	// ensure dev endpoint exists
	await Deployment.ensure({
		id: devEndpointId,
		stage: 'development',
        bundleLocation: await ensureDevelopmentBundle(lang),
        ports: ['CHILD_DEBUG_PORT', 'CHILD_PORT'],
        env: {
            ...schemaEnv,
            ULTIMA_CACHE_TOKEN: await sign({ actorType: 'development', user: owner, repo: repoName, deploymentId: devEndpointId }, { expiresIn: '1 week' }),
            ULTIMA_CACHE_ENDPOINT: INTERNAL_MGMT_ENDPOINT,
        },
        repoName: `${owner}/${repoName}`,
    })

    console.log(invocationId, `dev endpoint with id ${devEndpointId} exists`)

    const container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${devEndpointId}/`).then(r => r.body))
    const endpointUrl = container.hostname
    console.log(invocationId, 'got internal url', endpointUrl)
    const internalUrl = endpointUrl.split('http://').join('h2c://')

    const sid = `${invocationId.split('-')[0]}-${user.username}`

    const endpointRoute = {
        subdomain: `dev-${sid}.dev`,
        destination: internalUrl,
        deploymentId: devEndpointId,
    }

    const url = await route.set(endpointRoute)

    const debugUrl = await route.set({
        subdomain: `debug-${sid}.dev`,
        destination: container.ports.find(({ name }) => name === 'CHILD_DEBUG_PORT').url,
        deploymentId: devEndpointId,
    })

    const appUrl = await route.set({
        subdomain: `app-${sid}.dev`,
        destination: container.ports.find(({ name }) => name === 'CHILD_PORT').url,
        deploymentId: devEndpointId,
    })

    return {
        id: devEndpointId,
        url,
        debugUrl,
        appUrl,
    }
}

router.post('/dev-session', async (req, res) => {
    const session = await startDevSession({ user: req.user, details: req.body })
    res.json(session)
})

module.exports = app => {
	app.use(router)
}
