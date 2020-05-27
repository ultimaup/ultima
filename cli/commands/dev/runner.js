const EventEmitter = require('events')
const io = require('socket.io-client')

class RunnerEmitter extends EventEmitter {}

const runner = () => {
    const runnerEmitter = new RunnerEmitter()

    let socket

    const connect = endpointUrl => {
        socket = io(endpointUrl)
        
        socket.on('error', (err) => {
            console.error(err)
        })

        socket.on('connect', () => {
            runnerEmitter.emit('connect')
        })

        socket.on('event', ({ event, data }) => {
            runnerEmitter.emit(event, data)
        })

        socket.on('disconnect', () => {
            runnerEmitter.emit('disconnect')
        })

        return new Promise((resolve) => {
            socket.once('connect', resolve)
        })
    }

    const start = ({ sessionId }) => {
        socket.emit('session', { sessionId })

        socket.on('disconnect', () => {
            socket.once('connect', () => {
                socket.emit('session', { sessionId })
            })
        })
    }

    runnerEmitter.on('force', (event) => {
        socket.emit('force', event)
    })

    return {
        on: (...args) => runnerEmitter.on(...args),
        connect,
        whenConnected: (cb) => {
            if (socket) {
                if (socket.connected) {
                    cb()
                } else {
                    socket.once('connect', db)
                }
            } else {
                throw new Error('tried to use socket before initialization')
            }
        },
        start,
    }

}

module.exports = runner