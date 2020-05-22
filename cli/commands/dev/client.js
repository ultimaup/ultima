const http2 = require('http2-wrapper')
const got = require('got')

const agent = new http2.Agent()

const initSession = async ({ rootEndpoint, ultimaCfg }) => {
    const client = got.extend({
        prefixUrl: rootEndpoint,
        agent: {
            http2: agent,
        },
        http2: true,
    })

    const data = await client.post(`new-session`, {
        json: {ultimaCfg},
    }).json()

    if (!data) {
        throw new Error('unable to connect to allocated development session')
    }

    return {
        data,
        client,
    }
}

module.exports = {
    initSession,
    disconnectAll: () => agent.destroy('disconnectAll called'),
}