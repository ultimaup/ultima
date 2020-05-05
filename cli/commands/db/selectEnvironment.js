const cliSelect = require('cli-select')

const getEnvironments = require('./getEnvironments')

const selectEnvironment = async ({ token }, filter) => {
    let environments = await getEnvironments({ token })
    if (filter) {
        environments = filter(environments)
    }

    if (environments.length === 0) {
        return null
    }

    if (environments.length === 1) {
        return environments[0]
    }

    let ids = []
    const choiceMap = {}
    const choices = environments
        .filter(e => e.stage !== 'builder' && e.stage !== 'development')
        .map((env) => {
            const { id, repoName, stage } = env
            const branch = stage.replace('refs/heads/', '')
            ids.push(id)
            choiceMap[id] = env
            return `[${branch}] ${repoName}`
        })

    const choice = await cliSelect({ values: choices })
    const env = choiceMap[ids[choice.id]]

    return env
}

module.exports = selectEnvironment