const spdy = require('spdy')
const path = require('path')
const socketIO = require('socket.io')

const fileHandler = require('./fileHandler')
const runner = require('./runner')
const { installDeps, shouldRunInstallDeps } = require('./installDeps')

const {
    PORT = 4489,
} = process.env

const sessions = {}

let io

const server = spdy
    .createServer({ spdy: { plain: true, ssl: false, protocols: ['h2', 'http'] } }, (req, res) => {
        console.log('got request', req.url)
        if (req.url === '/file') {
            const filePath = req.headers['x-event-path']
            const sessionId = req.headers['x-session-id']
            fileHandler(
                req.headers['x-event-type'],
                filePath,
                sessionId,
                req,
            ).then(async (result) => {
                const wkdir = path.resolve('/tmp', sessionId)
                if (await shouldRunInstallDeps(filePath, wkdir)) {
                    const wkdir = path.resolve('/tmp', sessionId)
                    io.to(sessionId).emit('event', {
                        event: 'install-deps-start',
                    })
                    await installDeps(wkdir)
                    io.to(sessionId).emit('event', {
                        event: 'install-deps-complete',
                    })
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ status: 'success', data: result }))
            }).catch(err => {
                console.error(err)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: err, status: 'error' }))
            })
    
            return
        }

        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(true))
    
            return
        }

        if (req.url === '/new-session') {
            const sessionId = 'static-session-id'
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ sessionId }))
    
            return
        }

        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({}))
    })
    .on('error', (err) => console.error(err))

io = socketIO(server)

const createSession = async sessionId => {
    const wkdir = path.resolve('/tmp', sessionId)

    io.to(sessionId).emit('event', {
        event: 'install-deps-start',
    })
    // install deps
    await installDeps(wkdir, true, (msg) => {
        io.to(sessionId).emit('event',{
            event: 'stdout',
            data: msg.toString('utf8'),
        })
    })
    io.to(sessionId).emit('event', {
        event: 'install-deps-complete',
    })

    const session = await runner({ wkdir })

    session.on('message', ({ type }) => {
        io.to(sessionId).emit('event', {
            event: type,
        })
    })

    session.stdout.on('data', (msg) => {
        console.log(msg.toString('utf8'))
        io.to(sessionId).emit('event',{
            event: 'stdout',
            data: msg.toString('utf8'),
        })
    })

    session.stderr.on('data', (msg) => {
        console.error(msg.toString('utf8'))
        io.to(sessionId).emit('event',{
            event: 'stderr',
            data: msg.toString('utf8'),
        })
    })

    return session
}

let connections = 0
let dieTimeout

io.on('connection', (socket) => {
    console.log('socket connection')
    connections++

    if (dieTimeout) {
        clearTimeout(dieTimeout)
    }

    socket.on('session', async ({ sessionId }) => {
        console.log(sessionId, 'session start')
        socket.join(sessionId)

        // TODO handle connection drops properly etc.

        if (!sessions[sessionId]) {
            console.log(sessionId, 'creating session')
            sessions[sessionId] = createSession(sessionId)
        }

        await sessions[sessionId]

        socket.on('force', command => {
            sessions[sessionId].emit(command)
        })
    })

    socket.on('disconnect', () => {
        connections--
        if (connections === 0) {
            dieTimeout = setTimeout(() => {
                console.log('dying due to lack of attention :(')
                process.exit()
            }, 1000 * 60)
        }
    })
})

dieTimeout = setTimeout(() => {
    if (connections === 0) {
        console.log('dying due to lack of attention :(')
        process.exit()
    }
}, 1000 * 60)

server.listen(PORT, () => {
    console.log(`ready on port ${PORT}`)
})
