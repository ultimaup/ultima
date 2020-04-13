const got = require('got')
const {
    ROUTER_MGMT_ENDPOINT,
} = process.env

const set = ({ source, subdomain, destination }) => (
    got.post(`${ROUTER_MGMT_ENDPOINT}/route`, {
		json: { source, subdomain, destination },
	}).json()
)

module.exports = {
    set,
}