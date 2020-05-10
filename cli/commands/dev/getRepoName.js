
const getRepoName = (remote, user) => {
    if (!remote) {
        return {
            repoName: 'unknown',
            owner: user.username,
        }
    }
    let sshUrl = remote.refs.push
    if (!sshUrl.startsWith('ssh://')) {
        sshUrl = `ssh://${sshUrl.split(':').join('/')}` // converts the "shorthand" ssh clone url to a standards compliant url
    }
    const [_,owner, r] = (new URL(sshUrl)).pathname.split('/')
    const repoName = r.split('.git')[0]
    return {repoName, owner}
}

module.exports = getRepoName