const { cli } = require('cli-ux')
const cliSelect = require('cli-select')
const git = require('simple-git/promise')()

const gqlFetch = require('../../utils/gqlFetch')
const config = require('../../config')

const getMyRepos = ({ token }) => {
    return gqlFetch({token})(`query getMyRepos {
        getMyRepos {
          id
          name
          ssh_url
        }
      }`).then(({ data }) => data.getMyRepos)
}

const clone = async (projectName) => {
    const { token } = await config.get()
    if (!token) {
        cli.error('you must be logged in to do that')
    }

    await cli.action.start('fetching your repos...')

    const repos = await getMyRepos({ token })
    await cli.action.stop()
    
    let chosenRepoName = projectName
    if (!chosenRepoName || !repos.find(r => r.name === chosenRepoName)) {
        cli.log('Choose a repo:')
        const chosenRepo = await cliSelect({
            values: repos.map(t => t.name),
        })
    
        cli.log(`Using repo: ${chosenRepo.value}`)
        chosenRepoName = chosenRepo.value
    }

    const repo = repos.find(r => r.name === chosenRepoName)
    await git.clone(repo.ssh_url)

    cli.log(`Project cloned into directory ${chosenRepoName}`)
    cli.log(`now run \`cd ${chosenRepoName} && ultima dev\` to get building!`)
    cli.log(`when you're ready to go live, run \`ultima up\``)
}

module.exports = clone