const getPort = require('get-port')

const config = require('../../config')

const server = require('./server')
const getPgBrokerEndpoint = require('./getPgBrokerEndpoint')

const getPortForKey = async portKey => {
    const cfg = await config.get()
    
    let newConfig = {...cfg}
    if (!newConfig.dbPorts) {
        newConfig.dbPorts = {}
    }
    if (!newConfig.dbPorts[portKey]) {
        newConfig.dbPorts[portKey] = await getPort({ port: getPort.makeRange(7000, 7100) })
        await config.set(newConfig)
    }

    return newConfig.dbPorts[portKey]
}

const makeTunnel = async (environment, token, portKey) => {
    const port = await getPortForKey(portKey)
    const endpoint = await getPgBrokerEndpoint({ token })
    const [host, pgPort] = endpoint.split(':')

    const cliListener = server({ host, port: pgPort, database: environment, user: token, secure: pgPort === '443' })

    return new Promise(resolve => {
        cliListener.listen(port, () => {
            resolve(port)
        })
    })
}

module.exports = makeTunnel