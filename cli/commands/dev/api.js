const got = require('got')

const getDeploymentUrl = (rootEndpoint, token, ultimaCfg, { repoName, owner }, ultimaCfgs, log) => {
    let complete = false
    const promise = got.post('dev-session', {
        headers: token ? {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        } : {},
        prefixUrl: rootEndpoint,
        json: {
            repoName,
            owner,
            ultimaCfg,
        },
    }).json().then(d => {
        complete = true
        return d
    })

    let c = 0

    setInterval(() => {
        if (!complete) {
            if (c === 0) {
                log(`Allocating ${Object.keys(ultimaCfgs).length} development instances...`)
            }
            if (c === 1) {
                log(`Almost there...`)
            }
            if (c === 5) {
                log(`Timed out allocating ${Object.keys(ultimaCfgs).length} development instances, please report this with your .ultima.yml file and the current timestamp: ${(new Date()).toISOString()}`)
                process.exit()
            }
            c++
        }
    }, 4000);

    return promise
}

module.exports = {
    getDeploymentUrl,
}