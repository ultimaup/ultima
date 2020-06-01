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

const removeLeadingSlash = (str) => {
	if (str[0] === '/') {
		return str.substring(1)
	}
	return str
}

const pushToRemote = async (event, absPath, path, endpoint, token) => {
    const stream = ['add', 'change'].includes(event) ? fs.createReadStream(absPath) : undefined
    const headers = {
        'x-event-type': event,
        'x-event-path': removeLeadingSlash(path),
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
    const watcher = chokidar.watch(dir, {
        ignored: ['node_modules', '.git'],
        persistent: true,
    })

    watcher.on('add', path => {
        pushToRemote('add', path, path.split(wkdir)[1], endpoint, token)
    })

    watcher.on('change', path => {
        pushToRemote('change', path, path.split(wkdir)[1], endpoint, token)
    })

    watcher.on('addDir', path => {
        pushToRemote('addDir', path, path.split(wkdir)[1], endpoint, token)
    })

    watcher.on('unlink', path => {
        pushToRemote('unlink', path, path.split(wkdir)[1], endpoint, token)
    })

    watcher.on('unlinkDir', path => {
        pushToRemote('unlinkDir', path, path.split(wkdir)[1], endpoint, token)
    })

    watcher.on('ready', () => {
        console.log('syncing', dir, 'to', endpoint)
    })
}

module.exports = watchDir