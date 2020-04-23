const express = require('express')

// const projects = require('./projects')
const giteaWebhook = require('./routes/giteaWebhook')
const dev = require('./dev')
const auth = require('./auth')

const graphql = require('./graphql')

const migrate = require('./db/migrate')

const {
    PORT = 3000,
} = process.env

const app = express()

// projects(app)
giteaWebhook(app)
auth(app)
dev(app)
migrate().catch(console.error)
graphql(app)

app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
})