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
    KIBANA_ENDPOINT,

    GITEA_COOKIE_NAME,
    CERT_RESOLVER,
    CERT_RESOLVER_HTTP,
    PGBROKER_ENDPOINT,
    ENDPOINTS_ENDPOINT,
    S3_ENDPOINT,
} = process.env

const app = express()
app.use(bodyParser.json())

const stripTrailingSlash = (str) => 
    (str && str.substr(-1) === '/') ? str.substr(0, str.length - 1) : str

const parseUrl = url => {
    const host = url.split('//')[1].split('/')[0]
    const port = host.split(':')[1]

    return {
        protocol: url.split('//')[0],
        host,
        port,
        pathname: url.split(host)[1] || '/',
    }
}

const sourceToKey = (source, extensions) => source.split('.').join('-').split('/').join('-') + (extensions ? extensions.length : 0)

const aliasConfig = ({ alias, middlewares, key }) => (alias ? `
[http.routers.${key}-alias]
    rule = "Host(\`${alias}\`)"
    ${middlewares}
    service = "${key}"${CERT_RESOLVER ? `
    [http.routers.${key}-alias.tls]
        certResolver = "${CERT_RESOLVER_HTTP}"
        [[http.routers.${key}.tls.domains]]
            main = "${alias}"
            sans = ["${alias}"]` : ''}` : ''
)

const genConfig = ({ source, destination, alias, extensions = [] }) => {
    console.log('genConfig called', {
        source,
        destination, extensions,
        alias,
    })
    const key = sourceToKey(source, extensions)
    const url = parseUrl(destination) // URL doesn't support http2 or hostnames

    const { host, protocol, pathname, port } = url
    const prefix = stripTrailingSlash(pathname)

    let sourceHost = source
    let sourcePath

    if (source.includes('/')) {
        const [sourceHostPart, ...sourcePathParts] = source.split('/')
        sourcePath = sourcePathParts.join('/')
        sourceHost = sourceHostPart
    }

    let subdomainMinusOne = sourceHost.split('.')
    subdomainMinusOne.shift()
    subdomainMinusOne = subdomainMinusOne.join('.')

    if (extensions && extensions.includes('tcp')) {
        return (
            `
            [tcp]
                [tcp.routers]
                    [tcp.routers.${key}]
                        service = "${key}"${CERT_RESOLVER ? `
                        rule = "HostSNI(\`${sourceHost}\`)"
                        [tcp.routers.${key}.tls]
                            certResolver = "${CERT_RESOLVER}"
                            [[tcp.routers.${key}.tls.domains]]
                                main = "*.${subdomainMinusOne}"
                                sans = ["*.${subdomainMinusOne}"]` : ``}
                [tcp.services]
                    [tcp.services.${key}.loadBalancer]
                        [[tcp.services.${key}.loadBalancer.servers]]
                            address = "${host}"`
        )
    }

    if (extensions && extensions.includes('index.html')) {
        return (
            `[http]
                [http.routers]
                    [http.routers.${key}]
                        rule = "Host(\`${sourceHost}\`)${sourcePath ? ` && PathPrefix(\`/${sourcePath}\`)` : ''}"
                        ${(prefix) ? `middlewares = ["${key}", "strip-prefix-1", "add-index", "error-page"]`: ''}
                        service = "${key}"${CERT_RESOLVER ? `
                        [http.routers.${key}.tls]
                            certResolver = "${CERT_RESOLVER}"` : ''}${aliasConfig({ alias, prefix, key, middlewares: `${(prefix) ? `middlewares = ["${key}", "strip-prefix-1", "add-index", "error-page"]`: ''}` })}${prefix ? `
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
            service = "${key}"${CERT_RESOLVER ? `
            [http.routers.${key}.tls]
                certResolver = "${CERT_RESOLVER}"
                [[http.routers.${key}.tls.domains]]
                    main = "*.${subdomainMinusOne}"
                    sans = ["*.${subdomainMinusOne}"]` : ''}${aliasConfig({ alias, prefix, key, middlewares: `${(prefix) ? `middlewares = ["${key}"]`: ''}` })}${prefix ? `
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
        { source: PUBLIC_ROUTE_ROOT, destination: MGMT_ENDPOINT },

        { source: `build.${PUBLIC_ROUTE_ROOT}`, destination: FRONTEND_ENDPOINT, extensions: ['root'] },
        { source: `build.${PUBLIC_ROUTE_ROOT}/assets`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/ws/container`, destination: `${ENDPOINTS_ENDPOINT}/ws/container`},
        { source: `build.${PUBLIC_ROUTE_ROOT}/og-image.png`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/sockjs-node`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/community`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/legals`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/user/login`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/auth`, destination: MGMT_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/dev-session`, destination: MGMT_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/cli`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/kibana`, destination: KIBANA_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/kibana/login`, destination: MGMT_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/kibana/logout`, destination: MGMT_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/graphql`, destination: MGMT_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/admin/waitlist`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/repo`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/security`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/.well-known`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}`, destination: GITEA_ENDPOINT, extensions: ['root', 'logged-in'] },
        { source: `build.${PUBLIC_ROUTE_ROOT}`, destination: GITEA_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/docs`, destination: FRONTEND_ENDPOINT },
        { source: `pg.${PUBLIC_ROUTE_ROOT}`, destination: PGBROKER_ENDPOINT, extensions: ['tcp'] },
        { source: `build.${PUBLIC_ROUTE_ROOT}/minio`, destination: S3_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/dev-bucket`, destination: FRONTEND_ENDPOINT },
        { source: `build.${PUBLIC_ROUTE_ROOT}/docs`, destination: FRONTEND_ENDPOINT },
    ]
}

const ensureConfig = async ({ source, destination, alias, extensions = [] }) => {
    const key = sourceToKey(source, extensions)
    const fileName = path.resolve(CONFIG_DIR, `${key}.toml`)
    const config = genConfig({ source, alias, destination, extensions })
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
    let { subdomain, source, destination, alias, extensions, deploymentId } = req.body
    source = source || `${subdomain}.${PUBLIC_ROUTE_ROOT}`

    await ensureConfig({ source, alias, destination, extensions })
    await Route.set({ source, destination, alias, extensions, deploymentId })

    await ensurePropogation(sourceToKey(source))

    res.json(`${PUBLIC_ROUTE_ROOT_PROTOCOL}://${alias || source}${PUBLIC_ROUTE_ROOT_PORT ? `:${PUBLIC_ROUTE_ROOT_PORT}` : ''}`)
})

app.post('/route/get', async (req, res) => {
    let { subdomain, source } = req.body
    source = source || `${subdomain}.${PUBLIC_ROUTE_ROOT}`

    const routes = await Route.query().where({ source })
    res.json(routes)
})

const init = async () => {
    console.log('server starting')
    const configs = await Route.query()

    console.log(`ensuring ${configs.length} configs...`)

    await Promise.all(
        [
            ...defaultConfigs(),
            ...configs.map(c => ({
                ...c,
                extensions: c.extensions ? JSON.parse(c.extensions) : c.extensions,
            }))
        ].map(ensureConfig)
    )

    console.log(`ensured ${configs.length} configs`)

    app.listen({ port: PORT }, () => {
        console.log(`🚀  Server ready at ${PORT}`)
    })
}

init().catch(console.error)
