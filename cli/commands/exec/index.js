const { cli } = require('cli-ux')
const cliSelect = require('cli-select')

const exec = require('./exec')
const config = require('../../config')

const getEnvironments = require('../db/getEnvironments')

const devExec = async (command, args = []) => {
    const { token } = await config.get()
    const cmd = (command.includes(' ') && args.length === 0) ? [
        ...command.split(' '),
        ...args,
    ] : [
        command,
        ...args,
    ]

    const envs = await getEnvironments({ token })
    const es = envs.filter(e => e.stage === 'development').sort((a,b) => b.createdAt < a.createdAt ? -1 : 1)
    let env
    if (es.length > 1) {
        const selected = await cliSelect({
            values: es.map(e => `session started at ${e.createdAt}`),
        })
        env = es[selected.id]
    } else {
        env = es[0]
    }

    if (!env) {
        cli.log('no environments found')
        return
    }

    const id = env.id

    await cli.action.start('connecting...')

    const { stdin, stdout } = await exec(token, { id, cmd })

    stdin.once('readable', async () => {
        await cli.action.stop()
        process.stdin.resume()
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