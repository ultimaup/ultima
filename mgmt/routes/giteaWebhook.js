const { Router } = require('express')
const bodyParser = require('body-parser')
const uuid = require('uuid').v4

const {
	GITEA_WEBHOOK_SECRET,
	GITEA_URL,
} = process.env

const { runPipeline } = require('../ci')
const { giteaStream } = require('../gitea')
const Repository = require('../db/Repository')

const router = new Router()

router.use(bodyParser.json())

router.post('/gitea-hook', async (req, res) => {
	console.log('gitea webhook called')
	try {
		const { headers, body: { secret } } = req

		if (secret !== GITEA_WEBHOOK_SECRET) {
			console.error('gitea webhook rejected because of mismatched secret', secret)
			return res.json(false)
		}
		
		if (headers['x-gitea-event'] === 'push') {
			// do shit
			const { after, repository, commits } = req.body

			const exists = await Repository.query().where({
				fullName: repository.full_name,
				vcs: 'ultima-gitea',
			}).first()

			const touchedUltimaYml = commits.some(({ added, removed, modified }) => {
				return [added,removed,modified].flat().includes('.ultima.yml')
			})

			if (exists || touchedUltimaYml) {
				if (!exists) {
					// start tracking
					await Repository.query().insert({
						id: uuid(),
						fullName: repository.full_name,
						vcs: 'ultima-gitea',
					})
				}
	
				const codeZipUrl = async () => giteaStream(`${GITEA_URL}/${repository.full_name}/archive/${after}.zip`)
				const codeTarUrl = async () => giteaStream(`${GITEA_URL}/${repository.full_name}/archive/${after}.tar.gz`)

				runPipeline({
					...req.body,
					codeZipUrl,
					codeTarUrl,
				})
					.then(console.log)
					.catch(console.error)
			}
		}

		return res.json('ayy')
	} catch (e) {
		console.error(e)
	}

	return res.json('internal error')
})

module.exports = (app) => {
    app.use(router)
}