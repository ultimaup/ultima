const fetch = require('node-fetch')

const init = (rootEndpoint, token, { repoName, owner }) => {
    const apiFetch = (endpoint, ...args) => {
        return fetch(`${rootEndpoint}${endpoint}`, ...args)
    }

    const getDeploymentUrl = () => apiFetch('/dev-session', {
        method: 'post',
        headers: token ? {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        } : {},
        body: JSON.stringify({
            repoName,
            owner,
        }),
    }).then(r => r.json())

    return {
        getDeploymentUrl,
    }
}

module.exports = {
    init,
}