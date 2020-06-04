const got = require('got')

const Deployment = require('../db/Deployment')
const s3 = require('../s3')
const langs = require('../langs')
const docker = require('./docker')

const swarm = require('./mgmt/swarm')
const dockerMgmt = require('./mgmt/docker')

const {
	BUILDER_BUCKET_ID,
	GELF_ADDRESS,
	CONTAINER_MANAGEMENT,
} = process.env

const getBundle = async url => {
	const Key = url.split(BUILDER_BUCKET_ID)[1]

	return s3.getStream({ Key })
}

const runtimes = langs
	.map(({ runtime }) => runtime)
	.filter(runtime => runtime !== 'html')

const getContainerByName = (name) => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		return swarm.getContainerByName(name)
	} else {
		return dockerMgmt.getContainerByName(name)
	}
}

const pullImage = (image) => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		// not needed in swarm
	} else {
		return dockerMgmt.pullImage(image)
	}
}

const createContainer = config => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		return swarm.createContainer(config)
	} else {
		return dockerMgmt.createContainer(config)
	}
}

const removeContainer = (containerId, deploymentId) => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		return swarm.removeContainer(containerId, deploymentId)
	} else {
		return dockerMgmt.removeContainer(containerId, deploymentId)
	}
}

const getContainerHostname = (containerId, deploymentId) => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		return swarm.getContainerHostname(containerId, deploymentId)
	} else {
		return dockerMgmt.getContainerHostname(containerId, deploymentId)
	}
}

const startContainer = containerId => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		return swarm.startContainer(containerId)
	} else {
		return dockerMgmt.startContainer(containerId)
	}
}

const getContainer = async containerId => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		return swarm.getContainer(containerId)
	} else {
		return dockerMgmt.getContainer(containerId)
	}
}

const listContainers = async () => {
	if (CONTAINER_MANAGEMENT === 'swarm') {
		return swarm.listContainers()
	} else {
		return dockerMgmt.listContainers()
	}
}

const doHealthcheck = async (healthcheckUrl) => {
	try {
		const result = await got(healthcheckUrl)
		return result.statusCode >= 200 && result.statusCode < 300
	} catch (e) {
		return e.message.toLowerCase().includes('expected http/')
	}
}

const startContainerAndHealthcheck = async ({ requestId, deploymentId }, containerId) => {
	console.log(requestId, 'starting container', containerId)

	await startContainer(containerId)
	// const logStream = await container.logs({ stdout: true, stderr: true, follow: true })
	// container.modem.demuxStream(logStream, process.stdout, process.stderr)

	const {hostname} = await getContainerHostname(containerId, deploymentId)
	const endpoint = '/health'

	const healthcheckUrl = `${hostname}${endpoint}`

	console.log(requestId, containerId, 'container started, waiting for healthcheck response from', healthcheckUrl)

	// every 50ms
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			clearInterval(int)
			reject(new Error('timeout'))
		}, 15 * 1000) // timeout after 15 secs

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

