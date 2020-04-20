const fse = require('fs-extra')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')

const Route = require('./db/Route')

const {
    PORT,

    CONFIG_DIR,

    PUBLIC_ROUTE_ROOT,
    PUBLIC_ROUTE_ROOT_PROTOCOL,
    PUBLIC_ROUTE_ROOT_PORT,

    MGMT_ENDPOINT,
    TRAEFIK_ENDPOINT,
    GITEA_ENDPOINT,
    FRONTEND_ENDPOINT,

    GITEA_COOKIE_NAME,
} = process.env

const app = express()
app.use(bodyParser.json())

const stripTrailingSlash = (str) => 
    (str && str.substr(-1) === '/') ? str.substr(0, str.length - 1) : str

const parseUrl = url => {
    const host = url.split('//')[1].split('/')[0]

    return {
        protocol: url.split('//')[0],
        host,
        pathname: url.split(host)[1] || '/',
    }
}

const sourceToKey = (source, extensions) => source.split('.').join('-').split('/').join('-') + (extensions ? extensions.length : 0)

const genConfig = ({ source, destination, extensions = [] }) => {
    const key = sourceToKey(source, extensions)
    const url = parseUrl(destination) // URL doesn't support http2 or hostnames

    const { host, protocol, pathname } = url
    const prefix = stripTrailingSlash(pathname)

    let sourceHost = source
    let sourcePath

    if (source.includes('/')) {
        const [sourceHostPart, ...sourcePathParts] = source.split('/')
        sourcePath = sourcePathParts.join('/')
        sourceHost = sourceHostPart
    }

    if (extensions && extensions.includes('index.html')) {
        return (
            `[http]
                [http.routers]
                    [http.routers.${key}]
                        rule = "Host(\`${sourceHost}\`)${sourcePath ? ` && PathPrefix(\`/${sourcePath}\`)` : ''}"
                        ${(prefix) ? `middlewares = ["${key}", "strip-prefix-1", "add-index", "error-page"]`: ''}
                        service = "${key}"${prefix ? `
                [http.middlewares]
                    [http.middlewares.${key}]
                        [http.middlewares.${key}.addPrefix]
                            prefix = "${prefix}"` : ''}
                        [http.middlewares.strip-prefix-1]
                            [http.middlewares.strip-prefix-1.replacePathRegex]
                                regex = "^(https?://[^/]+/[a-z0-9_]+)$$"
                                replacement = "$\${1}/"
                        [http.middlewares.add-index]
                            [http.middlewares.add-index.replacePathRegex]
                                regex = "\/+$"
                                replacement = "/index.html"
                        [http.middlewares.error-page]
                            [http.middlewares.error-page.errors]
                                status = ["400-599"]
                                service = "${key}"
                                query = "${prefix}/error.html"
                [http.services]
                    [http.services.${key}.loadBalancer]
                        [[http.services.${key}.loadBalancer.servers]]
                            url = "${protocol}//${host}"`
        )
    }

    return (
`[http]
    [http.routers]
        [http.routers.${key}]
            rule = "Host(\`${sourceHost}\`)${sourcePath ? ` && PathPrefix(\`/${sourcePath}\`)` : ''}${extensions && extensions.includes('root') ? '&& Path(\`/\`)' : ''}${extensions && extensions.includes('logged-in') ? `&& HeadersRegexp(\`Cookie\`, \`${GITEA_COOKIE_NAME}=\`)` : ''}"
            ${(prefix) ? `middlewares = ["${key}"]`: ''}
            service = "${key}"${prefix ? `
    [http.middlewares]
        [http.middlewares.${key}.addPrefix]
            prefix = "${prefix}"` : ''}
    [http.services]
        [http.services.${key}.loadBalancer]
            [[http.services.${key}.loadBalancer.servers]]
                url = "${protocol}//${host}"`
    )
}

const defaultConfigs = () => {
    return [
        { source: `mgmt.${PUBLIC_ROUTE_ROOT}`, destination: MGMT_ENDPOINT },

        { source: `build.${PUBLIC_ROUTE_ROOT}`, destination: FRONTEND_ENDPOINT, extensions: ['root'] },
        { source: `build.${PUBLIC_ROUTE_ROOT}/assets`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/sockjs-node`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/community`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/user/login`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/auth`, destination: MGMT_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}`, destination: GITEA_ENDPOINT, extensions: ['root', 'logged-in'] },
        { source: `build.${PUBLIC_ROUTE_ROOT}`, destination: GITEA_ENDPOINT },
    ]
}

const ensureConfig = async ({ source, destination, extensions = [] }) => {
    const key = sourceToKey(source, extensions)
    const fileName = path.resolve(CONFIG_DIR, `${key}.toml`)
    const config = genConfig({ source, destination, extensions })
    await fse.outputFile(fileName, config)
    // console.log('route set', source, '->', destination, extensions)
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const routerExists = name => (
    fetch(`${TRAEFIK_ENDPOINT}/api/http/routers/${name}`)
        .then(r => r.ok)
)

const ensurePropogation = async key => {
    const maxTries = 50
    let ctr = 0
    let exists = await routerExists(`${key}@file`)

    while (!exists && ctr < maxTries) {
        exists = await routerExists(`${key}@file`)
        ctr++
        await wait(10)
    }

    return exists
}

app.post('/route', async (req, res) => {
    let { subdomain, source, destination, extensions } = req.body
    source = source || `${subdomain}.${PUBLIC_ROUTE_ROOT}`

    await ensureConfig({ source, destination, extensions })
    await Route.set({ source, destination, extensions })

    await ensurePropogation(sourceToKey(source))

    res.json(`${PUBLIC_ROUTE_ROOT_PROTOCOL}://${source}${PUBLIC_ROUTE_ROOT_PORT ? `:${PUBLIC_ROUTE_ROOT_PORT}` : ''}`)
})

const init = async () => {
    console.log('server starting')
    const configs = await Route.query()

    console.log(`ensuring ${configs.length} configs...`)

    await Promise.all(
        [
            ...defaultConfigs(),
            ...configs
        ].map(ensureConfig)
    )

    console.log(`ensured ${configs.length} configs`)

    app.listen({ port: PORT }, () => {
        console.log(`🚀  Server ready at ${PORT}`)
    })
}

init().catch(console.error)
