const docker = require('../docker')

const {
    SWARM_LISTEN_ADDRESS,
    SWARM_ADVERTISE_ADDRESS,
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

const trimName = name => name.substring(0,62)

const getContainerByName = async (name) => {
    const tasks = await docker.listTasks({ service: trimName(name) })
    
    return tasks.map(task => {
        const Id = task.Status.ContainerStatus && task.Status.ContainerStatus.ContainerID
        const State = task.Status.State
        
        return {
            Id,
            State,
        }
    }).filter(task => !!task.Id)
}

const dockerPBToSwarm = PortBindings => {
    return Object.entries(PortBindings).map(([key, { HostPort }]) => {
        const [TargetPort, Protocol] = key.split('/')
        return {
            PublishedPort: HostPort,
            TargetPort,
            Protocol,
        }
    })
}

const createContainer = async ({ HostConfig: { LogDriver, PortBindings }, name, ExposedPorts, AttachStdout, AttachStderr, ...config }) => {
    await docker.createService({
        Name: trimName(name),
        TaskTemplate: {
            ContainerSpec: config,
            LogDriver,
            EndpointSpec: {
                Ports: dockerPBToSwarm(PortBindings),
            },
        }
    })
    
    let containerId
    let ctr = 0

    while (!containerId && ctr < 100) {
        const [container] = await getContainerByName(name)
        if (container) {
            containerId = container.Id
        }
    }

    return docker.container(containerId)
}

const removeContainer = (containerId, deploymentId) => {
    const [service] = docker.listServices({ name: trimName(deploymentId) })
    return docker.getService(service.id).remove()
}

const getContainerService = async containerId => {
    const { Name } = await docker.getContainer(containerId).inspect()
    const [service] = await docker.listServices({ name: trimName(Name) })
    return service
}

const getContainerHostname = async (containerId) => {
    const service = await getContainerService(containerId)
    const { Endpoint: { Ports }, Spec: { TaskTemplate: { ContainerSpec: { Env } }} } = service
    console.log(service)

    const exposedPorts = Ports.map(({ TargetPort, PublishedPort }) => {
        return PublishedPort
    })

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
    ensureSwarm,
    getTokens,
    createContainer,
    getContainerByName,
    removeContainer,
    getContainerHostname,
    init,
}