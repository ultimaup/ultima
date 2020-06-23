const { program } = require('commander')
const updateNotifier = require('update-notifier')

const dev = require('./commands/dev')
const login = require('./commands/login')
const db = require('./commands/db')
const exec = require('./commands/exec')
const up = require('./commands/up')

const ultimaConfig = require('./config')
const pkg = require('./package.json')
 
updateNotifier({ pkg }).notify()

const checkToken = async () => {
    const cfg = await ultimaConfig.get()
    if (!cfg.token) {
        await login()
    }
}

const main = async () => {
    program.version(pkg.version)
    program
        .option('-s, --server <value>', 'Set server URL', 'https://build.onultima.com')

    program.command('login')
        .description('login to ultima')
        .action(login)

    program.command('up')
        .description(`watch a push get deployed, or if the current project isn't on ultima, add it to ultima`)
        .action(async (...args) => {
            await checkToken()
            return up(...args)
        })

    program.command('dev')
        .description('develop an ultima project')
        .action(async (...args) => {
            await checkToken()
            return dev(...args)
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
    })

    await program.parseAsync(process.argv)
}

main().catch(console.error)