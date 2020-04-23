const { context } = require('fetch-h2')

const { fetch, disconnectAll } = context()
const clientFetch = (endpoint, ...args) => fetch(`${rootEndpoint}${endpoint}`, ...args)

let rootEndpoint

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const initSession = async (config) => {
    rootEndpoint = config.rootEndpoint
    let data
    let ctr = 0

    while (!data && ctr < 20) {
        ctr++
        try {
            console.log('trying', rootEndpoint)
            const res = await clientFetch(`/new-session`, {
                method: 'post',
            })
            data = await res.json()
        } catch (e) {
            if (!e.message.includes('unable to verify the first certificate')) {
                throw e
            }
        }
        await wait(500)
    }

    if (!data) {
        throw new Error('unable to connect to allocated development session')
    }

    return data
}

module.exports = {
    fetch: clientFetch,
    initSession,
    disconnectAll,
}