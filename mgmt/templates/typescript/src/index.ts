import express from 'express'

const { PORT } = process.env

const app = express()

app.use((req, res) => {
  res.json('hello world')
})

app.listen(PORT, () => {
  console.log('server started!!!', PORT)
})
