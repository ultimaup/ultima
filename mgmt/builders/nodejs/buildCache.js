const got = require('got')

const {
    ULTIMA_CACHE_ENDPOINT,
    ULTIMA_CACHE_TOKEN,
} = process.env

const client = got.extend({
    prefixUrl: ULTIMA_CACHE_ENDPOINT,
    headers: {
        authorization: `Bearer ${ULTIMA_CACHE_TOKEN}`,
    },
    throwHttpErrors: false,
})

const head = (hash) => client.head(`build-cache/${hash}`)
const getStream = (hash) => client.stream.get(`build-cache/${hash}`)
const postStream = (hash) => client.stream.post(`build-cache/${hash}`)

module.exports = {
    head,
    getStream,
    postStream,
}