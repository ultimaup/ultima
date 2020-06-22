const { PORT } = process.env
const express = require('express')

const app = express()

app.get('/health', (req, res) => {
  res.json('healthcheck passed!')
})

app.use((req, res) => {
  res.json('hello world')
})

app.listen(PORT, () => {
  console.log('server started', PORT)
})
