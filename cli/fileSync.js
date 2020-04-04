const chokidar = require('chokidar')
const fs = require('fs')

const client = require('./client')

let inflight = 0
let total = 0
let completed = 0

const pushToRemote = async (event, path, sessionId, progressCallback) => {
    total++
    inflight++

    progressCallback(completed, total)

    try {
        const stream = ['add', 'change'].includes(event) ? fs.createReadStream(path) : undefined
        const res = await client.fetch(`/file`, {
            method: 'post',
            body: stream,
            headers: {
                'x-event-type': event,
                'x-event-path': path,
                'x-session-id': sessionId,
            },
        })

        const data = await res.json()
    } catch (e) {
        console.log('error pushing to remote:', event, path, e)
    }
    
    inflight--
    completed++
   
    progressCallback(completed, total)
}

const init = async ({ sessionId }, progressCallback, initCallback) => {
    const watcher = chokidar.watch('.', {
        ignored: ['node_modules', '.git'],
        persistent: true,
    })

    watcher.on('add', path => {
        pushToRemote('add', path, sessionId, progressCallback)
    })

    watcher.on('change', path => {
        pushToRemote('change', path, sessionId, progressCallback)
    })

    watcher.on('addDir', path => {
        pushToRemote('addDir', path, sessionId, progressCallback)
    })

    watcher.on('unlink', () => {
        pushToRemote('unlink', path, sessionId, progressCallback)
    })

    watcher.on('unlinkDir', () => {
        pushToRemote('unlinkDir', path, sessionId, progressCallback)
    })

    watcher.on('ready', () => {
        initCallback()
    })

    process.on('SIGINT', () => {
        console.log('shutting down...')

        Promise.all([
            watcher.close(),
            client.disconnectAll(),
        ]).then(() => {
            console.log('done')
            process.exit()
        })
    })
}

module.exports = {
    init,
}