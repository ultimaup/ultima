const got = require('got')
const {
    ROUTER_MGMT_ENDPOINT,
} = process.env

const set = ({ source, subdomain, destination, extensions }) => (
    got.post(`${ROUTER_MGMT_ENDPOINT}/route`, {
		json: { source, subdomain, destination, extensions },
	}).json()
)

module.exports = {
    set,
}