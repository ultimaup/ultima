const { Router } = require('express')
const bodyParser = require('body-parser')
const tar = require('tar-fs')
const { createGzip } = require('zlib')
const uuid = require('uuid').v4
const path = require('path')
const got = require('got')
const fse = require('fs-extra')
const YAML = require('yaml')
const mime = require('mime')

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

const bucketProxies = {}

router.post('/dev-session/bucket-proxy/:bucketName/file', async (req, res) => {
    const eventType = req.headers['x-event-type']
    if (!eventType) {
        return res.json({})
    }
    if (!(eventType === 'add' || eventType === 'change')) {
        return res.json(true)
    }
    const { bucketName } = req.params
    if (!req.user) {
        return res.status(403).json(false)
    }
    if (!bucketName.startsWith(req.user.username)) {
        return res.status(403).json(false)
    }
    const config = bucketProxies[bucketName]
    if (!config) {
        return res.status(404).json(true)
    }

    const loc = req.headers['x-event-path']

    const { buildLocation } = config

    if (!loc.startsWith(buildLocation)) {
        return res.json(false)
    }

    if (loc.startsWith(buildLocation)) {
        const realPath = loc.substring(staticContentLocation.length)

        const { writeStream, promise } = s3.uploadStream({
            Key: removeLeadingSlash(realPath),
            Bucket: actualBucketName,
            ContentType: mime.lookup(realPath) || 'application/octet-stream',
        })

        req.pipe(writeStream)

        promise.then(() => {
            console.log('uploaded', realPath, 'to', actualBucketName)
            res.json(true)
        }).catch(e => {
            console.error('failed to upload', realPath, 'to', actualBucketName, e)
            res.status(500).json(e)
        })
    }
})

const repoRelative = (loc) => {
	return path.resolve('/', loc).substring(1)
}

const startDevSession = async ({ user, details: { ultimaCfg, repoName, owner } }) => {
    const invocationId = uuid()

    const envCfg = ultimaCfg ? YAML.parse(ultimaCfg) : {}

    const seed = uuid()

    const schemaId = `${user.username}-dev-${seed}`.toLowerCase()

    const schemaInfo = {
        username: schemaId,
        password: genPass(schemaId),
        schema: schemaId,
    }

    await ensureSchema(schemaInfo)

    const schemaEnv = getSchemaEnv(schemaInfo)

    const bundleLocation = await ensureDevelopmentBundle()

    const servers = await Promise.all(Object.entries(envCfg).map(async ([resourceName, { runtime = 'node', type = 'api', dev, buildLocation }]) => {
        const sid = `${resourceName}-${invocationId.split('-')[0]}-${user.username}`
        let staticContentUrl
        let bucketProxyUrl
        
        if (type === 'web' && buildLocation) {
            const bucketName = `${user.username}-dev-${seed.split('-')[0]}`
            const actualBucketName = await s3.ensureWebBucket(bucketName)
            const staticUrl = `${S3_ENDPOINT}/${actualBucketName}`

            staticContentUrl = await route.set({
                subdomain: `static-${sid}.dev`,
                destination: staticUrl,
                deploymentId: devEndpointId,
                extensions: ['index.html']
            })

            bucketProxies[bucketName] = {
                buildLocation: repoRelative(buildLocation),
            }
            bucketProxyUrl = `${PUBLIC_ROUTE_ROOT_PROTOCOL}://build.${PUBLIC_ROUTE_ROOT}:${PUBLIC_ROUTE_ROOT_PORT}/dev-session/bucket-proxy/${bucketName}`

            if (!dev || !dev.command) {
                // return to cli
                return {
                    url: bucketProxyUrl,
                    staticContentUrl,
                    type,
                }
            } else {
                // pass to deployment
            }
        }
        const devEndpointId = `${user.username}-dev-${seed}`.toLowerCase()
        console.log(invocationId, `ensuring dev endpoint for runtime ${runtime} exists with id ${devEndpointId}`)
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
                ULTIMA_RESOURCE_TYPE: type,
                ULTIMA_TOKEN: req.token,
                ULTIMA_BUCKET_PROXY_URL: bucketProxyUrl,
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
            url,
            debugUrl,
            appUrl,
            staticContentUrl,
            type,
        }
    }))

    return {
        id: devEndpointId,
        schemaId,
        servers,
    }
}

router.post('/dev-session', async (req, res) => {
    const session = await startDevSession({ user: req.user, details: req.body })
    res.json(session)
})

module.exports = app => {
	app.use(router)
}
