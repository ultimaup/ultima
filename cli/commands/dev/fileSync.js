const chokidar = require('chokidar')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const tar = require('tar-fs')
const p = require('path')
const gunzip = require('gunzip-maybe')

const pipeline = promisify(stream.pipeline)

const apiClient = require('./client')

const FileSync = () => {

    let inflight = 0
    let total = 0
    let completed = 0

    const pushToRemote = (event, path, sessionId, progressCallback, got, runner) => {
        const whenConnectedCallback = async () => {
            total++
            inflight++

            progressCallback(completed, total)

            try {
                const stream = ['add', 'change'].includes(event) ? fs.createReadStream(path) : undefined
                const headers = {
                    'x-event-type': event,
                    'x-event-path': path,
                    'x-session-id': sessionId,
                }
                if (stream) {
                    await pipeline(
                        stream,
                        got.stream.post(`file`, {
                            headers,
                        })
                    )
                } else {
                    await got.post('file', {
                        headers,
                    })
                }
            } catch (e) {
                console.error('error pushing to remote:', event, path, e)
            }
            
            inflight--
            completed++
        
            progressCallback(completed, total)
        }
        runner ? runner.whenConnected(whenConnectedCallback) : whenConnectedCallback().catch(console.error)
    }

    const init = async ({ sessionId, client, runner, ultimaCfg, resourceName }, progressCallback, initCallback) => {
        const dontSync = (ultimaCfg[resourceName] && ultimaCfg[resourceName].dev && ultimaCfg[resourceName].dev['sync-ignore']) || []

        const directory = (ultimaCfg[resourceName] && ultimaCfg[resourceName].directory)

        const watcher = chokidar.watch(directory || '.', {
            ignored: [...dontSync.map(ds => directory ? `${directory}/${ds}` : ds), '**/node_modules', '.git'],
            persistent: true,
        })

        watcher.on('add', path => {
            const p = directory ? path.split(directory)[1] : path
            pushToRemote('add', p, sessionId, progressCallback, client, runner)
        })

        watcher.on('change', path => {
            const p = directory ? path.split(directory)[1] : path
            pushToRemote('change', p, sessionId, progressCallback, client, runner)
        })

        watcher.on('addDir', path => {
            const p = directory ? path.split(directory)[1] : path
            pushToRemote('addDir', p, sessionId, progressCallback, client, runner)
        })

        watcher.on('unlink', path => {
            const p = directory ? path.split(directory)[1] : path
            pushToRemote('unlink', p, sessionId, progressCallback, client, runner)
        })

        watcher.on('unlinkDir', path => {
            const p = directory ? path.split(directory)[1] : path
            pushToRemote('unlinkDir', p, sessionId, progressCallback, client, runner)
        })

        watcher.on('ready', () => {
            initCallback()
        })

        process.on('SIGINT', () => {
            Promise.all([
                watcher.close(),
                apiClient.disconnectAll(),
            ]).then(() => {
                console.log('done')
                process.exit()
            })
        })
    }

    const download = (path, { client, sessionId }) => {
        return pipeline(
            client.stream.get(`download/${path}`, {
                headers: {
                    'x-session-id': sessionId,
                },
            }),
            gunzip(),
            tar.extract(p.resolve('.', path))
        )
    }

    return {
        init,
        download,
    }
}

module.exports = FileSync