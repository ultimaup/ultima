const knex = require('./knex')

module.exports = async () => {
	console.log('running migrations...')
	const result = await knex.migrate.latest()
	console.log('ran migrations', result)
}