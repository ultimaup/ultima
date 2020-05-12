const app = require('express')();
const server = require('http').Server(app)
const io = require('socket.io')(server, { path: '/ws/container' })
const uuid = require('uuid').v4
const got = require('got')

const Deployment = require('./db/Deployment')
const { ensureContainerForDeployment, removeContainerFromDeployment, exec, listContainers } = require('./containers')

const {
    PORT = 3001,
    MGMT_ENDPOINT,
} = process.env

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
        console.log(`got container ${JSON.stringify(container)} for deploying ${deploymentId}`)
        res.json(container)
    } else {
        res.status(404).json(null)
    }
})

app.post('/remove-deployment/:deploymentId', async (req, res) => {
    const requestId = uuid()
    const { deploymentId } = req.params

    let removedContainer 
    try {
        removedContainer = await removeContainerFromDeployment({ requestId }, deploymentId)
    } catch (e) {
        console.error(e)
    }
    if (removedContainer) {
        res.json(removedContainer)
    } else {
        res.json(null)
    }
})

const tokenValid = async (token) => {
    return got.get(`${MGMT_ENDPOINT}/auth/me`, {
        headers: {
            authorization: `Bearer ${token}`,
        },
    }).json()
}

// TODO make this http2 when traefik supports http2 push
io.on('connection', (socket) => {
    console.log('socket connection')
    socket.on('auth', async ({ token }) => {
        const user = await tokenValid(token)
        if (user) {
            socket.emit('auth', true)
            socket.on('exec', async ({ deploymentId, cmd, wkDir }) => {
                const reqId = uuid()
                console.log(user.username, 'ran', cmd, 'on', deploymentId)
                if (!deploymentId.startsWith(user.username)) {
                    return socket.emit('exec-error')
                }
                
                const stream = await exec({ requestId: reqId }, deploymentId, cmd, wkDir)
                if (!stream) {
                    return socket.emit('exec-error')
                }

                socket.emit('readable', reqId)
                stream.on('data', (buf) => {
                    socket.emit('stdout', { requestId: reqId, buf })
                })
                stream.on('end', () => {
                    socket.emit('ended', { requestId: reqId })
                })
                socket.on('stdin', ({ requestId, buf }) => {
                    if (requestId === reqId) {
                        stream.write(buf)
                    }
                })
            })
        } else {
            socket.emit('auth', false)
        }
    })
})

const markStoppedContainers = async () => {
    const [containers, runningDeployments] = await Promise.all([
        listContainers(),
        Deployment.query().whereNull('stoppedAt')
    ])

    const newContainerInfo = containers.map(c => {
        return {
            deploymentId: c.Name.split('/')[1],
            startedAt: c.State.StartedAt,
            stoppedAt: c.State.FinishedAt,
        }
    })

    const unknownContainers = runningDeployments.filter(d => !containers.find(c => c.Name === `/${d.id}`)).map(d => ({
        deploymentId: d.id,
        stoppedAt: new Date(),
    }))

    await Promise.all([
        ...newContainerInfo,
        ...unknownContainers,
    ].map(({ deploymentId, startedAt, stoppedAt }) => {
        return Deployment.query().findById(deploymentId).patch({ startedAt, stoppedAt }).skipUndefined()
    }))
}

setInterval(() => {
    markStoppedContainers().catch(console.error)
}, 1000 * 10)

server.listen(PORT, (err) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}

    console.log(`🚀  Server ready at ${PORT}`)
})