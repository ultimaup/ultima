const Docker = require('dockerode')

const master = require('../docker')

const {
    SWARM_LISTEN_ADDRESS,
    SWARM_ADVERTISE_ADDRESS,
    DOCKER_HOSTNAME,
    
	IN_PROD = false,
} = process.env

const ensureSwarm = async () => {
    let info
    try {
        info = await master.swarmInspect()
    } catch (e) {
        //
    }
    if (!info) {
        console.log(`initialising swarm`)
        await master.swarmInit({
            ListenAddr: SWARM_LISTEN_ADDRESS,
            AdvertiseAddr: SWARM_ADVERTISE_ADDRESS,
            ForceNewCluster: false,
        })
        info = await master.swarmInspect()
    }

    return info
}

const getTokens = async () => {
    const info = await ensureSwarm()
    return info.JoinTokens
}

const workerInstances = {}

const doWorkerCheck = async () => {
    const nodes = await master.listNodes()
    const workers = nodes.filter(n => n.Spec.Role === 'worker')
    const onlineWorkers = workers.filter(n => n.Spec.Availability === 'active' && n.Status.State === 'ready')
    
    // make Docker instances for each worker
    const hostnames = onlineWorkers.map(worker => worker.Description.Hostname)
    hostnames.forEach(host => {
        if (!workerInstances[host]) {
            console.log('connecting to new worker:', host)
            workerInstances[host] = new Docker({ 
                host,
                ...(IN_PROD ? {} : require('../keys')),
            })
        }
    })

    Object.keys(workerInstances)
        .filter(host => !hostnames.includes(host))
        .forEach(host => {
            console.log('lost connection to worker '+host)
            delete workerInstances[host]
        })
    
    // ensure connectivity
    await Promise.all(
        Object.entries(workerInstances).map(([host, docker]) => docker.version().catch(e => {
            console.error('error connecting to worker '+host, e)
            delete workerInstances[host]
        }))
    )
}

const init = async () => {
    console.log('Container management running in Docker Swarm mode')
    const info = await ensureSwarm()
    const { Worker, Manager } = info.JoinTokens
    console.log(`Initialised swarm with tokens:\nWorker: ${Worker}\nManager: ${Manager}`)

    doWorkerCheck()
    setInterval(doWorkerCheck, 10000)
}

const trimName = name => {
    const s = name.substring(name.startsWith('/') ? 1 : 0,62)
    return s.endsWith('-') ? s.substring(0, s.length - 1) : s
}

const getService = async name => {
    const services = await master.listServices()
    return services.filter(s => s.Spec.Name === trimName(name))
}

const listContainers = async (opts) => {
    const containers = await Promise.all([
        master.listContainers(opts),
        ...Object.values(workerInstances).map(worker => worker.listContainers(opts))
    ])

    return containers.flat()
}

const getContainerByName = async name => listContainers({ all: true, filters: { name: [trimName(name)] } })

const getContainerWithInspect = async (docker, containerId) => {
    const container = docker.getContainer(containerId)
    let inspectInfo
    try {
        inspectInfo = await container.inspect()
    } catch (e) {
        //
    }
    
    return inspectInfo && container
}

const getContainer = async (containerId) => {
    const containers = await Promise.all([
        getContainerWithInspect(master, containerId),
        ...Object.values(workerInstances).map(worker => getContainerWithInspect(worker, containerId))
    ])

    const [container] = containers.filter(c => !!c)
    
	return container
}

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

    const service = await master.createService(serviceConfig).catch(e => {
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
        await master.getService(service.id).remove()
        throw new Error('failed to create container')
    }

    await wait(500)

    return await getContainer(containerId)
}

const removeContainer = async (containerId, deploymentId) => {
    const [service] = await getService(deploymentId)
    // console.log('not removing service', service.id,'for deployment', deploymentId)
    await master.getService(service.id).remove().catch(e => {
        // service might not exist anymore and that's ok
    })
    return true
}

const getContainerHostname = async (containerId, deploymentId) => {
    const [service] = await getService(deploymentId)
    const container = await getContainer(containerId)
    const { Config: { Env } } = await container.inspect()

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
	const container = await getContainer(containerId)
    const exec = await container.exec({ Cmd: ['touch', '/.ultimastart'], AttachStdin: false, AttachStdout: false, AttachStderr: false, Tty: false })
    await exec.start()
}

const listContainersWithDetails = async () => {
	const containers = await listContainers()
	const containerInfo = await Promise.all(containers.map(c => getContainer(c.Id).then(c => c.inspect())))
	return containerInfo
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
    getContainer,
    listContainers: listContainersWithDetails,
}