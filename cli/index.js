const { program } = require('commander')
const { cli } = require('cli-ux')

const dev = require('./commands/dev')
const login = require('./commands/login')
const init = require('./commands/init')
const up = require('./commands/up')

const config = require('./config')

const main = async () => {
    const cfg = await config.get()
    if (!cfg.token) {
        cli.log(`Welcome to the Ultima CLI`)
        cli.log(`Please go here to login:`)
        const authlink = `${program.server}/user/login?redirect_to=/cli`
        await cli.url(authlink, authlink)
        await cli.open(authlink)
        process.exit()
    } else {
        program.version('0.0.1')
        program
            .option('-s, --server <value>', 'Set server URL', 'http://build.onultima.local:4480')

        program.command('login <token>')
            .description('login to ultima')
            .action(login)

        program.command('dev')
            .description('develop an ultima project')
            .action(dev)

        program.command('up')
            .alias('push')
            .description('push your changes live')
            .action(up)

        program.command('init <project name>')
            .description('start a new project')
            .action(init)

        program.parse(process.argv)
    }
}

main().catch(console.error)