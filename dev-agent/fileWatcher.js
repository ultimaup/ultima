const chokidar = require('chokidar')
const got = require('got')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const stream = require('stream')

const pipeline = promisify(stream.pipeline)

const { 
    ULTIMA_TOKEN,
    ULTIMA_BUCKET_PROXY_URL,
} = process.env

const removeLeadingSlash = (str) => {
	if (str[0] === '/') {
		return str.substring(1)
	}
	return str
}

const pushToRemote = async (event, absPath, path, endpoint, token, dir) => {
    const stream = ['add', 'change'].includes(event) ? fs.createReadStream(absPath) : undefined
    console.log('pushToRemote', event, absPath, path, endpoint, 'token', dir)
    const headers = {
        'x-event-type': event,
        'x-event-path': removeLeadingSlash(path.split(dir).join('')),
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

const watchDir = ({dir, wkdir}, endpoint = ULTIMA_BUCKET_PROXY_URL, token = ULTIMA_TOKEN) => {
    const watcher = chokidar.watch(path.resolve(wkdir, dir), {
        ignored: ['node_modules', '.git'],
        persistent: true,
    })

    watcher.on('add', path => {
        pushToRemote('add', path, path.split(wkdir)[1], endpoint, token, dir)
    })

    watcher.on('change', path => {
        pushToRemote('change', path, path.split(wkdir)[1], endpoint, token, dir)
    })

    watcher.on('addDir', path => {
        pushToRemote('addDir', path, path.split(wkdir)[1], endpoint, token, dir)
    })

    watcher.on('unlink', path => {
        pushToRemote('unlink', path, path.split(wkdir)[1], endpoint, token, dir)
    })

    watcher.on('unlinkDir', path => {
        pushToRemote('unlinkDir', path, path.split(wkdir)[1], endpoint, token, dir)
    })

    watcher.on('ready', () => {
        console.log('syncing', dir, 'to', endpoint)
    })
}

module.exports = watchDir