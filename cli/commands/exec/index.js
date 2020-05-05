const { cli } = require('cli-ux')

const exec = require('./exec')
const config = require('../../config')

const getEnvironments = require('../db/getEnvironments')

const devExec = async (command, args = []) => {
    const { token } = await config.get()
    const cmd = [
        command,
        ...args,
    ]

    const envs = await getEnvironments({ token })
    const es = envs.filter(e => e.stage === 'development').sort((a,b) => b.createdAt - a.createdAt)

    const env = es[es.length - 1]

    if (!env) {
        cli.log('no environments found')
        return
    }

    const id = env.id

    await cli.action.start('connecting...')

    const { stdin, stdout } = await exec(token, { id, cmd })

    stdin.once('readable', async () => {
        await cli.action.stop()
        process.stdin.on('data', buf => {
            stdin.emit('data', buf)
        })
    })

    stdout.on('data', buf => {
        const str = buf.toString()
        process.stdout.write(str)
    })

    stdout.on('ended', () => {
        process.exit(0)
    })
}

module.exports = devExec