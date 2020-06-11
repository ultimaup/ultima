const { Webhooks } = require("@octokit/webhooks")
const got = require('got')
const uuid = require('uuid').v4

const Repository = require('../db/Repository')
const { runTests } = require('../ci')
const { getInstallationToken, getUltimaYml } = require('../github')

const {
	GITHUB_WEBHOOK_SECRET,
} = process.env

const webhooks = new Webhooks({
	secret: GITHUB_WEBHOOK_SECRET,
	path: '/github/app-webhook'
})

webhooks.on("*", async ({ id, name, payload }) => {
	console.log(name, "event received")
	if (name === 'push') {
		const { installation, repository, ref } = payload
		const installationId = installation.id

		const exists = await Repository.query().where({
			fullName: repository.full_name,
			vcs: 'github',
		}).first()

		const branch = ref.split('refs/heads/')[1]
		const [owner, repo] = repository.full_name.split('/')
		const yml = await getUltimaYml(installationId, { owner, repo, branch })

		const hasUltimaYml = !!yml
		
		if (exists || hasUltimaYml) {
			if (!exists) {
				// start tracking
				await Repository.query().insert({
					id: uuid(),
					fullName: repository.full_name,
					vcs: 'github',
				})
			}

			const codeZipUrl = async () => {
				const token = await getInstallationToken(installationId)
				const url = `https://api.github.com/repos/${repository.full_name}/zipball`
				return got.stream(url, {
					headers: {
						Accept: '*/*',
						'Content-Type': 'application/vnd.github.machine-man-preview+json',
						Authorization: `Bearer ${token}`,
					},
				})
			}

			const codeTarUrl = async () => {
				const token = await getInstallationToken(installationId)
				const url = `https://api.github.com/repos/${repository.full_name}/tarball`
				return got.stream(url, {
					headers: {
						Accept: '*/*',
						'Content-Type': 'application/vnd.github.machine-man-preview+json',
						Authorization: `Bearer ${token}`,
					},
				})
			}

			runTests({
				...payload,
				codeZipUrl,
				codeTarUrl,
			})
		}
	}
})

module.exports = webhooks