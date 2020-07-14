const { serverWithMiddleware } = require('./server')
const { getSchemaEnv, genPass } = require('../dbMgmt')
const jwt = require('../jwt')
const Repository = require('../db/Repository')
const GithubRepository = require('../db/GithubRepository')

const {
    PG_BROKER_PORT,
} = process.env

const userCanAccessRepo = async (usr, environment) => {
    if (environment.startsWith(usr.username.toLowerCase())) {
        return true
    }

    const ultimaRepos = await Repository.query().whereIn('fullName', GithubRepository.query().select('full_name').where({ username }))
    return ultimaRepos.map(ur => ur.fullName.split('/').join('-')).some(name => {
        return environment.startsWith(`${name}-`)
    })
}

const getConnectionDetails = async ({ database, user }) => {
    const environment = database
    const token = user

    const usr = await jwt.verify(token)
    
    if (!await userCanAccessRepo(usr, environment)) {
        throw new Error('unauthorized')
    }

    const password = genPass(environment)
    const {
        PGUSER,
        PGPASSWORD,
        PGDATABASE,
        PGHOST,
        PGPORT,
    } = getSchemaEnv({ schema: environment, username: environment, password })

    return {
        host: PGHOST,
        port: PGPORT,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
    }
}

const pgBroker = serverWithMiddleware(getConnectionDetails)
pgBroker.listen(PG_BROKER_PORT, () => {
    console.log('pgBroker listening on ', PG_BROKER_PORT)
})