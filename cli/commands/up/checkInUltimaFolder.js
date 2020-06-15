const git = require('simple-git/promise')()
const { cli } = require('cli-ux')

const checkInUltimaFolder = async () => {
    const isRepo = await git.checkIsRepo()

    if (!isRepo) {
        cli.log(`This doesn't look like a repo, are you in the right directory?`)
        return false
    }
}

module.exports = checkInUltimaFolder