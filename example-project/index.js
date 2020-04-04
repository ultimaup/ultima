const http = require('http');
const { PORT } = process.env

const server = http.createServer((req, res) => {
  res.end('hello world');
});

server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
console.log('server starting 12347')
server.listen(PORT);
