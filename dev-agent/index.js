const spdy = require('spdy')
const path = require('path')
const socketIO = require('socket.io')
const YAML = require('yaml')
const express = require('express')
const bodyParser = require('body-parser')

const fileHandler = require('./fileHandler')
const runner = require('./runner')
const { installDeps, shouldRunInstallDeps, downloadDir } = require('./installDeps')
const fileWatcher = require('./fileWatcher')

const {
    PORT = 4489,
} = process.env

const sessions = {}
const sessionConfigs = {}

let io

const options = { spdy: { plain: true, ssl: false, protocols: ['h2', 'http'] } }
const app = express()

app.post('/file', async (req, res) => {
    const filePath = req.headers['x-event-path']
    const sessionId = req.headers['x-session-id']
    const cfg = sessionConfigs[sessionId]

    const result = await fileHandler(
        req.headers['x-event-type'],
        filePath,
        sessionId,
        req,
    )
    
    if (shouldRunInstallDeps(filePath, cfg)) {
        const wkdir = path.resolve('/tmp', sessionId, cfg.directory || '')
        io.to(sessionId).emit('event', {
            event: 'install-deps-start',
        })
        await installDeps(wkdir, cfg, (msg) => {
            io.to(sessionId).emit('event',{
                event: 'stdout',
                data: msg.toString('utf8'),
            })
        })
        io.to(sessionId).emit('event', {
            event: 'install-deps-complete',
        })
    }

    if (runner.shouldRestart(filePath, cfg)) {
        const session = sessions[sessionId]
        if (session) {
            session.emit('restart')
        } else {
            console.error('tried to restart but no session', session)
        }
    }

    res.json({
        status: 'success', data: result
    })
})

app.get('/health', (req, res) => {
    res.json(true)
})

app.post('/new-session', bodyParser.json(), (req, res) => {
    const sessionId = 'static-session-id'
    const { ultimaCfg } = req.body
    sessionConfigs[sessionId] = ultimaCfg ? YAML.parse(ultimaCfg)[process.env.ULTIMA_RESOURCE_NAME] : {}
    console.log('using config', sessionConfigs[sessionId])

    res.json({
        sessionId,
    })
})

app.all('/download/*', (req, res) => {
    const sessionId = req.headers['x-session-id']
    const cfg = sessionConfigs[sessionId]
    const wkdir = path.resolve('/tmp', sessionId, cfg.directory || '')

    const stream = downloadDir(wkdir, req.url.split('/download/')[1])
    return stream.pipe(res)
})

const server = spdy.createServer(options, app)

io = socketIO(server)

const repoRelative = (loc) => {
	return path.resolve('/', loc).substring(1)
}

const createSession = async sessionId => {
    const cfg = sessionConfigs[sessionId]
    const wkdir = path.resolve('/tmp', sessionId, cfg.directory || '')

    io.to(sessionId).emit('event', {
        event: 'install-deps-start',
    })
    // install deps
    await installDeps(wkdir, cfg, (msg) => {
        io.to(sessionId).emit('event',{
            event: 'stdout',
            data: msg.toString('utf8'),
        })
    })
    io.to(sessionId).emit('event', {
        event: 'install-deps-complete',
    })

    const session = runner.start({ wkdir, cfg })

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

    if (cfg.buildLocation) {
        const buildLocationPath = path.resolve('.', repoRelative(cfg.buildLocation))
        fileWatcher(buildLocation)
        // watch cfg.buildLocation
        // upload files to 
    }

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
            sessions[sessionId] = await createSession(sessionId)
        }

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
