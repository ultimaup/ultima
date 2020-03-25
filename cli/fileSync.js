const chokidar = require('chokidar')
const { context } = require('fetch-h2')
const fs = require('fs')

let rootEndpoint

const { fetch, disconnectAll, onPush } = context()

onPush((origin, req, getResponse) => {
    
})

const initSession = async () => {
    const res = await fetch(`${rootEndpoint}/new-session`, {
        method: 'post',
    })
    
    return await res.json()
}

let inflight = 0
let total = 0
let completed = 0

const pushToRemote = async (event, path, sessionId, progressCallback) => {
    total++
    inflight++

    progressCallback(completed, total)

    try {
        const stream = event === 'add' ? fs.createReadStream(path) : undefined
        const res = await fetch(`${rootEndpoint}/file`, {
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
        console.error(event, path, e)
    }
    
    inflight--
    completed++
   
    progressCallback(completed, total)
}

const init = async (config, progressCallback, initCallback) => {
    rootEndpoint = config.rootEndpoint

    const { sessionId } = await initSession()

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
            disconnectAll(),
        ]).then(() => {
            console.log('done')
            process.exit()
        })
    })
}

module.exports = {
    init,
}