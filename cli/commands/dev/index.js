const { cli } = require('cli-ux')
const { program } = require('commander')

const apiClient = require('./client')
const fileSync = require('./fileSync')
const runner = require('./runner')
const API = require('./api')

const config = require('../../config')
const checkInUltimaFolder = require('../up/checkInUltimaFolder')
const makeTunnel = require('../db/makeTunnel')

const getRepoName = remote => {
    if (!remote) {
        return {
            repoName: 'unknown',
            owner: 'unknown',
        }
    }
    let sshUrl = remote.refs.push
    if (!sshUrl.startsWith('ssh://')) {
        sshUrl = `ssh://${sshUrl.split(':').join('/')}` // converts the "shorthand" ssh clone url to a standards compliant url
    }
    const [_,owner, r] = (new URL(sshUrl)).pathname.split('/')
    const repoName = r.split('.git')[0]
    return {repoName, owner}
}

const dev = async () => {
    const cfg = await config.get()

    let inUltimaFolder

    inUltimaFolder = await checkInUltimaFolder({ token: cfg.token })

    if (!inUltimaFolder) {
        return
    }
    const {repoName, owner} = getRepoName(inUltimaFolder)

    await cli.action.start('starting session...')
    const api = API.init(program.server, cfg.token, {owner, repoName})

    const server = await api.getDeploymentUrl()
    if (server.status === 'error') {
        return cli.error(`Failed to start dev session: ${server.message}`)
    }

    const [un] = server.id.split('-')[0]
    const dbPortKey = `${owner}-${repoName}-${un}-dev`
    
    const dbPort = await makeTunnel(server.id, cfg.token, dbPortKey)
    const { data: { sessionId }, client } = await apiClient.initSession({
        rootEndpoint: server.url
    })

    cli.log(`You can find your app on: ${server.appUrl}`)
    cli.log(`and connect to node debug: ${server.debugUrl}`)
    cli.log('')
    cli.log(`Connected to development database`)
    cli.log('Connect using your favourite postgres tool:')
    cli.log('Host: localhost')
    cli.log(`Port: ${dbPort}`)
    cli.log(`Database: ${server.id}`)
    cli.log('User: <any>')
    cli.log('Password: <any>')
    cli.log('')

    let barVisible = false
    let runnerStarted = false
    let isInitialized

    runner.on('stdout', (line) => {
        cli.log(line.toString())
    })
    runner.on('stderr', (line) => {
        cli.log(line.toString())
    })
    
    runner.on('start', () => {
        cli.log('start')
    })
    runner.on('install-deps-start', () => {
        cli.log('installing dependancies')
    })
    runner.on('install-deps-complete', () => {
        cli.log('installed dependancies')
    })
    runner.on('quit', () => {
        cli.log('quit')
    })
    runner.on('restart', () => {
        cli.log('restart due to changed files')
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
            client,
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
