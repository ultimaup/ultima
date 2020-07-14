const parseGitConfig = require('parse-git-config')
const fse = require('fs-extra')
const path = require('path')
const findGitRoot = require('find-git-root')

// converts the "shorthand" ssh clone url to a standards compliant url
const standardiseSSHurl = sshUrl => {
    return sshUrl.startsWith('ssh://') ? sshUrl : `ssh://${sshUrl.split(':').join('/')}`
}

const parseSSHurl = sshUrl => {
    const url = (new URL(sshUrl))
    const [_,owner, r] = url.pathname.split('/')
    const repoName = r.split('.git')[0]
    return {
        vcsHost: url.hostname,
        repoName, 
        owner,
    }
}

const getRepoName = async (user) => {
    const gitRoot = findGitRoot(path.resolve('.'))
    if (gitRoot) {
        const config = await parseGitConfig({
            path: path.resolve(gitRoot, 'config')
        })
        const head = await fse.readFile(path.resolve(gitRoot, 'HEAD'), 'utf-8')
        const currentRef = head.split('\n')[0].split('ref: ')[1]
        const remotes = Object.entries(config).filter(([key]) => key.startsWith('remote')).map(([key, value]) => {
            const name = key.split('remote ')[1].split('"').join('')
            const url = value.url

            return {
                name,
                url,
            }
        })

        const currentBranch = Object.values(config).find(({ merge }) => merge === currentRef)
        const currentRemoteName = currentBranch && currentBranch.remote || 'origin'
        const remote = remotes.find(({ name }) => name === currentRemoteName)
        const standardSshUrl = standardiseSSHurl(remote.url)
        
        return parseSSHurl(standardSshUrl)
    } else {
        return {
            repoName: 'unknown',
            owner: user.username,
        }
    }
}

module.exports = getRepoName