const deploymentToConfig = deployment => {
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
		Image: deployment.runtime || 'node',
		Cmd: ['sh', '-c', deployment.command || 'npm start'],
		WorkingDir: '/app',
		name: deployment.id,
		ExposedPorts,
		AttachStdout: false,
		AttachStderr: false,
		Env: Object.entries({
			...deployment.env,
			...portEnvs,
		}).map(([k, v]) => `${k}=${v}`),
		HostConfig: {
			PortBindings,
			LogConfig: {
				Type: 'gelf',
				Config: {
					'gelf-address': GELF_ADDRESS,
					tag: (deployment.stage.startsWith('refs/') ? deployment.repoName.split('/').join('-') : deployment.id).toLowerCase(),
				},
			},
		},
	}

	return config
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
			await startContainerAndHealthcheck({ requestId, deploymentId }, containerList[0].Id)
		} else {
			console.log(requestId, 'found container', containerId, 'running healthcheck')
			// if it exists and is running do a healthcheck
			const {hostname} = await getContainerHostname(containerId, deploymentId)
			const passesHealthcheck = await doHealthcheck(`${hostname}/health`)

			if (!passesHealthcheck) {
				console.log(requestId, containerId, 'healthcheck failed, removing')
				// bad egg, kill and don't use
				await removeContainer(containerId, deploymentId)
				console.log(requestId, containerId, 'healthcheck failed, removed')
				containerId = null
			} else {
				console.log(requestId, containerId, 'healthcheck passed')
			}
		}
	}

	if (!containerId) {
		// if not create and start it
		const config = deploymentToConfig(deployment)

		console.log(requestId, 'creating container', config)

		if (!runtimes.includes(config.Image)) {
			await pullImage(config.Image)
	
			console.log('pulled image', config.Image)
		}

		const container = await createContainer(config)

		containerId = container.id
		console.log(requestId, 'created container', containerId)

		console.log(requestId, 'downloading bundle url', deployment.bundleLocation)

		const bundleStreamOrLocalLocation = await getBundle(deployment.bundleLocation)

		console.log(requestId, 'uploading bundle to /app')

		const par = await putArchive(container, bundleStreamOrLocalLocation, {
			path: '/app',
		})

		console.log(requestId, 'uploaded bundle to /app: ', par)

		try {
			await startContainerAndHealthcheck({ deploymentId, requestId }, containerId)
		} catch (e) {
			// clearly a bad egg
			console.log(requestId, 'removing container due to error', containerId, e)
			await removeContainer(containerId, deploymentId)
			throw e
		}
	}

	const { hostname, ports } = await getContainerHostname(containerId, deploymentId)

	return {
		hostname,
		ports,
	}
}

const removeContainerFromDeployment = async ({ requestId }, deploymentId) => {
	console.log(requestId, 'requested to remove containers for deployment', deploymentId)
	const deployment = await Deployment.get(deploymentId)
	if (!deployment) {
		console.log(requestId, 'deployment not found')
		return null
	}

	// do we have a container for proxy deploymentId requests to?
	const containerList = await getContainerByName(deploymentId)
	let containerId = containerList[0] && containerList[0].Id
	if (containerId) {
		console.log(requestId, 'found container', containerId)
		try {
			await removeContainer(containerId, deploymentId)
			console.log(requestId, 'container removed', containerId)
		} catch (e) {
			console.error('error removing container', e)
			return null
		}
	} else {
		console.log(requestId, 'could not find container for deployment', deploymentId)
		return null
	}
}

const exec = async ({ requestId }, deploymentId, cmd, WorkingDir) => {
	console.log(requestId, 'requested to run cmd', deploymentId)
	const deployment = await Deployment.get(deploymentId)
	if (!deployment) {
		console.log(requestId, 'deployment not found')
		return null
	}

	// do we have a container for proxy deploymentId requests to?
	const containerList = await getContainerByName(deploymentId)
	let containerId = containerList[0] && containerList[0].Id
	if (containerId) {
		console.log(requestId, 'found container', containerId)
		try {
			const container = await getContainer(containerId)

			const exec = await container.exec({ Cmd: cmd, AttachStdin: true, AttachStdout: true, AttachStderr: true, WorkingDir, DetachKeys: 'ctrl-c' })
			const stream = await exec.start({ hijack: true, stdin: true })

			return stream
		} catch (e) {
			console.error('error running command container', e)
			return null
		}
	} else {
		console.log(requestId, 'could not find container for deployment', deploymentId)
		return null
	}
}

if (CONTAINER_MANAGEMENT === 'swarm') {
	swarm.init().catch(console.error)
} else {
	dockerMgmt.init()
}


module.exports = {
	ensureContainerForDeployment,
	removeContainerFromDeployment,
	listContainers,
	exec,
}