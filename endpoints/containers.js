const fs = require('fs')
const uuid =  require('uuid').v4
const Docker = require('dockerode')
const got = require('got')

const Deployment = require('./db/Deployment')
const s3 = require('./s3')

const {
	DOCKER_HOSTNAME,
	BUILDER_BUCKET_ID,
    IN_PROD = false,
} = process.env

// TODO: kill inactive containers after a while

const getBundle = async url => {
	const Key = url.split(BUILDER_BUCKET_ID)[1]
	return s3.getStream({ Key })
}

let docker = undefined
if(!IN_PROD) {
    docker = new Docker({
	    ca: fs.readFileSync('./certs/client/ca.pem'),
  	    cert: fs.readFileSync('./certs/client/cert.pem'),
  	    key: fs.readFileSync('./certs/client/key.pem'),
    })
}else{
    docker = new Docker()
}

const getContainerByName = (name) => docker.listContainers({ all: true, filters: { name: [name] } })

docker.pull('node:latest').then((stream) => {
	docker.modem.followProgress(stream, () => {
		console.log('node:latest', 'downloaded')
	}, (e) => {
		console.log('node:latest', 'progress:', e)
	})
})

const doHealthcheck = async (healthcheckUrl) => {
	try {
		const result = await got(healthcheckUrl)
		return result.statusCode >= 200 && result.statusCode < 300
	} catch (e) {
		return e.message.toLowerCase().includes('expected http/')
	}
}

const getContainerHostname = async (containerId) => {
	const info = await docker.getContainer(containerId).inspect()
	const { Config: { ExposedPorts, Env } } = info

	const exposedPorts = Object.keys(ExposedPorts).map(s => s.split('/')[0])

	const ports = Env.map(e => e.split('='))
		.filter(([k, value]) => exposedPorts.includes(value))
		.map(([name, number]) => ({ name, number }))

	const host = DOCKER_HOSTNAME
	const port = ports.find(({ name }) => name === 'PORT').number
	const protocol = 'http'

	return {
		hostname: `${protocol}://${host}:${port}`,
		ports: ports.map(({ name, number }) => ({
			name,
			number,
			url: `${protocol}://${host}:${number}`,
		}))
	}
}

const startContainerAndHealthcheck = async ({ requestId }, containerId) => {
	console.log(requestId, 'starting container', containerId)

	const container = docker.getContainer(containerId)

	await container.start()
	const logStream = await container.logs({ stdout: true, stderr: true, follow: true })
	container.modem.demuxStream(logStream, process.stdout, process.stderr)

	const {hostname} = await getContainerHostname(containerId)
	const endpoint = '/health'

	const healthcheckUrl = `${hostname}${endpoint}`

	console.log(requestId, containerId, 'container started, waiting for healthcheck response from', healthcheckUrl)

	// every 50ms
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			clearInterval(int)
			reject(new Error('timeout'))
		}, 5 * 1000) // timeout after 5 secs

		const int = setInterval(async () => {
			const passed = await doHealthcheck(healthcheckUrl)

			if (passed) {
				clearInterval(int)
				clearTimeout(timeout)
				resolve(true)
			}
		}, 50)
	})
}

const randomPort = () => {
	const num = 1023 + Math.round(Math.random() * (65535 - 1023))
	return num
}

const putArchive = async (container, file, options) => {
	const stream = await container.putArchive(file, options)

	return new Promise((resolve, reject) => {
		docker.modem.followProgress(stream, (err, result) => {
			if (err) {
				reject(err)
			} else {
				resolve(result)
			}
		})
	})
}

const ensureContainerForDeployment = async ({ requestId }, deploymentId) => {
	const deployment = await Deployment.get(deploymentId)
	if (!deployment) {
		return null
	}

	// do we have a container for proxy deploymentId requests to?
	const containerList = await getContainerByName(deploymentId)

	let containerId = containerList[0] && containerList[0].Id

	if (containerId) {
		// if it exists but isn't running start it
		if (containerList[0].State !== 'running') {
			console.log(requestId, 'found container', containerId)
			await startContainerAndHealthcheck({ requestId }, containerList[0].Id)
		} else {
			console.log(requestId, 'found container', containerId, 'running healthcheck')
			// if it exists and is running do a healthcheck
			const {hostname} = await getContainerHostname(containerId)
			const passesHealthcheck = await doHealthcheck(`${hostname}/health`)

			if (!passesHealthcheck) {
				console.log(requestId, containerId, 'healthcheck failed, removing')
				// bad egg, kill and don't use
				await docker.getContainer(containerId).remove({
					force: true,
				})
				console.log(requestId, containerId, 'healthcheck failed, removed')
				containerId = null
			} else {
				console.log(requestId, containerId, 'healthcheck passed')
			}
		}
	}

	if (!containerId) {
		// if not create and start it
		const ports = [
			'PORT',
			...deployment.ports,
		].map(name => ({
			number: randomPort(),
			name,
		}))

		const ExposedPorts = ports.reduce((acc = {}, cv) => {
			return {
				...acc,
				[`${cv.number}/tcp`]: {}
			}
		}, {})

		const portEnvs = ports.reduce((acc = {}, cv) => {
			return {
				...acc,
				[cv.name]: cv.number,
			}
		}, {})

		const PortBindings = ports.reduce((acc = {}, cv) => {
			return {
				...acc,
				[`${cv.number}/tcp`]: [{
					HostPort: `${cv.number}`
				}]
			}
		},{ })

		const config = {
			Image: 'node',
			Cmd: ['npm', 'start'],
			WorkingDir: '/app',
			name: deploymentId,
			ExposedPorts,
			Env: Object.entries({
				...deployment.env,
				...portEnvs,
			}).map(([k, v]) => `${k}=${v}`),
			HostConfig: {
				PortBindings,
			},
		}

		console.log(requestId, 'creating container', config)

		const container = await docker.createContainer(config)

		containerId = container.id
		console.log(requestId, 'created container', containerId)

		console.log(requestId, 'downloading bundle url', deployment.bundleLocation)

		// will make this pipe from s3 or dev
		const bundleStreamOrLocalLocation = await getBundle(deployment.bundleLocation)

		console.log(requestId, 'uploading bundle to /app')

		const par = await putArchive(container, bundleStreamOrLocalLocation, {
			path: '/app',
		})

		console.log(requestId, 'uploaded bundle to /app: ', par)

		try {
			await startContainerAndHealthcheck({ requestId }, containerId)
		} catch (e) {
			// clearly a bad egg
			console.log(requestId, 'removing container due to error', containerId, e)
			await container.remove({
				force: true,
			})
			throw e
		}
	}

	const { hostname, ports } = await getContainerHostname(containerId)

	return {
		hostname,
		ports,
	}
}

getContainerHostname('7d19503c6462').then(console.log).catch(console.error)

module.exports = {
	ensureContainerForDeployment,
}