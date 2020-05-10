const { program } = require('commander')
const { cli, config } = require('cli-ux')
const updateNotifier = require('update-notifier');
const dev = require('./commands/dev')
const login = require('./commands/login')
const init = require('./commands/init')
const up = require('./commands/up')
const clone = require('./commands/clone')
const db = require('./commands/db')
const exec = require('./commands/exec')

const ultimaConfig = require('./config')
const pkg = require('./package.json');
 
updateNotifier({ pkg }).notify()

config.outputLevel = 'trace'

const outputLoginText = async () => {
    cli.log(`Welcome to the Ultima CLI`)
    cli.log(`Please go here to login:`)
    const authlink = `${program.server}/user/login?redirect_to=/cli`
    await cli.url(authlink, authlink)
    try {
        await cli.open(authlink)
    } catch (e) {
        //
    }
}

const checkToken = async (noExit) => {
    const cfg = await ultimaConfig.get()
    if (!cfg.token) {
        await outputLoginText()
        if (!noExit) {
            process.exit(0)
        }
    }
}

const main = async () => {
    program.version(pkg.version)
    program
        .option('-s, --server <value>', 'Set server URL', 'https://build.onultima.com')

    program.command('login [token]')
        .description('login to ultima')
        .action(async (token) => {
            if (!token) {
                await checkToken()
            }
            return login(token)
        })

    program.command('dev')
        .description('develop an ultima project')
        .action(async (...args) => {
            await checkToken()
            return dev(...args)
        })

    program.command('up')
        .alias('push')
        .description('push your changes live')
        .action(async (...args) => {
            await checkToken()
            return up(...args)
        })

    program.command('init <project-name>')
        .description('start a new project')
        .action(async (...args) => {
            await checkToken()
            return init(...args)
        })
    
    program.command('clone [project-name]')
        .description('clone an existing project')
        .action(async (...args) => {
            await checkToken()
            return clone(...args)
        })

    program.command('db [environment-name]')
        .description('connect to a database')
        .action(async (...args) => {
            await checkToken()
            return db(...args)
        })

    program.command('devexec <command> [args...]')
        .description('run a command in the current dev session')
        .action(async (...args) => {
            await checkToken()
            return exec(...args)
        })

    program.on('--help', async () => {
        await checkToken(true)
    });

    await program.parseAsync(process.argv)
}

main().catch(console.error)