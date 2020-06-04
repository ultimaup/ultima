const docker = require('../docker')

const {
    SWARM_LISTEN_ADDRESS,
    SWARM_ADVERTISE_ADDRESS,
    DOCKER_HOSTNAME,
} = process.env

const ensureSwarm = async () => {
    let info
    try {
        info = await docker.swarmInspect()
    } catch (e) {
        //
    }
    if (!info) {
        console.log(`initialising swarm`)
        await docker.swarmInit({
            ListenAddr: SWARM_LISTEN_ADDRESS,
            AdvertiseAddr: SWARM_ADVERTISE_ADDRESS,
            ForceNewCluster: false,
        })
        info = await docker.swarmInspect()
    }

    return info
}

const getTokens = async () => {
    const info = await ensureSwarm()
    return info.JoinTokens
}

const init = async () => {
    console.log('Container management running in Docker Swarm mode')
    const info = await ensureSwarm()
    const { Worker, Manager } = info.JoinTokens
    console.log(`Initialised swarm with tokens:\nWorker: ${Worker}\nManager: ${Manager}`)
}

const trimName = name => {
    const s = name.substring(name.startsWith('/') ? 1 : 0,62)
    return s.endsWith('-') ? s.substring(0, s.length - 1) : s
}

const getService = async name => {
    const services = await docker.listServices()
    return services.filter(s => s.Spec.Name === trimName(name))
}

const getContainerByName = name => docker.listContainers({ all: true, filters: { name: [trimName(name)] } })

const dockerPBToSwarm = PortBindings => {
    return Object.entries(PortBindings).map(([key, [{ HostPort }]]) => {
        const [TargetPort, Protocol] = key.split('/')
        
        return {
            PublishedPort: parseInt(HostPort),
            TargetPort: parseInt(TargetPort),
            Protocol,
        }
    })
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const createContainer = async ({ HostConfig: { LogConfig, PortBindings }, name, ExposedPorts, AttachStdout, AttachStderr, Cmd, ...config }) => {
    console.log('docker swarm createContainer')

    const Ports = dockerPBToSwarm(PortBindings)

    let command = Cmd.join(' ')
    if (command.startsWith('sh -c')) {
        command = command.split('sh -c')[1]
    }

    const serviceConfig = {
        Name: trimName(name),
        TaskTemplate: {
            ContainerSpec: {
                ...config,
                Command: ['sh', '-c', `echo "Started container";mkdir /app;until [ -f /.ultimastart ]; do sleep 0.1; done; cd /app; echo "Starting process"; ${command}`],
            },
            LogDriver: {
                name: LogConfig.Type,
                Options: LogConfig.Config,
            },
        },
        EndpointSpec: {
            Mode: 'vip',
            Ports,
        },
    }

    const service = await docker.createService(serviceConfig).catch(e => {
        console.error(`failed to create service with config ${JSON.stringify(serviceConfig)}`, e)
    })
    console.log('created service', service.id, 'with config', serviceConfig)
    let containerId
    let ctr = 0

    console.log('looking for container with name', name)

    while (!containerId && ctr < 1000) {
        const [container] = await getContainerByName(name)
        if (container) {
            containerId = container.Id
        }
        await wait(100)
        ctr++
    }

    if (!containerId) {
        // await docker.getService(service.id).remove()
        throw new Error('failed to create container')
    }

    await wait(500)

    return docker.getContainer(containerId)
}

const removeContainer = async (containerId, deploymentId) => {
    const [service] = await getService(deploymentId)
    console.log('not removing service', service.id,'for deployment', deploymentId)
    // await docker.getService(service.id).remove()
    return true
}

const getContainerHostname = async (containerId, deploymentId) => {
    const [service] = await getService(deploymentId)
    const { Config: { Env } } = await docker.getContainer(containerId).inspect()

    const { Endpoint: { Ports = [] } } = service
    const exposedPorts = Ports.map(({ TargetPort, PublishedPort }) => {
        return PublishedPort
    })

	const ports = Env.map(e => e.split('='))
		.filter(([k, value]) => exposedPorts.includes(parseInt(value)))
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

const startContainer = async (containerId) => {
	const container = docker.getContainer(containerId)
    const exec = await container.exec({ Cmd: ['touch', '/.ultimastart'], AttachStdin: false, AttachStdout: false, AttachStderr: false, Tty: false })
    await exec.start()
}

module.exports = {
    ensureSwarm,
    getTokens,
    createContainer,
    getContainerByName,
    removeContainer,
    getContainerHostname,
    startContainer,
    init,
}