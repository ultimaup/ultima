const path = require('path')
const Knex = require('knex')

const {
	PLATFORM_DB_TYPE,
	PLATFORM_DB_HOST,
	PLATFORM_DB_NAME,
	PLATFORM_DB_USER,
	PLATFORM_DB_PORT,
	PLATFORM_DB_PASSWORD,
} = process.env

const knex = Knex({
	client: PLATFORM_DB_TYPE,
	connection: {
		host: PLATFORM_DB_HOST,
		port: PLATFORM_DB_PORT,
		user: PLATFORM_DB_USER,
		password: PLATFORM_DB_PASSWORD,
		database: PLATFORM_DB_NAME,
	},
	migrations: {
		directory: path.resolve(__dirname, './migrations'),
	},
})

knex.migrate.latest()
	.then((a) => {
		console.log('migrations ran', a)
	})

module.exports = knex