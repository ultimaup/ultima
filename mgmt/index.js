const express = require('express')

const projects = require('./projects')
const gitea = require('./gitea')
const dev = require('./dev')
const migrate = require('./db/migrate')

const {
    PORT = 3000,
} = process.env

const app = express()

projects(app)
gitea(app)
dev(app)
migrate().catch(console.error)

app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
})