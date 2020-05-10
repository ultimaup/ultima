const http2 = require('http2-wrapper')
const got = require('got')

class MyAgent extends http2.Agent {
	createConnection(origin, options) {
		console.log(`Connecting to ${http2.Agent.normalizeOrigin(origin)}`);
		return http2.Agent.connect(origin, options);
	}
}

const agent = new MyAgent()

const initSession = async (config) => {
    const client = got.extend({
        prefixUrl: config.rootEndpoint,
        agent: {
            http2: agent,
        },
    })

    const data = await client.post(`new-session`).json()

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