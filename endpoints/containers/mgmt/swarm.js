const Docker = require('dockerode')

const master = require('../docker')

const langs = require('../../langs')

const runtimes = langs
	.map(({ runtime }) => runtime)
    .filter(runtime => runtime !== 'html')

const {
    SWARM_LISTEN_ADDRESS,
    SWARM_ADVERTISE_ADDRESS,
    DOCKER_HOSTNAME,
} = process.env

const pullImage = (image, docker) => {
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

const ensureDockerHasRuntimes = async (docker, host) => {
    await Promise.all(
        runtimes.map(runtime => pullImage(runtime, docker).catch(e => {
            console.error('error pulling image '+runtime, e)
        }))
    ).then((imgs) => {
        console.log(`pulled ${imgs.length} images to host ${host}`)
    })
}

const doWorkerCheck = async () => {
    const nodes = await master.listNodes()
    const workers = nodes.filter(n => n.Spec.Role === 'worker')
    const onlineWorkers = workers.filter(n => n.Spec.Availability === 'active' && n.Status.State === 'ready')
    
    let newWorkers = []
    // make Docker instances for each worker
    const hostnames = onlineWorkers.map(worker => worker.Description.Hostname)
    hostnames.forEach(host => {
        if (!workerInstances[host]) {
            console.log('connecting to new worker:', host)
            workerInstances[host] = new Docker({
                host,
                ...require('../keys'),
            })
            newWorkers.push(host)
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

    await Promise.all(newWorkers.map(host => {
        if (workerInstances[host]) {
            return ensureDockerHasRuntimes(workerInstances[host], host)
        }
    }))
}

const init = async () => {
    console.log('Container management running in Docker Swarm mode')
    const info = await ensureSwarm()
    const { Worker, Manager } = info.JoinTokens
    console.log(`Initialised swarm with tokens:\nWorker: ${Worker}\nManager: ${Manager}`)

    ensureDockerHasRuntimes(master, 'master').catch(console.error)
    doWorkerCheck().catch(console.error)
    setInterval(() => doWorkerCheck().catch(console.error), 10000)
}

const trimName = name => {
    const s = name.substring(name.startsWith('/') ? 1 : 0,62)
    return s.endsWith('-') ? s.substring(0, s.length - 1) : s
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

const ensureService = async serviceConfig => {
    const [existing] = await master.listServices({ filters: {
        name: [serviceConfig.Name]
    } })

    if (existing) {
        return {
            id: existing.ID,
        }
    }
    const service = await master.createService(serviceConfig)
    return {
        id: service.id
    }
}

const createService = async serviceConfig => {
    const service = await ensureService(serviceConfig)
    console.log(service.id, 'service creation started, waiting for completion')

    let containerId
    let message
    let lastMessage
    while (!containerId) {
        const [container] = await listContainers({
            filters: {
                label: [`com.docker.swarm.service.id=${service.id}`],
            }
        })
        if (!container) {
            message = 'no container yet'
        } else {
            containerId = container.Id
            message = 'container found '+containerId
        }

        if (message !== lastMessage) {
            console.log(service.id, message)
        }
        lastMessage = message
        if (!containerId) {
            await wait(50)
        }
    }

    console.log(service.id, 'service creation complete')

    return {
        service,
        containerId,
    }
}

const createContainer = async ({ HostConfig: { LogConfig, PortBindings }, name, Labels, ExposedPorts, AttachStdout, AttachStderr, Cmd, ...config }) => {
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
                Labels,
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

    const { service, containerId } = await createService(serviceConfig).catch(e => {
        console.error(`failed to create service with config ${JSON.stringify(serviceConfig)}`, e)
        throw e
    })

    console.log('created service', service.id, 'with config', serviceConfig)

    if (!containerId) {
        await master.getService(service.id).remove()
        throw new Error('failed to create container')
    }

    return await getContainer(containerId)
}

const getContainerWithService = async containerId => {
    const container = await getContainer(containerId)
    const containerInfo = await container.inspect()
    const { Config: { Labels } } = containerInfo
    const serviceId = Labels['com.docker.swarm.service.id']
    const service = master.getService(serviceId)
    const serviceInfo = await service.inspect()
    
    return {
        container,
        service,
        containerInfo,
        serviceInfo,
    }
}

const removeContainer = async (containerId) => {
    const { service } = await getContainerWithService(containerId)
    // console.log('not removing service', service.id,'for containerId', containerId)
    await service.remove().catch(e => {
        // service might not exist anymore and that's ok
    })
    return true
}

const getContainerHostname = async (containerId) => {
    const { containerInfo, serviceInfo } = await getContainerWithService(containerId)
    const { Config : { Env } } = containerInfo
    const { Endpoint: { Ports = [] } } = serviceInfo

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

const waitForContainerToStart = async container => {
    let shouldReturn = false
    let status
    
    while (!shouldReturn) {
        const info = await container.inspect()
        status = info.State.Status
        shouldReturn = ['running', 'exited', 'exited'].includes(status)
        if (!shouldReturn) {
            await wait(20)
        }
    }

    return status
}

const startContainer = async (containerId) => {
    const container = await getContainer(containerId)
    const status = await waitForContainerToStart(container)
    console.log(containerId, 'status:', status)
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