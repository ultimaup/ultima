const { context, AbortError } = require('fetch-h2')
const EventEmitter = require('events')

const { fetch, disconnectAll, onPush } = context()

const clientFetch = (endpoint, ...args) => fetch(`${rootEndpoint}${endpoint}`, ...args)

class ClientEmitter extends EventEmitter {}

const clientEmitter = new ClientEmitter()

onPush((origin, req, getResponse) => {
    clientEmitter.emit('push', { origin, req, getResponse })
})

const initSession = async (config) => {
    rootEndpoint = config.rootEndpoint
    const res = await clientFetch(`/new-session`, {
        method: 'post',
    })

    return await res.json()
}

module.exports = {
    fetch: clientFetch,
    initSession,
    disconnectAll,
    on: (...args) => clientEmitter.on(...args),
}