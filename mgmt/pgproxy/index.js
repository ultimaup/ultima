const { serverWithMiddleware } = require('./server')
const { getSchemaEnv, genPass } = require('../dbMgmt')
const jwt = require('../jwt')

const {
    PG_BROKER_PORT,
} = process.env

const getConnectionDetails = async ({ database, user }) => {
    const environment = database
    const token = user

    const usr = await jwt.verify(token)

    // naiive af
    if (!environment.startsWith(usr.username.toLowerCase())) {
        throw new Error('unauthorized')
    }
 
    const password = genPass(environment)
    const {
        PGUSER,
        PGPASSWORD,
        PGDATABASE,
        PGHOST,
        PGPORT,
    } = getSchemaEnv({ username: environment, password })

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