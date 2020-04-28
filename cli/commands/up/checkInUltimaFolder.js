const git = require('simple-git/promise')()
const { cli } = require('cli-ux')

const getSSHHost = require('../login/getSSHHost')

const checkInUltimaFolder = async ({ token }) => {
    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
        cli.log(`This doesn't look like a repo, are you in the right directory?`)
        return false
    }

    const remotes = await git.getRemotes(true)

    const sshHost = await getSSHHost({ token })

    const ultimaRemote = remotes.find(remote => {
        const url = remote.refs.push
        return url.includes(sshHost.host)
    })

    if (!ultimaRemote) {
        cli.log(`This doesn't look like an ultima project, are you in the right directory?`)
        return false
    }

    return true
}

module.exports = checkInUltimaFolder