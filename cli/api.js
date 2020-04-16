const { fetch } = require('fetch-h2')

const init = (rootEndpoint) => {
    const apiFetch = (endpoint, ...args) => {
        console.log(`${rootEndpoint}${endpoint}`)
        return fetch(`${rootEndpoint}${endpoint}`, ...args)
    }

    const getDeploymentUrl = () => apiFetch('/dev-session', {
        method: 'post',
    }).then(r => r.json())

    return {
        getDeploymentUrl,
    }
}

module.exports = {
    init,
}