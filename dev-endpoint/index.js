const http2 = require('http2')
const path = require('path')
const uuid = require('uuid').v4

const fileHandler = require('./fileHandler')
const runner = require('./runner')

const {
    PORT = 4489,
} = process.env


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
            const sessionId = uuid()
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ sessionId }))
    
            return
        }
    
        if (req.url === '/start') {
            const sessionId = req.headers['x-session-id']
            const wkdir = path.resolve('/tmp', sessionId)
            const runnerControl = runner({ wkdir }, (event, data) => {
                
            })
        }
    
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({}))
    })
    .on('error', (err) => console.error(err))
    .listen(PORT, () => {
        console.log(`ready on port ${PORT}`)
    })