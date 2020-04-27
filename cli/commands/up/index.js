const git = require('simple-git/promise')()
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

const waitForDeployment = async ({ token }, { owner, repoName }, { hash }) => {
    let action
    let ctr = 0

    while (!action && ctr < 10) {
        const actions = await getActions({ token }, { owner, repoName })
        action = actions.find(a => a.hash === hash)
        await wait(300)
    }

    return action
}

const stepToString = ({ title, type }) => `${type}: ${title}`

let renderedSteps = {}
const renderSteps = async (steps) => {
    steps.forEach((step) => {
        const key = [step.type, step.title]
        if (!renderedSteps[key]) {
            cli.log(stepToString(step))
        }
    })
}

const up = async () => {
    const { token } = await config.get()
    const serverUrl = new URL(program.server)

    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
        return cli.log(`This doesn't look like a repo, are you in the right directory?`)
    }

    const remotes = await git.getRemotes(true)

    const ultimaRemote = remotes.find(remote => {
        const [url] = remote.refs.push.split(':')
        return url.includes(serverUrl.host)
    })
    
    if (!ultimaRemote) {
        return cli.log(`This doesn't look like an ultima project, are you in the right directory?`)
    }

    const status = await git.status()
    if (status.ahead) {
        await cli.action.start(`pushing ${status.ahead} changes to ultima`)
    } else {
        return cli.log('Please commit some changes before pushing')
    }

    const namedBranch = status.tracking
    await git.push()
    await cli.action.stop()

    await cli.action.start('waiting for deployment status')
    const remoteHash = await git.revparse([namedBranch])
    const [owner, repoName] = ultimaRemote.remote.refs.push.split(':')[1].split('.git')[0].split('/')
    
    const deployment = await waitForDeployment({ token }, { owner, repoName }, { hash: remoteHash })
    await cli.action.stop()
    if (!deployment) {
        return cli.error('deployment failed to start')
    }

    cli.log(`Started deployment ${serverUrl}/${owner}/${repoName}/deployments#/${deployment.id}`)
    await cli.action.start('deploying...')

    let d
    while (!d.completedAt) {
        d = await getAction({ token }, { id: deployment.id })
        steps = await getActions({ token }, { parentId: deployment.id })
        await renderSteps(steps)
        if (!d.completedAt) {
            await wait(300)
        }
    }
    await cli.action.stop()
}

module.exports = up