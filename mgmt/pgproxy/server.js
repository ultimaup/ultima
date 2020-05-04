const net = require('net')
const tls = require('tls')
const crypto = require('crypto')
const Writer = require('buffer-writer')

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

const passwordPacket = password => {
    const code = 0x70
    const writer = new Writer()
    writer.addCString(password)
    return writer.flush(code)
}

const md5 = function (string) {
    return crypto.createHash('md5').update(string, 'utf-8').digest('hex')
}

// See AuthenticationMD5Password at https://www.postgresql.org/docs/current/static/protocol-flow.html
const postgresMd5PasswordHash = function (user, password, salt) {
    const inner = md5(password + user)
    const outer = md5(Buffer.concat([Buffer.from(inner), salt]))
    return 'md5' + outer
}

const getSalt = buf => {
    const offset = 9
    const salt = Buffer.alloc(4)
    buf.copy(salt, 0, offset, offset + 4)

    return salt
}

const server = ({ host, port, database, user, secure }) => net.createServer((socket) => {
    let dbClient

    socket.once('data', () => {
        dbClient = (secure ? tls : net).createConnection(port, host, () => {
            dbClient.write(startupPacket({ user, database }))

            dbClient.pipe(socket)
            socket.pipe(dbClient)
        })
    })

    socket.on('end', () => dbClient && dbClient.end())
})

const parseInitialPacket = buf => {
    const str = buf.toString()
    const parts = str.split('\u0000').filter(Boolean)
    const packet = {}
    parts.forEach((v,k) => {
        if (k % 2) {
            // key
            packet[parts[k - 1]] = v
        } else {
            // value
            packet[v] = null
        }
    })
    console.log(packet)
    return packet
}

const serverWithMiddleware = (getConnectionDetails) => net.createServer((socket) => {
    let dbClient
    console.log('pgbroker connection')

    socket.once('data', async (initialPacket) => {
        try {
            console.log(initialPacket)
            const { host, port, database, user, password } = await getConnectionDetails(parseInitialPacket(initialPacket))

            dbClient = net.createConnection(port, host, () => {
                dbClient.write(startupPacket({ user, database }))
            })

            dbClient.once('data', (buf) => {
                const salt = getSalt(buf)
                dbClient.write(passwordPacket(postgresMd5PasswordHash(user, password, salt)))

                dbClient.pipe(socket)
                socket.pipe(dbClient)
            })

            dbClient.on('data', buf => {
                console.log(buf.toString())
            })
        } catch (e) {
            console.error(`pgbroker connection failed: `, e)
            socket.end()
        }
    })

    socket.on('end', () => dbClient && dbClient.end())
})

module.exports = {
    server,
    serverWithMiddleware,
}