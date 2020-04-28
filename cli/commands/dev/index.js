const { cli } = require('cli-ux')
const { program } = require('commander')

const client = require('./client')
const fileSync = require('./fileSync')
const runner = require('./runner')
const API = require('./api')

const config = require('../../config')
const checkInUltimaFolder = require('../up/checkInUltimaFolder')

const dev = async () => {
    const cfg = await config.get()

    const inUltimaFolder = await checkInUltimaFolder({ token: cfg.token })

    if (!inUltimaFolder) {
        return
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
}

module.exports = dev