const { cli } = require('cli-ux')
const { program } = require('commander')
const inquirer = require('inquirer')
const cliSpinners = require('cli-spinners')
const jwtdecode = require('jwt-decode')

const apiClient = require('./client')
const fileSync = require('./fileSync')
const runner = require('./runner')
const API = require('./api')

const config = require('../../config')
const checkInUltimaFolder = require('../up/checkInUltimaFolder')
const makeTunnel = require('../db/makeTunnel')

const getRepoName = (remote, user) => {
    if (!remote) {
        return {
            repoName: 'unknown',
            owner: user.username,
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

const liveSpinner = (appUrl, writeFrame, dbPort, database) => {
    const spinner = cliSpinners.dots

    let ctr = 0

    let url = appUrl.endsWith(':443') ? appUrl.split(':443')[0] : appUrl

    return setInterval(() => {
        const idx = (ctr % (spinner.frames.length - 1))
        const frame = spinner.frames[idx]

        writeFrame(['',
            `DB host: localhost:${dbPort} database: ${database}`,
            `Live url: ${url}`, 
            `Watching for changes ${frame}`
        ].join('\n'))

        ctr++
    }, spinner.interval)
}

const dev = async () => {
    const cfg = await config.get()

    let inUltimaFolder

    // inUltimaFolder = await checkInUltimaFolder({ token: cfg.token })

    // if (!inUltimaFolder) {
    //     return
    // }
    const {repoName, owner} = getRepoName(inUltimaFolder, jwtdecode(cfg.token))

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

    await cli.action.stop()

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

    const ui = new inquirer.ui.BottomBar()

    let runnerStarted = false
    let isInitialized

    runner.on('stdout', (line) => {
        ui.log.write(line.toString())
    })
    runner.on('stderr', (line) => {
        ui.log.write(line.toString())
    })
    
    let spinInterval

    runner.on('start', () => {
        ui.log.write('start')
    })
    
    let firstTime = true
    runner.on('install-deps-start', async () => {
        if (firstTime) {
            await cli.action.start('installing dependancies...')
        } else {
            if (spinInterval) {
                clearInterval(spinInterval)
            }
            ui.updateBottomBar(`installing dependancies...`)
        }
    })
    runner.on('install-deps-complete', async () => {
        if (firstTime) {
            await cli.action.stop()
        } else {
            ui.log.write('installed dependancies')
        }
        
        firstTime = false

        liveSpinner(server.appUrl, (str) => {
            ui.updateBottomBar(str)
        }, dbPort, server.id)
    })

    runner.on('quit', () => {
        ui.log.write('quit')
    })
    runner.on('restart', () => {
        // cli.log('restart due to changed files')
    })
    runner.on('crash', () => {
        // ui.log.write('crash')
    })
    runner.on('connect', () => {
        ui.log.write('connected to development instance')
    })
    runner.on('disconnect', () => {
        ui.log.write('connection to development instance lost, will reconnect...')
    })

    await runner.connect(server.url)

    try {
        await fileSync.init({
            sessionId,
            client,
        }, (completed, total) => {
            if (spinInterval) {
                clearInterval(spinInterval)
            }
            ui.updateBottomBar(`uploading files ${completed}/${total}`)
            
            if (total === completed && !runnerStarted) {
                // start runner
                runnerStarted = true
                runner.start({ sessionId })
                ui.updateBottomBar(`starting app...`)
            }
            if (total === completed && isInitialized) {
                liveSpinner(server.appUrl, (str) => {
                    ui.updateBottomBar(str)
                }, dbPort, server.id)
            }
        }, () => {
            isInitialized = true
        })
    } catch (e) {
        console.error('failed to init', e)
    }
}

module.exports = dev
