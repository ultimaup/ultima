const express = require('express')
const uuid = require('uuid').v4
const { ensureContainerForDeployment } = require('./containers')

const {
    PORT = 3001,
} = process.env

const app = express()

app.get('/ensure-deployment/:deploymentId', async (req, res) => {
    const requestId = uuid()
    const { deploymentId } = req.params

    let container
    try {
        container = await ensureContainerForDeployment({ requestId }, deploymentId)
    } catch (e) {
        console.error(e)
    }
    if (container) {
        res.json(container)
    } else {
        res.status(404).json(null)
    }
})

app.listen(PORT, (err) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}

    console.log(`🚀  Server ready at ${PORT}`)
})