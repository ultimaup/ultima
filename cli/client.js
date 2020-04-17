const { context } = require('fetch-h2')

const { fetch, disconnectAll } = context()

const clientFetch = (endpoint, ...args) => fetch(`${rootEndpoint}${endpoint}`, ...args)

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
}