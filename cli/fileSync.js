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

const pushToRemote = async (event, path, sessionId) => {
    console.log(path, event, 'syncing')
    const stream = event === 'add' ? fs.createReadStream(path) : null
 
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
    console.log(path, event, 'synced', data)
  
    return data
}

const init = async (config) => {
    console.log('initializing...')

    const { sessionId } = await initSession()

    const watcher = chokidar.watch('.', {
        ignored: ['node_modules', '.git'],
    })

    watcher.on('add', path => {
        pushToRemote('add', path, sessionId)
    })

    watcher.on('addDir', path => {
        pushToRemote('addDir', path, sessionId)
    })

    watcher.on('unlink', () => {
        pushToRemote('unlink', path, sessionId)
    })

    watcher.on('unlinkDir', () => {
        pushToRemote('unlinkDir', path, sessionId)
    })

    console.log('initialized')
}

module.exports = {init}

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