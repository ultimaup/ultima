const listRepoTemplates = require('../init/listRepoTemplates')

const getSSHHost = async ({ token }) => {
    const templates = await listRepoTemplates({ token })
    const sshUrl = templates[0].ssh_url

    const url = new URL(sshUrl)

    return {
        user: url.username,
        host: url.hostname,
        port: url.port,
    }
}

module.exports = getSSHHost