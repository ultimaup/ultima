const fetch = require('node-fetch')

const init = (rootEndpoint, token) => {
    const apiFetch = (endpoint, ...args) => {
        return fetch(`${rootEndpoint}${endpoint}`, ...args)
    }

    const getDeploymentUrl = () => apiFetch('/dev-session', {
        method: 'post',
        headers: token ? {
            Authorization: `Bearer ${token}`,
        } : {},
    }).then(r => r.json())

    return {
        getDeploymentUrl,
    }
}

module.exports = {
    init,
}