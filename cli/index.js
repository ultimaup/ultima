const { program } = require('commander')
const { cli, config } = require('cli-ux')

const dev = require('./commands/dev')
const login = require('./commands/login')
const init = require('./commands/init')
const up = require('./commands/up')
const clone = require('./commands/clone')

const ultimaConfig = require('./config')

config.outputLevel = 'trace'

const main = async () => {
    const cfg = await ultimaConfig.get()
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
            .option('-s, --server <value>', 'Set server URL', 'https://build.onultima.com')

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

        program.command('init <project-name>')
            .description('start a new project')
            .action(init)

        program.command('clone [project-name]')
            .description('clone an existing project')
            .action(clone)

        program.parse(process.argv)
    }
}

main().catch(console.error)