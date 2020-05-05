const net = require('net')
const tls = require('tls')
const Writer = require('buffer-writer')
const Reader = require('buffer-reader')

const startupPacket = ({ user, database }) => {
    const config = {
        user,
        database,
    }
    const w = new Writer()
    const writer = w.addInt16(3).addInt16(0)

    Object.keys(config).forEach(function (key) {
        const val = config[key]
        writer.addCString(key).addCString(val)
    })

    writer.addCString('client_encoding').addCString("'utf-8'")

    const bodyBuffer = writer.addCString('').flush()

    const length = bodyBuffer.length + 4

    const buffer = new Writer().addInt32(length).add(bodyBuffer).join()
    return buffer
}

const isSslPacket = (buf) => {
    const reader = new Reader(buf)
    const len = reader.nextInt32BE()
    if (len === 8) {
        const int = reader.nextInt32BE()
        return int === 80877103
    }

    return false
}

const server = ({ host, port, database, user, secure }) => net.createServer((socket) => {
    let dbClient

    const gotStartupPacket = () => {
        dbClient = (secure ? tls : net).createConnection(port, host, () => {
            dbClient.write(startupPacket({ user, database }))
            dbClient.pipe(socket)
            socket.pipe(dbClient)
        })
    }

    socket.once('data', (buf) => {
        if (isSslPacket(buf)) {
            socket.write('N') // decline SSL negotiation
            socket.once('data', gotStartupPacket)
        } else {
            gotStartupPacket()
        }
    })

    socket.on('end', () => dbClient && dbClient.end())
})

module.exports = server