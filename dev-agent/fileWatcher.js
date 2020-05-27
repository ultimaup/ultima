const chokidar = require('chokidar')
const got = require('got')
const fs = require('fs')
const { promisify } = require('util')
const stream = require('stream')

const pipeline = promisify(stream.pipeline)

const { 
    ULTIMA_TOKEN,
    ULTIMA_BUCKET_PROXY_URL,
} = process.env

const pushToRemote = async (event, path, endpoint, token) => {
    const stream = ['add', 'change'].includes(event) ? fs.createReadStream(path) : undefined
    const headers = {
        'x-event-type': event,
        'x-event-path': path,
        authorization: `Bearer ${token}`,
    }

    if (stream) {
        await pipeline(
            stream,
            got.stream.post(`file`, {
                headers,
                prefixUrl: endpoint,
            })
        )
    }
}

const watchDir = (dir, endpoint = ULTIMA_BUCKET_PROXY_URL, token = ULTIMA_TOKEN) => {
    const watcher = chokidar.watch(dir, {
        ignored: ['node_modules', '.git'],
        persistent: true,
    })

    watcher.on('add', path => {
        pushToRemote('add', path, endpoint, token)
    })

    watcher.on('change', path => {
        pushToRemote('change', path, endpoint, token)
    })

    watcher.on('addDir', path => {
        pushToRemote('addDir', path, endpoint, token)
    })

    watcher.on('unlink', path => {
        pushToRemote('unlink', path, endpoint, token)
    })

    watcher.on('unlinkDir', path => {
        pushToRemote('unlinkDir', path, endpoint, token)
    })

    watcher.on('ready', () => {
        console.log('watching', dir)
    })
}

module.exports = watchDir