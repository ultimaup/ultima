const chokidar = require('chokidar')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const tar = require('tar-fs')
const p = require('path')
const gunzip = require('gunzip-maybe')

const pipeline = promisify(stream.pipeline)

const runner = require('./runner')
const apiClient = require('./client')

let inflight = 0
let total = 0
let completed = 0

const pushToRemote = (event, path, sessionId, progressCallback, got) => {
    runner.whenConnected(async () => {
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
    })
}

const init = async ({ sessionId, client }, progressCallback, initCallback) => {
    const watcher = chokidar.watch('.', {
        ignored: ['node_modules', '.git'],
        persistent: true,
    })

    watcher.on('add', path => {
        pushToRemote('add', path, sessionId, progressCallback, client)
    })

    watcher.on('change', path => {
        pushToRemote('change', path, sessionId, progressCallback, client)
    })

    watcher.on('addDir', path => {
        pushToRemote('addDir', path, sessionId, progressCallback, client)
    })

    watcher.on('unlink', path => {
        pushToRemote('unlink', path, sessionId, progressCallback, client)
    })

    watcher.on('unlinkDir', path => {
        pushToRemote('unlinkDir', path, sessionId, progressCallback, client)
    })

    watcher.on('ready', () => {
        initCallback()
    })

    process.on('SIGINT', () => {
        console.log('\nshutting down...')

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

module.exports = {
    init,
    download,
}