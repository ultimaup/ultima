const { program } = require('commander')
const { cli } = require('cli-ux')
const jwtdecode = require('jwt-decode')

const client = require('./client')
const fileSync = require('./fileSync')
const runner = require('./runner')
const API = require('./api')
const config = require('./config')

program.version('0.0.1')
program
    .option('-s, --server <value>', 'Set server URL', 'http://build.onultima.local:4480')

program.command('login <token>')
    .description('login to ultima')
    .action(async token => {
        const user = jwtdecode(token)
        cli.log(`Welcome ${user.username}`)

        const cfg = await config.get()
        await config.set({
            ...cfg,
            token,
        })

        cli.log(`You can now use the ultima cli to develop your projects.`)
    })

program.command('dev')
    .description('develop an ultima project')
    .action(async () => {
        const cfg = await config.get()
        if (!cfg.token) {
            cli.log(`Welcome to the Ultima CLI`)
            cli.log(`Please go here to login:`)
            const authlink = `${program.server}/user/login?redirect_to=/cli`
            await cli.url(authlink, authlink)
            await cli.open(authlink)
            process.exit()
        }

        await cli.action.start('starting session...')
        const api = API.init(program.server, cfg.token)

        const server = await api.getDeploymentUrl()

        const { sessionId } = await client.initSession({
            rootEndpoint: server.url
        })

        cli.log(`You can find your app on: ${server.appUrl}`)
        cli.log(`and connect to node debug: ${server.debugUrl}`)

        let barVisible = false
        let runnerStarted = false

        runner.on('stdout', (line) => {
            cli.log(line.toString())
        })
        runner.on('stderr', (line) => {
            cli.log(line.toString())
        })
        
        runner.on('start', () => {
            cli.log('start')
        })
        runner.on('quit', () => {
            cli.log('quit')
        })
        runner.on('restart', (files) => {
            cli.log('restart due to changed files: '+files.join(', '))
        })
        runner.on('crash', () => {
            cli.log('crash')
        })
        runner.on('connect', () => {
            cli.log('connected to development instance')
        })
        runner.on('disconnect', () => {
            cli.log('connection to development instance lost, will reconnect...')
        })

        await runner.connect(server.url)

        const fileBar = cli.progress({
            format: ' {bar} {percentage}% | ETA: {eta}s | {value}/{total}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591'
        })
        
        try {
            await fileSync.init({
                sessionId,
            }, (completed, total) => {
                if (!barVisible) {
                    cli.action.stop()
                    fileBar.start()
                }

                fileBar.update(completed)
                fileBar.setTotal(total)
                if (total === completed && !runnerStarted) {
                    // start runner
                    runnerStarted = true
                    runner.start({ sessionId })
                }
                if (total === completed && isInitialized) {
                    fileBar.stop()
                    cli.action.start('Watching for changes')
                }
            }, () => {
                isInitialized = true
            })
        } catch (e) {
            await cli.action.stop()
            console.error('failed to init', e)
        }
    })

program.parse(process.argv)