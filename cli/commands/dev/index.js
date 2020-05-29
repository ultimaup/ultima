const { cli } = require('cli-ux')
const { program } = require('commander')
const cliSpinners = require('cli-spinners')
const jwtdecode = require('jwt-decode')
const fse = require('fs-extra')
const YAML = require('yaml')

const apiClient = require('./client')
const FileSync = require('./fileSync')
const Runner = require('./runner')
const API = require('./api')

const UI = require('./ui')

const config = require('../../config')
const checkInUltimaFolder = require('../up/checkInUltimaFolder')
const makeTunnel = require('../db/makeTunnel')
const getRepoName = require('./getRepoName')

const liveSpinner = (writeFrame) => {
    const spinner = cliSpinners.dots

    let ctr = 0

    return setInterval(() => {
        const idx = (ctr % (spinner.frames.length - 1))
        const frame = spinner.frames[idx]

        writeFrame(frame)

        ctr++
    }, spinner.interval)
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
        await cli.action.stop('failed')
        return cli.error(`Failed to start dev session: ${server.message}`)
    }

    await cli.action.stop()

    const [un] = server.id.split('-')[0]
    const dbPortKey = `${owner}-${repoName}-${un}-dev`
    
    const dbPort = server.schemaId ? await makeTunnel(server.id, token, dbPortKey) : null

    const numResources = server.servers.length

    const parsedYML = YAML.parse(ultimaCfg)

    const {schemaId} = server

    await Promise.all(
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

            const fileSync = FileSync()

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

                runner.on('install-deps-start', async () => {
                    if (spinInterval) {
                        clearInterval(spinInterval)
                    }
                    logWrite('installing dependencies')
                })
                runner.on('install-deps-complete', async () => {
                    logWrite('installed dependencies')
            
                    if (cfg.dev && cfg.dev['back-sync']) {
                        // ui.log.write('downloading dependencies locally')
                        fileSync.download(cfg.dev['back-sync'],{
                            client,
                            sessionId,
                        }).then(() => {
                            // ui.log.write('downloaded dependencies locally')
                        }).catch(e => {
                            // ui.log.write('error downloading dependencies locally: '+e)
                        })
                    }
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
                    ui.updateBottomBar(resourceName, `uploading files ${completed}/${total}`)

                    if (total === completed && !runnerStarted) {
                        setTimeout(() => {
                            if (runner && !runnerStarted) {
                                // start runner
                                runnerStarted = true
                                runner.start({ sessionId })
                            }
                        }, 500)
                    }
                    if (total === completed && isInitialized) {
                        const { appUrl, staticContentUrl } = server
                        let url = (appUrl && appUrl.endsWith(':443')) ? appUrl.split(':443')[0] : appUrl
                        let staticUrl = (staticContentUrl && staticContentUrl.endsWith(':443')) ? staticContentUrl.split(':443')[0] : staticContentUrl
                        ui.updateBottomBar(resourceName, `url: ${url || staticUrl}${staticUrl && url ? `buildLocation content: ${staticUrl}` : ''}`)
                    }
                }, () => {
                    isInitialized = true
                })
            } catch (e) {
                console.error('failed to init', e)
            }
        })
    )

    ui.updateBottomBar('Postgres DB', `host: localhost:${dbPort} database: ${schemaId}`)
    liveSpinner((str) => {
        ui.updateBottomBar('', `Watching for changes ${str}`)
    })
}

module.exports = dev
