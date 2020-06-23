const { cli } = require('cli-ux')
const { program } = require('commander')

const config = require('../../config')
const graphqlFetch = require('../../utils/gqlFetch')

const getActions = async ({ token }, { owner, repoName, parentId }) => {
    return graphqlFetch({ token })(`
        query getActions($owner: String, $repoName: String, $parentId: String) {
            getActions(owner: $owner, repoName: $repoName, parentId: $parentId) {
                id
                owner
                repoName
                branch
                hash
                createdAt
                completedAt
                type
                title
                description
                metadata
                parentId
            }
        }
    `, { owner, repoName, parentId }).then(({ data }) => data.getActions)
}

const getAction = async ({ token }, { id }) => {
    return graphqlFetch({ token })(`
        query getAction($id: ID) {
            getAction(id: $id) {
                id
                owner
                repoName
                branch
                hash
                createdAt
                completedAt
                type
                title
                description
                metadata
                parentId
            }
        }
    `, { id }).then(({ data }) => data.getAction)
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// find deployments that happened in the last minute
const waitForDeployment = async ({ token }, { owner, repoName }) => {
    let action
    let ctr = 0
    const timeAgo = new Date()
    timeAgo.setMinutes(timeAgo.getMinutes() - 1)

    while (!action && ctr < 10) {
        const actions = await getActions({ token }, { owner, repoName })
        action = actions.find(a => {
            return (new Date(a.createdAt)).getTime() < timeAgo.getTime()
        })
        await wait(300)
    }

    return action
}

const stepToString = ({ title, type, metadata, completedAt }) => {
    cli.log(`${type}: ${title}${completedAt ? ' done' : ''}`)

    if (metadata) {
        const data = JSON.parse(metadata)
        if (data && data.endpointRouteUrl) {
            cli.log(`Deployed API to ${data.endpointRouteUrl}`)
        }
        if (data && data.staticRouteUrl) {
            cli.log(`Deployed static content to ${data.staticRouteUrl}`)
        }
    }
}

let renderedSteps = {}
const renderSteps = async (steps) => {
    steps.forEach((step) => {
        const key = [step.id, step.metadata].join('/')
        if (!renderedSteps[key]) {
            stepToString(step)
            renderedSteps[key] = true
        }
    })
}

const watchDeployment = async ({ owner, repoName }) => {
    const { token } = await config.get()
    const serverUrl = new URL(program.server)

    await cli.action.start('waiting for deployment status')

    const deployment = await waitForDeployment({ token }, { owner, repoName })
    await cli.action.stop()
    cli.log(`Found deployment from ${deployment.createdAt}`)
    if (!deployment) {
        return cli.error('deployment failed to start')
    }

    cli.log(`Started deployment ${serverUrl}${owner}/${repoName}/activity/deployments#/${deployment.id}`)
    await cli.action.start('deploying...')

    let d = await getAction({ token }, { id: deployment.id })
    while (!d.completedAt) {
        steps = await getActions({ token }, { parentId: deployment.id })
        await renderSteps(steps)
        d = await getAction({ token }, { id: deployment.id })
        if (!d.completedAt) {
            await wait(300)
        }
    }
    await cli.action.stop()
}

module.exports = watchDeployment