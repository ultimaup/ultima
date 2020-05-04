const gqlFetch = require('../../utils/gqlFetch')

const getPgBrokerEndpoint = ({ token }) => {
    return gqlFetch({token})(`query getPGEndpoint {
        getPGEndpoint
      }`).then(({ data }) => data.getPGEndpoint)
}

module.exports = getPgBrokerEndpoint