const { Router } = require('express')
const bodyParser = require('body-parser')

const {
	GITEA_WEBHOOK_SECRET,
} = process.env

const { runTests } = require('../ci')

const router = new Router()

router.use(bodyParser.json())

router.post('/gitea-hook', (req, res) => {
	console.log('gitea webhook called')
	try {
		const { headers, body: { secret } } = req

		if (secret !== GITEA_WEBHOOK_SECRET) {
			console.error('gitea webhook rejected because of mismatched secret', secret)
			return res.json(false)
		}
		
		if (headers['x-gitea-event'] === 'push') {
			// do shit
			runTests(req.body)
				.then(console.log)
				.catch(console.error)
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