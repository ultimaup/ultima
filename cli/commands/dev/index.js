const { cli } = require('cli-ux')
const { program } = require('commander')
const cliSpinners = require('cli-spinners')
const jwtdecode = require('jwt-decode')
const fse = require('fs-extra')

const apiClient = require('./client')
const fileSync = require('./fileSync')
const Runner = require('./runner')
const API = require('./api')

const UI = require('./ui')

const config = require('../../config')
const checkInUltimaFolder = require('../up/checkInUltimaFolder')
const makeTunnel = require('../db/makeTunnel')
const getRepoName = require('./getRepoName')

const liveSpinner = (appUrl, writeFrame, dbPort, database, staticContentUrl) => {
    const spinner = cliSpinners.dots

    let ctr = 0

    let url = (appUrl && appUrl.endsWith(':443')) ? appUrl.split(':443')[0] : appUrl
    let staticUrl = staticContentUrl && staticContentUrl.endsWith(':443') ? staticContentUrl.split(':443')[0] : staticContentUrl

    return setInterval(() => {
        const idx = (ctr % (spinner.frames.length - 1))
        const frame = spinner.frames[idx]

        writeFrame([
            dbPort && `DB host: localhost:${dbPort} database: ${database}`,
            `Live url: ${url}`,
            staticUrl && `Static website: ${staticUrl}`,
            `Watching for changes ${frame}`
        ].filter(a => !!a).join('\n'))

        ctr++
    }, spinner.interval * 2)
}

const dev = async () => {
    const cfg = await config.get()
    const ui = UI()

    let inUltimaFolder

    const { token } = cfg

    inUltimaFolder = await checkInUltimaFolder({ token })

    if (!inUltimaFolder) {
        return
    }
    const { repoName, owner } = getRepoName(inUltimaFolder, jwtdecode(cfg.token))

    await cli.action.start('starting session...')

    let ultimaCfg
    if (await fse.exists('./.ultima.yml')) {
        ultimaCfg = await fse.readFile('./.ultima.yml', 'utf-8')
    }

    const server = await API.getDeploymentUrl(program.server, cfg.token, ultimaCfg, {owner, repoName})

    if (server.status === 'error') {
        return cli.error(`Failed to start dev session: ${server.message}`)
    }

    const [un] = server.id.split('-')[0]
    const dbPortKey = `${owner}-${repoName}-${un}-dev`
    
    const dbPort = server.schemaId ? await makeTunnel(server.id, token, dbPortKey) : null

    const numResources = server.servers.length

    server.servers.map(async server => {
        const { resourceName } = server
        const namePrefix = numResources > 1

        const logWrite = str => namePrefix ? ui.log.write(`${resourceName}: ${str}`) : ui.log.write(str)
        const { data: { sessionId }, client } = await apiClient.initSession({
            rootEndpoint: server.url,
            ultimaCfg,
            token,
        })

        let runner
        let runnerStarted = false
        let isInitialized
        let spinInterval
    

        if (server.appUrl) {
            runner = Runner()
        
            runner.on('stdout', (line) => {
                logWrite(line.toString())
            })
            runner.on('stderr', (line) => {
                logWrite(line.toString())
            })
            
            runner.on('start', () => {
                logWrite('start')
            })
            
            let firstTime = true
            runner.on('install-deps-start', async () => {
                if (spinInterval) {
                    clearInterval(spinInterval)
                }
                ui.updateBottomBar(`installing dependancies...`)
            })
            runner.on('install-deps-complete', async () => {
                logWrite('installed dependancies')
        
                if (cfg.dev && cfg.dev['back-sync']) {
                    // ui.log.write('downloading dependancies locally')
                    fileSync.download(cfg.dev['back-sync'],{
                        client,
                        sessionId,
                    }).then(() => {
                        // ui.log.write('downloaded dependancies locally')
                    }).catch(e => {
                        // ui.log.write('error downloading dependancies locally: '+e)
                    })
                }
                
                firstTime = false
        
                liveSpinner(server.appUrl, (str) => {
                    ui.updateBottomBar(str)
                }, dbPort, server.id, server.staticContentUrl)
            })
        
            runner.on('quit', () => {
                logWrite('quit')
            })
            runner.on('restart', () => {
                // cli.log('restart due to changed files')
            })
            runner.on('crash', () => {
                // ui.log.write('crash')
            })
            runner.on('connect', () => {
                logWrite('connected to development instance')
            })
            runner.on('disconnect', () => {
                logWrite('connection to development instance lost, will reconnect...')
            })
        
            await runner.connect(server.url)
        }

        try {
            await fileSync.init({
                sessionId,
                client,
                runner,
                ultimaCfg,
                resourceName,
            }, (completed, total) => {
                if (spinInterval) {
                    clearInterval(spinInterval)
                }
                ui.updateBottomBar(`uploading files ${completed}/${total}`)
                
                if (total === completed && !runnerStarted) {
                    setTimeout(() => {
                        // start runner
                        runnerStarted = true
                        runner && runner.start({ sessionId })
                    }, 500)
                }
                if (total === completed && isInitialized) {
                    liveSpinner(server.appUrl, (str) => {
                        ui.updateBottomBar(str)
                    }, dbPort, server.id, server.staticContentUrl)
                }
            }, () => {
                isInitialized = true
            })
        } catch (e) {
            console.error('failed to init', e)
        }
    })
}

module.exports = dev
