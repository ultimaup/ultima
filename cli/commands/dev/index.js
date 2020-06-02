const { cli } = require('cli-ux')
const { program } = require('commander')
const cliSpinners = require('cli-spinners')
const jwtdecode = require('jwt-decode')
const fse = require('fs-extra')
const chalk = require('chalk')
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

const stringToColour = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let colour = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}

const formatResourceName = (resourceName, resourceNames) => {
    const len = Math.max(...(resourceNames.map(el => el.length))) + 2
    const color = stringToColour(resourceName)

    const str = `${resourceName}${' '.repeat(len - resourceName.length)}|`

    return chalk.hex(color)(str)
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

    let ultimaYml
    if (await fse.exists('./.ultima.yml')) {
        ultimaYml = await fse.readFile('./.ultima.yml', 'utf-8')
    } else {
        return cli.error(`No .ultima.yml file found, please create one and copy/paste it here: ${program.server}/${owner}/${repoName}/_new/master/.ultima.yml`)
    }

    const ultimaCfgs = YAML.parse(ultimaYml)

    const server = await API.getDeploymentUrl(program.server, cfg.token, ultimaYml, {owner, repoName})

    if (server.status === 'error') {
        await cli.action.stop('failed')
        return cli.error(`Failed to start dev session: ${server.message}`)
    }

    await cli.action.stop()

    const [un] = server.id.split('-')[0]
    const dbPortKey = `${owner}-${repoName}-${un}-dev`

    const dbPort = server.schemaId ? await makeTunnel(server.id, token, dbPortKey) : null

    const numResources = server.servers.length
    const resourceNames = server.servers.map(s => s.resourceName)

    const {schemaId} = server

    await Promise.all(
        server.servers.map(async server => {
            const { resourceName } = server
            const namePrefix = numResources > 1
            const ultimaCfg = ultimaCfgs[resourceName]

            const logWrite = (str, isSystem) => {
                const output = namePrefix ? ui.log.write(`${formatResourceName(resourceName, resourceNames)} ${str}`) : ui.log.write(str)
                if (isSystem) {
                    return chalk.dim(output)
                } else {
                    return output
                }
            }

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
                    logWrite('installing dependencies', true)
                })
                runner.on('install-deps-complete', async () => {
                    logWrite('installed dependencies', true)
            
                    if (ultimaCfg.dev && ultimaCfg.dev['back-sync']) {
                        logWrite(`downloading ${ultimaCfg.dev['back-sync']} locally`, true)
                        fileSync.download(ultimaCfg.dev['back-sync'], ultimaCfg.directory,{
                            client,
                            sessionId,
                        }).then(() => {
                            logWrite(`downloaded ${ultimaCfg.dev['back-sync']} locally`, true)
                        }).catch(e => {
                            // ui.log.write('error downloading dependencies locally: '+e)
                        })
                    }
                })
            
                runner.on('quit', () => {
                    logWrite('quit', true)
                })
                runner.on('restart', () => {
                    logWrite('restart due to changed files', true)
                })
                runner.on('crash', () => {
                    logWrite('crashed, waiting for file change to restart', true)
                })
                runner.on('connect', () => {
                    logWrite('connected to instance', true)
                })
                runner.on('disconnect', () => {
                    logWrite('connection to instance lost, will reconnect...', true)
                })
            
                await runner.connect(server.url)
            }

            try {
                await fileSync.init({
                    sessionId,
                    client,
                    runner,
                    ultimaCfg,
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
                        ui.updateBottomBar(resourceName, `url: ${url || staticUrl}${staticUrl && url ? ` buildLocation content: ${staticUrl}` : ''}`)
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
