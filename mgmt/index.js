const express = require('express')

const projects = require('./projects')
const gitea = require('./gitea')

const {
    PORT = 3000,
} = process.env

const app = express()

projects(app)
gitea(app)

app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
})