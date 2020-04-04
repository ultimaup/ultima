const http2 = require('http2')
const path = require('path')
const uuid = require('uuid').v4

const fileHandler = require('./fileHandler')
const runner = require('./runner')

const {
    PORT = 4489,
} = process.env

const sessions = {}

// TODO: check if they're still connected
const onRunnerEvent = (sessionId, stream, event, data) => {
    console.log({
        sessionId, event, data
    })
    if (stream.destroyed) {
        return null
    }
    stream.pushStream({ ':path': `/session/${sessionId}/event` },
        (err, pushStream, headers) => {
            if (err) {
                console.error(err)
            } else {
                pushStream.respond({ ':status': 200, 'content-type': 'application/json' })
                pushStream.end(JSON.stringify({ event, data }))
            }
        })
}

http2
    .createServer((req, res) => {
        if (req.url === '/file') {
            fileHandler(
                req.headers['x-event-type'],
                req.headers['x-event-path'],
                req.headers['x-session-id'],
                req,
            ).then((result) => {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ status: 'success', data: result }))
            }).catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                console.error(err)
                res.end(JSON.stringify({ error: err, status: 'error' }))
            })
    
            return
        }
    
        if (req.url === '/new-session') {
            const sessionId = 'static-session-id'
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ sessionId }))
    
            return
        }

        if (req.url.startsWith('/session/')) {
            const sessionId = req.url.split('/session/')[1].split('/')[0]
            const command = req.url.split(sessionId)[1]
            if (sessions[sessionId]) {
                sessions[sessionId].emit(command)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true }))
                return
            }
        }

        if (!['/session'].includes(req.url)) {
            res.writeHead(404, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({}))
        }
    })
    .on('stream', (stream, headers) => {
        if (headers[':path'] === '/session') {
            stream.respond({ ':status': 200 })
            const sessionId = headers['x-session-id']
            const wkdir = path.resolve('/tmp', sessionId)
            let gone = false

            // TODO handle connection drops properly etc.
            stream.on('close', () => {
                console.log('user went away :(')
                gone = true
            })

            stream.on('aborted', () => {
                console.log('i got aborted :(')
                gone = true
            })
            
            if (!sessions[sessionId]) {
                 // TODO do npm install
                sessions[sessionId] = runner({ wkdir })
            }

            const session = sessions[sessionId]
            session.on('start', data => {
                onRunnerEvent(sessionId, stream, 'start', data)
            })
            session.on('quit', data => {
                onRunnerEvent(sessionId, stream, 'quit', data)
            })
            session.on('restart', data => {
                onRunnerEvent(sessionId, stream, 'restart', data)
            })
            session.on('crash', data => {
                onRunnerEvent(sessionId, stream, 'crash', data)
            })

            session.on('readable', function() {
                stream.pushStream({ ':path': `/session/${sessionId}/stdout` }, (err, pushStream, headers) => {
                    if (err) {
                        console.error(err)
                    } else {
                        this.stdout.pipe(pushStream)
                    }
                })
                
                stream.pushStream({ ':path': `/session/${sessionId}/stderr` }, (err, pushStream, headers) => {
                    if (err) {
                        console.error(err)
                    } else {
                        this.stderr.pipe(pushStream)
                    }
                })
            })
        }

        stream.on('error', (error) => console.error(error))
    })
    .on('error', (err) => console.error(err))
    .listen(PORT, () => {
        console.log(`ready on port ${PORT}`)
    })