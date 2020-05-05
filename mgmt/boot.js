const got = require('got')

const {
    ENDPOINTS_ENDPOINT,
} = process.env

const Route = require('./db/Route')
const Deployment = require('./db/Deployment')
const routeMgmt = require('./route')

const getRoutesWithDeployments = async () => {
    return await Route.query().whereIn('deploymentId', Deployment.query().select('id').where('stage', 'like', 'refs/%'))
}

const ensureAllLiveDeploymentsExist = async () => {
    console.log('ensureAllLiveDeploymentsExist')
    const routes = await getRoutesWithDeployments()

    console.log(`ensuring ${routes.length} routes`)

    let successful = 0
    for (let i = 0; i<routes.length; i++) {
        const route = routes[i]
        console.log(`ensuring ${route.source}`)
        try {
            const { hostname: destination } = await got(`${ENDPOINTS_ENDPOINT}/ensure-deployment/${route.deploymentId}/`).json()
            if (destination !== route.destination) {
                console.log(route.source, `route changed, updating to`, destination)
                await routeMgmt.set({
                    ...route,
                    destination,
                })
            } else {
                console.log(route.source, 'unchanged')
            }
            console.log(`ensured ${route.source}`, destination)
            successful++
        } catch (e) {
            console.error(`failed to ensure deployment for route`, JSON.stringify(route), e)
        }
    }

    console.log(`ensured ${successful}/${routes.length} routes`)
}

module.exports = {
    ensureAllLiveDeploymentsExist,
}