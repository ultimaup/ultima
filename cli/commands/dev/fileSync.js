const chokidar = require('chokidar')
const fs = require('fs')
const stream = require('stream')
const promisify = require('util').promisify
const tar = require('tar-fs')
const p = require('path')
const gunzip = require('gunzip-maybe')

const pipeline = promisify(stream.pipeline)

const apiClient = require('./client')

const repoRelative = (...loc) => {
	return p.resolve('/', ...loc).substring(1)
}
const removeLeadingSlash = (str) => {
	if (str[0] === '/') {
		return str.substring(1)
	}
	return str
}

const FileSync = () => {

    let inflight = 0
    let total = 0
    let completed = 0

    const pushToRemote = (event, path, sessionId, progressCallback, got, runner, directory,fullPath) => {
        const p = (directory && !fullPath) ? (path.split(directory)[1] || '.') : path
        
        const whenConnectedCallback = async () => {
            total++
            inflight++

            progressCallback(completed, total)

            try {
                const stream = ['add', 'change'].includes(event) ? fs.createReadStream(path) : undefined
                const headers = {
                    'x-event-type': event,
                    'x-event-path': p,
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

    const init = async ({ sessionId, client, runner, ultimaCfg }, progressCallback, initCallback) => {
        const dontSync = (ultimaCfg && ultimaCfg.dev && ultimaCfg.dev['sync-ignore']) || []

        const watchDir = ultimaCfg && ultimaCfg.directory
        const fullPath = !!runner

        const watcher = chokidar.watch(watchDir || '.', {
            ignored: [...dontSync.map(ds => watchDir ? `${watchDir}/${ds}` : ds), '**/node_modules', '.git'],
            persistent: true,
        })

        let directory = watchDir
        if (!fullPath && ultimaCfg.buildLocation) {
            directory = repoRelative(directory || '', removeLeadingSlash(ultimaCfg.buildLocation))
        }

        watcher.on('add', path => {
            pushToRemote('add', path, sessionId, progressCallback, client, runner, directory,fullPath)
        })

        watcher.on('change', path => {
            pushToRemote('change', path, sessionId, progressCallback, client, runner, directory,fullPath)
        })

        watcher.on('addDir', path => {
            pushToRemote('addDir', path, sessionId, progressCallback, client, runner, directory,fullPath)
        })

        watcher.on('unlink', path => {
            pushToRemote('unlink', path, sessionId, progressCallback, client, runner, directory,fullPath)
        })

        watcher.on('unlinkDir', path => {
            pushToRemote('unlinkDir', path, sessionId, progressCallback, client, runner, directory,fullPath)
        })

        watcher.on('ready', () => {
            initCallback()
        })

        process.on('SIGINT', () => {
            Promise.all([
                watcher.close(),
                apiClient.disconnectAll(),
            ]).then(() => {
                console.log('\nShutting down...')
                console.log('\nThank you for using Ultima')
                process.exit()
            })
        })
    }

    const download = (path, dir, { client, sessionId }) => {
        return pipeline(
            client.stream.get(`download/${path}`, {
                headers: {
                    'x-session-id': sessionId,
                },
            }),
            gunzip(),
            tar.extract(p.resolve('.', dir || '', path))
        )
    }

    return {
        init,
        download,
    }
}

module.exports = FileSync