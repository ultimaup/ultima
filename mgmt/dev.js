const { Router } = require('express')
const bodyParser = require('body-parser')
const tar = require('tar-fs')
const { createGzip } = require('zlib')
const uuid = require('uuid').v4
const path = require('path')
const got = require('got')
const fse = require('fs-extra')
const YAML = require('yaml')

const Deployment = require('./db/Deployment')
const s3 = require('./s3')
const route = require('./route')
const { headersToUser } = require('./jwt')
const { ensureSchema, getSchemaEnv, genPass } = require('./dbMgmt')

const {
	S3_ENDPOINT,
    BUILDER_BUCKET_ID,
    ENDPOINTS_ENDPOINT,
    REGISTRY_CACHE_ENDPOINT,
} = process.env

const router = new Router()

router.use(bodyParser.json())

const ensureDevelopmentBundle = async () => {
    let githash = 'dev'

    if (await fse.exists('.githash')) {
        githash = await fse.readFile('.githash')
        return `${S3_ENDPOINT}/${BUILDER_BUCKET_ID}/development/dev-agent-${githash}.tar.gz`
    }

    const Key = `development/dev-agent-${githash}.tar.gz`
    const builderPath = path.resolve(__dirname, 'dev-agent')
    const { writeStream, promise } = s3.uploadStream({ Key })
    const tarStream = tar.pack(builderPath)
    tarStream.pipe(createGzip()).pipe(writeStream)

    return await promise
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

const startDevSession = async ({ user, details: { ultimaCfg, repoName, owner, resourceName = 'api' } }) => {
    const invocationId = uuid()

    const envCfg = ultimaCfg ? YAML.parse(ultimaCfg) : {}

    let runtime = 'node'

    if (envCfg[resourceName] && envCfg[resourceName].runtime) {
        runtime = envCfg[resourceName].runtime
    }

    const devEndpointId = `${user.username}-dev-${uuid()}`.toLowerCase()
    console.log(invocationId, `ensuring dev endpoint for runtime ${runtime} exists with id ${devEndpointId}`)

    const schemaInfo = {
        username: devEndpointId,
        password: genPass(devEndpointId),
        schema: devEndpointId,
    }

    await ensureSchema(schemaInfo)

    const schemaEnv = getSchemaEnv(schemaInfo)

    const bundleLocation = await ensureDevelopmentBundle()

	// ensure dev endpoint exists
	await Deployment.ensure({
		id: devEndpointId,
		stage: 'development',
        bundleLocation,
        ports: ['CHILD_DEBUG_PORT', 'CHILD_PORT'],
        runtime,
        command: `./dev-agent-bin`,
        env: {
            ...schemaEnv,
            ULTIMA_RESOURCE_NAME: resourceName,
            npm_config_registry: REGISTRY_CACHE_ENDPOINT,
            yarn_config_registry: REGISTRY_CACHE_ENDPOINT,
        },
        repoName: `${owner}/${repoName}`,
    })

    console.log(invocationId, `dev endpoint with id ${devEndpointId} exists`)

    const container = JSON.parse(await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${devEndpointId}/`).then(r => r.body))
    const endpointUrl = container.hostname
    console.log(invocationId, 'got internal url', endpointUrl)
    const internalUrl = endpointUrl.split('http://').join('h2c://')

    const sid = `${resourceName}-${invocationId.split('-')[0]}-${user.username}`

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
        subdomain: `${sid}.dev`,
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
