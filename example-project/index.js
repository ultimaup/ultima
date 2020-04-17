const http = require('http');
const { PORT } = process.env
const express = require('express')

const server = http.createServer((req, res) => {
  res.end('hello world');
});

const app = express()

app.use((req, res) => {
  res.json('hello world')
})

app.listen(PORT, () => {
  console.log('server started', PORT)
})
