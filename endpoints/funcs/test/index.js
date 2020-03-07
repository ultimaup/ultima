const http = require('http')

const requestListener = function (req, res) {
  res.writeHead(200)
  res.end('Hello, World!')
}

const server = http.createServer(requestListener)
server.listen(process.env.PORT)

console.log('hello world ' + JSON.stringify(process.env))