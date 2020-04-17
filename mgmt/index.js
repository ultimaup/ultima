const express = require('express')

const projects = require('./projects')
const {router: gitea} = require('./gitea')
const dev = require('./dev')
const auth = require('./auth')

const migrate = require('./db/migrate')

const {
    PORT = 3000,
} = process.env

const app = express()

projects(app)
gitea(app)
auth(app)
dev(app)
migrate().catch(console.error)

app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
})