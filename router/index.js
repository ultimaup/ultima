const fse = require('fs-extra')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')

const Route = require('./db/Route')

const {
    PORT,

    CONFIG_DIR,

    PUBLIC_ROUTE_ROOT,
    PUBLIC_ROUTE_ROOT_PROTOCOL,
} = process.env

const app = express()
app.use(bodyParser.json())

const stripTrailingSlash = (str) => 
    (str.substr(-1) === '/') ? str.substr(0, str.length - 1) : str

const genConfig = ({ source, destination }) => {
    const key = source.split('.').join('-')
    const url = new URL(destination)

    const { host, protocol, pathname } = url
    const prefix = stripTrailingSlash(pathname)

    return (
`[http]
    [http.routers]
        [http.routers.${key}]
            rule = "Host(\`${source}\`)"
            middlewares = ["${key}"]
            service = "${key}"
    ${prefix && `
    [http.middlewares]
        [http.middlewares.${key}.addPrefix]
            prefix = "${prefix}"`}
    [http.services]
        [http.services.${key}.loadBalancer]
            [[http.services.${key}.loadBalancer.servers]]
                url = "${protocol}//${host}"`
    )
}

const ensureConfig = async ({ source, destination }) => {
    const key = source.split('.').join('-')
    const fileName = path.resolve(CONFIG_DIR, `${key}.toml`)
    const config = genConfig({ source, destination })
    await fse.outputFile(fileName, config)
    console.log('route set', source, '->', destination)
}

app.post('/route', async (req, res) => {
    let { subdomain, source, destination } = req.body
    source = source || `${subdomain}.${PUBLIC_ROUTE_ROOT}`

    await ensureConfig({ source, destination })
    await Route.set({ source, destination })

    res.json(`${PUBLIC_ROUTE_ROOT_PROTOCOL}://${source}`)
})

const init = async () => {
    console.log('server starting')

    const configs = await Route.query()

    console.log(`ensuring ${configs.length} configs...`)

    await Promise.all(configs.map(ensureConfig))

    console.log(`ensured ${configs.length} configs`)

    app.listen({ port: PORT }, () => {
        console.log(`🚀  Server ready at ${PORT}`)
    })
}

init().catch(console.error)