const got = require('got')

const getDeploymentUrl = (rootEndpoint, token, ultimaCfg, resourceName, { repoName, owner }) => got.post('dev-session', {
    headers: token ? {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    } : {},
    prefixUrl: rootEndpoint,
    json: {
        repoName,
        resourceName,
        owner,
        ultimaCfg,
    },
}).json()

module.exports = {
    getDeploymentUrl,
}