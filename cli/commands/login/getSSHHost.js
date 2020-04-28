const listRepoTemplates = require('../init/listRepoTemplates')

const getSSHHost = async ({ token }) => {
    const templates = await listRepoTemplates({ token })
    let sshUrl = templates[0].ssh_url

    if (!sshUrl.startsWith('ssh://')) {
        sshUrl = `ssh://${sshUrl.split(':').join('/')}` // converts the "shorthand" ssh clone url to a standards compliant url
    }

    const url = new URL(sshUrl)

    return {
        user: url.username,
        host: url.hostname,
        port: url.port,
    }
}

module.exports = getSSHHost