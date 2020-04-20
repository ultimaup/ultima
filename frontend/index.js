const express = require('express')
const path = require('path')
const {
    PORT,
} = process.env

const app = express()

app.use(express.static('build'))
app.use('/assets',express.static('build'))
app.use((req, res, next) => {
    return res.sendFile(path.resolve('./build/index.html'))
});
app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
})
