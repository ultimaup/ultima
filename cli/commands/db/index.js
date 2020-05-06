const { cli } = require('cli-ux')

const config = require('../../config')

const makeTunnel = require('./makeTunnel')
const selectEnvironment = require('./selectEnvironment')

const db = async (envId) => {
    const { token } = await config.get()
    if (!token) {
        return cli.error('you must be logged in to do that')
    }

    let environmentId = envId

    if (!envId) {
        cli.log('select a database to connect to:')
        const env = await selectEnvironment({ token }, environments => {
            return environments.filter(e => e.stage !== 'development' && e.stage !== 'builder')
        })
        if (env) {
            environmentId = `${env.repoName.split('/').join('-')}-${env.stage.replace('refs/heads/', '')}`
        }
    }

    if (!environmentId) {
        return cli.log('no databases found')
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
