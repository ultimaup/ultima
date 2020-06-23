const jwtdecode = require('jwt-decode')
const { cli } = require('cli-ux')

const config = require('../../config')
const getRepoName = require('../dev/getRepoName')

const watchDeployment = require('./watchDeployment')
const getRepo = require('./getRepo')

const up = async () => {
    const { token } = await config.get()

    const { repoName, owner, vcsHost } = await getRepoName(jwtdecode(token))
    if (!vcsHost) {
        return cli.log('Please push your code to a VCS like GitHub and try again')
    }

    // do i have this repo on my account?
    const repo = await getRepo({ token }, { owner, repoName })
    if (repo) {
        // if so, tell me i have to git push it 
        cli.log('Listening for a `git push`...')
        await watchDeployment({ owner, repoName })
    } else {
        // if not, start integration flow
        cli.log(`Please go here to add this repo to Ultima:`)
        const integrationUrl = `${program.server}/repo/${owner}/${repoName}/integrate?vcsHost=${vcsHost}`
        cli.url(integrationUrl, integrationUrl)
        try {
            await cli.open(integrationUrl)
        } catch (e) {
            //
        }
        return
    }
}

module.exports = up