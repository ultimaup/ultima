const { cli } = require('cli-ux')
const jwtdecode = require('jwt-decode')

const config = require('../config')

const login = async token => {
    const user = jwtdecode(token)
    cli.log(`Welcome ${user.username}`)

    const cfg = await config.get()
    await config.set({
        ...cfg,
        token,
    })

    cli.log(`You can now use the ultima cli to develop your projects.`)
}

module.exports = login