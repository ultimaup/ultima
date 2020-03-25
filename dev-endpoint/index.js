const http2 = require('http2')
const fse = require('fs-extra')
const path = require('path')
const uuid = require('uuid').v4

const {
    PORT = 4489,
} = process.env

const fileHandler = async (type, location, sessionId, stream) => {
    console.log(sessionId, type, location)
    const wkdir = path.resolve('/tmp', sessionId)
    const absPath = path.resolve(wkdir, location)

    if (location === '.') {
        return true
    }

    switch (type) {
        case 'add':
        case 'change':
            // ensure dir exists (fse doesn't do this for us)
            await fse.ensureDir(path.resolve(absPath, '..'))
            
            // pipe stream to path
            const writeStream = fse.createWriteStream(absPath)
            stream.pipe(writeStream)
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve)
                writeStream.on('error', reject)
            })
            break
        case 'addDir':
            // ensure dir exists for path
            await fse.ensureDir(absPath)
            break
        case 'unlink':
            // delete file at path
            await fse.remove(absPath)
            break
        case 'unlinkDir':
            // delete dir at path
            await fse.remove(absPath)
            break
    }

    console.log(sessionId, type, location)

    return true
}

const handler = (req, res) => {
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
        const sessionId = uuid()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ sessionId }))

        return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({}))
}

http2
    .createServer(handler)
    .on('error', (err) => console.error(err))
    .listen(PORT, () => {
        console.log(`ready on port ${PORT}`)
    })