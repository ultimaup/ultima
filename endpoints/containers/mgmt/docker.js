const docker = require('../docker')

const langs = require('../../langs')

const runtimes = langs
	.map(({ runtime }) => runtime)
    .filter(runtime => runtime !== 'html')

const pullImage = image => {
	return new Promise((resolve, reject) => {
		docker.pull(image, (err, stream) => {
			if (err) {
				reject(err)
			} else {
				const onFinished = (err, output) => {
				  if (err) {
					  reject(err)
				  } else {
					  resolve(output)
				  }
				}
				docker.modem.followProgress(stream, onFinished, () => {})
			}
		})
	})
}

const removeContainer = containerId => {
    return docker.getContainer(containerId).remove({
        force: true,
    })
}

const init = async () => {
    console.log('Container management running in Docker mode')

    await Promise.all(
        runtimes.map(runtime => pullImage(runtime).catch(e => {
            console.error('error pulling image '+runtime, e)
        }))
    ).then((imgs) => {
        console.log(`pulled ${imgs.length} images`)
    })
}

const getContainerByName = name => docker.listContainers({ all: true, filters: { name: [name] } })

const createContainer = config => docker.createContainer(config)

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

module.exports = {
    init,
    pullImage,
    getContainerByName,
    createContainer,
    removeContainer,
    getContainerHostname,
}