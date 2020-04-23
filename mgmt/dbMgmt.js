const Knex = require('knex')
const crypto = require('crypto')

const {
	PLATFORM_DB_TYPE,
	PLATFORM_DB_HOST,
	PLATFORM_DB_PORT,
	PLATFORM_DBA_USER,
    PLATFORM_DBA_PASSWORD,
    
    SALT,
} = process.env

const knex = Knex({
	client: PLATFORM_DB_TYPE,
	connection: {
		host: PLATFORM_DB_HOST,
		port: PLATFORM_DB_PORT,
		user: PLATFORM_DBA_USER,
		password: PLATFORM_DBA_PASSWORD,
		database: PLATFORM_DBA_USER,
	},
})

const ensureSchema = async ({ username, password, schema }) => {
    const existsResult = await knex.raw(`SELECT FROM pg_catalog.pg_roles WHERE rolname = ?`, [username])
    const userExists = !!existsResult.rows.length

    if (!userExists) {
        await knex.raw(`CREATE ROLE "${username}" LOGIN PASSWORD '${password}';`)
    }
   
    await knex.raw(`CREATE SCHEMA IF NOT EXISTS "${schema}" AUTHORIZATION "${username}";`)

    return true
}

const genPass = seed => crypto.createHash('sha256').update(`${seed}-${SALT}`).digest('hex')

const getSchemaEnv = ({ username, password, schema }) => {
	return {
		PGUSER: username,
		PGPASSWORD: password,
		PGDATABASE: schema,
		PGHOST: PLATFORM_DB_HOST,
		PGPORT: PLATFORM_DB_PORT,
	}
}

module.exports = {
    ensureSchema,
    getSchemaEnv,
    genPass,
}