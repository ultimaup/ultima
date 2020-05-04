const { cli } = require('cli-ux')
// const cliSelect = require('cli-select')

const config = require('../../config')

const makeTunnel = require('./makeTunnel')

const db = async (sessionId) => {
    const { token } = await config.get()
    if (!token) {
        cli.error('you must be logged in to do that')
    }

    const port = await makeTunnel(sessionId, token)

    cli.log(`${sessionId} db available on port ${port}`)
}

module.exports = db