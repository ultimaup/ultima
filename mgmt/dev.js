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
    PUBLIC_ROUTE_ROOT_PROTOCOL,
    PUBLIC_ROUTE_ROOT,
    PUBLIC_ROUTE_ROOT_PORT,
    INTERNAL_MGMT_ENDPOINT,
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


const removeLeadingSlash = (str) => {
	if (str[0] === '/') {
		return str.substring(1)
	}
	return str
}

const bucketProxies = {}

router.post('/dev-session/bucket-proxy/:bucketName/:op', async (req, res) => {
    // console.log(req.path)
    const eventType = req.headers['x-event-type']
    if (!eventType) {
        return res.json({})
    }
    if (!(eventType === 'add' || eventType === 'change')) {
        return res.json(true)
    }
    const { bucketName, op } = req.params
    if (op !== 'file') {
        return res.json(true)
    }
    if (!req.user) {
        return res.status(403).json(false)
    }
    if (!bucketName.startsWith(`${BUILDER_BUCKET_ID}-${req.user.username}`)) {
        return res.status(403).json(false)
    }
    const config = bucketProxies[bucketName]
    if (!config) {
        return res.status(404).json(true)
    }

    const loc = req.headers['x-event-path']

    const { buildLocation, directory } = config

    const buildLoc = repoRelative(directory, buildLocation)

    if (!loc.startsWith(buildLoc)) {
        return res.json(false)
    }

    if (loc.startsWith(buildLoc)) {
        const realPath = loc.substring(buildLoc.length)

        const { writeStream, promise } = s3.uploadStream({
            Key: removeLeadingSlash(realPath),
            Bucket: bucketName,
            ContentType: mime.lookup(realPath) || 'application/octet-stream',
        })

        req.pipe(writeStream)

        promise.then(() => {
            console.log('uploaded', realPath, 'to', bucketName)
            res.json(true)
        }).catch(e => {
            console.error('failed to upload', realPath, 'to', bucketName, e)
            res.status(500).json(e)
        })
    }
})

const repoRelative = (...loc) => {
	return path.resolve('/', ...loc).substring(1)
}

const startDevSession = async ({ token, user, details: { ultimaCfg, repoName, owner } }) => {
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
    
    const renv = {}
    Object.entries(envCfg).map(([resourceName, { type, dev, buildLocation }]) => {
        const sid = `${resourceName}-${invocationId.split('-')[0]}-${user.username}`
        let subdomain
        if (type === 'web' && buildLocation && (!dev || !dev.command)) {
            subdomain = `static-${sid}.dev`
        } else {
            subdomain = `${sid}.dev`
        }
		return {
			resourceName,
			url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${subdomain}.${PUBLIC_ROUTE_ROOT}:${PUBLIC_ROUTE_ROOT_PORT}`,
		}
	}).forEach(({ resourceName, url }) => {
		renv[`${repoName.toUpperCase().split('-').join('_')}_${resourceName.toUpperCase()}_URL`] = url
	})

    const servers = await Promise.all(Object.entries(envCfg).map(async ([resourceName, { runtime = 'node', type = 'api', dev, directory, buildLocation }]) => {
        const sid = `${resourceName}-${invocationId.split('-')[0]}-${user.username}`
        let staticContentUrl
        let bucketProxyUrl

        if (type === 'web' && buildLocation) {
            const bucketName = `${user.username}-dev-${resourceName}-${seed.split('-')[0]}`
            const actualBucketName = await s3.ensureWebBucket(bucketName)
            const staticUrl = `${S3_ENDPOINT}/${actualBucketName}`

            staticContentUrl = await route.set({
                subdomain: `static-${sid}.dev`,
                destination: staticUrl,
                extensions: ['index.html']
            })

            bucketProxies[actualBucketName] = {
                buildLocation: repoRelative(buildLocation),
                directory,
            }
            bucketProxyUrl = `/dev-session/bucket-proxy/${actualBucketName}`
            console.log(invocationId, 'created bucket proxy for',bucketName, repoRelative(buildLocation))

            if (!dev || !dev.command) {
                // return to cli
                return {
                    url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://build.${PUBLIC_ROUTE_ROOT}:${PUBLIC_ROUTE_ROOT_PORT}${bucketProxyUrl}`,
                    staticContentUrl,
                    resourceName,
                    type,
                }
            } else {
                // pass to deployment
            }
        }
        
        const devEndpointId = `${user.username}-${resourceName}-dev-${seed}`.toLowerCase()
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
                ...renv,
                ULTIMA_RESOURCE_NAME: resourceName,
                ULTIMA_RESOURCE_TYPE: type,
                ULTIMA_TOKEN: token,
                ULTIMA_BUCKET_PROXY_URL: `${INTERNAL_MGMT_ENDPOINT}${bucketProxyUrl}`,
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
            resourceName,
        }
    }))

    return {
        id: schemaId,
        schemaId,
        servers,
    }
}

router.post('/dev-session', async (req, res) => {
    const session = await startDevSession({ token: req.token, user: req.user, details: req.body })
    res.json(session)
})

module.exports = app => {
	app.use(router)
}
