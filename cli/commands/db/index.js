const { cli } = require('cli-ux')
const cliSelect = require('cli-select')

const config = require('../../config')

const makeTunnel = require('./makeTunnel')
const getEnvironments = require('./getEnvironments')

const db = async (envId) => {
    const { token } = await config.get()
    if (!token) {
        cli.error('you must be logged in to do that')
    }

    cli.log('select a database to connect to:')

    let environmentId = envId

    if (!envId) {
        const environments = await getEnvironments({ token })

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
        environmentId = `${env.repoName.split('/').join('-')}-${env.stage.replace('refs/heads/', '')}`
    }

    const port = await makeTunnel(environmentId, token, environmentId)

    cli.log(`Connected to database ${environmentId}`)
    cli.log('Connect using your favourite postgres tool:')
    cli.log('Host: localhost')
    cli.log(`Port: ${port}`)
    cli.log(`Database: ${environmentId}`)
    cli.log('User: <any>')
    cli.log('Password: <any>')
    cli.log('')
    cli.log('The port number will stay the same if you connect to this database again.')
}

module.exports = db