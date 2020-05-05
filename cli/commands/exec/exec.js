const io = require('socket.io-client')
const { program } = require('commander')
const EventEmitter = require('events')

const exec = async (token, { id, cmd }) => {
    const stdout = new EventEmitter()
    const stdin = new EventEmitter()

    const socket = io(program.server, { path: '/ws/container' })

    const wkDir = id.split('-')[1] === 'dev' ? '/tmp/static-session-id' : '/app'

    socket.on('readable', reqId => {
        stdin.emit('readable')
        socket.on('stdout', ({ requestId, buf }) => {
            if (requestId === reqId) {
                stdout.emit('data', buf)
            }
        })
        
        stdin.on('data', buf => {
            socket.emit('stdin', { requestId: reqId, buf })
        })

        socket.on('ended', () => {
            stdout.emit('ended')
        })
    })

    socket.once('auth', authed => {
        if (authed) {
            socket.emit('exec', { deploymentId: id, cmd, wkDir })
        } else {
            console.error('exec auth failed')
        }
    })

    socket.on('connect', () => {
        socket.emit('auth', { token })
    })

    socket.on('error', console.error)
    socket.on('exec-error', (e) => {
        console.error(e || 'error executing command')
        socket.disconnect()
    })

    await new Promise((resolve) => {
        socket.once('connect', resolve)
    })

    return {
        stdout,
        stdin,
    }
}

module.exports = exec