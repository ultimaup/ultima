const express = require('express')
const {
    PORT,
} = process.env

const app = express()

app.use(express.static('build'))

app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
})