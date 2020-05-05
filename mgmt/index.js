const express = require('express')

// const projects = require('./projects')
const giteaWebhook = require('./routes/giteaWebhook')
const dev = require('./dev')
const auth = require('./auth')
require('./pgproxy')

const graphql = require('./graphql')
const { ensureAllLiveDeploymentsExist } = require('./boot')

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

app.get('/', (req, res) => {
    res.redirect(`build.${req.hostname}`)
})

app.listen({ port: PORT }, () => {
    console.log(`🚀  Server ready at ${PORT}`)
    setTimeout(() => {
        ensureAllLiveDeploymentsExist().catch(console.error)
    }, 2000)
})