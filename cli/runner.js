const EventEmitter = require('events')
const client = require('./client')

class RunnerEmitter extends EventEmitter {}

const runnerEmitter = new RunnerEmitter()

let sid

const start = ({ sessionId }) => {
    sid = sessionId

    return client.fetch('/session', {
        method: 'post',
        headers: {
            'x-session-id': sessionId,
        },
    })
}

client.on('push', async ({ origin, req, getResponse }) => {
   const path = req.url

    if (path.startsWith('/session')) {
        const res = await getResponse()
        if (path.endsWith('/stdout')) {
            const readStream = await res.readable()
            readStream.on('data', data => runnerEmitter.emit('stdout', data))
        }
        if (path.endsWith('/stderr')) {
            const readStream = await res.readable()
            readStream.on('data', data => runnerEmitter.emit('stderr', data))
        }
        if (path.endsWith('/event')) {
            try {
                const { event, data } = await res.json()
                runnerEmitter.emit(event, data)
            } catch (e) {
                console.error(e)
            }
        }
    }
})

runnerEmitter.on('force', (event) => {
    client.fetch(`/session/${sessionId}/${event}`, {
        method: 'post',
    })
})

module.exports = {
    on: (...args) => runnerEmitter.on(...args),
    start,
}