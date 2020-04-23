const got = require('got')
const {
    ROUTER_MGMT_ENDPOINT,
} = process.env
const Route = require('./db/Route')

const set = ({ source, subdomain, destination, deploymentId, extensions }) => (
    got.post(`${ROUTER_MGMT_ENDPOINT}/route`, {
		json: { source, subdomain, destination, extensions, deploymentId },
	}).json()
)

const get = subdomain => (
    got.post(`${ROUTER_MGMT_ENDPOINT}/route/get`, {
        json: { subdomain },
    }).json()
)

module.exports = {
    set,
    get,
}