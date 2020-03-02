const fs = require('fs')
const util = require('util')
const fse = require('fs-extra')
const uuid = require('uuid').v4
const { Pool } = require('pg')
const { createApolloFetch } = require('apollo-fetch')
const jwt = require('jsonwebtoken')

const exec = util.promisify(require('child_process').exec)

const mgmtFetch = async opts => {
    const mgmtToken = await jwt.sign({ grants: [{ target: '*/*', action: '*' }] }, process.env.PRISMA_MANAGEMENT_SECRET, { expiresIn: '1h' })
    const fetch = createApolloFetch({
        uri: process.env.PRISMA_MANAGEMENT_URL,
        headers: {
            Authorization: `Bearer ${mgmtToken}`,
        }
    })

    return fetch(opts)
}

const createPrismService = (id) => {
    const input = {
        name: id,
        stage: 'live',
        secrets: [id],
    }
 
    return mgmtFetch({
        mutation:`
            mutation addProject($input: AddProjectInput!) {
                addProject(input: $input) {
                    project {
                        name
                        stage
                    }
                }
            }
        `,
        variables: { input },
    })
}


// pools will use environment variables for connection information
const pool = new Pool()

const createPGUser = async id => {
    const username = id
    const password = id

    await pool.query(`CREATE USER ${username} WITH PASSWORD '${password}';`)
    await pool.query(`CREATE SCHEMA AUTHORIZATION ${username};`)

    await pool.end()
}

const createBaseSchema = id => {
    const template = fs.readFileSync('schema.prisma', 'utf-8')
    const schema = template.split('$url').join(`postgresql://${id}:${id}@${process.env.PGHOST}:${process.env.PGPORT}/${id}`)

    return schema
}

const runBaseMigration = async (id, schema) => {
    const cwd = `/tmp/${id}`
    await fse.outputFile(`${cwd}/schema.prisma`, schema)
    // const zero = await exec(`npx prisma2 init`)
    const one = await exec(`prisma2 migrate save --name "init ${id}" --experimental`, { cwd })
    const two = await exec(`prisma2 migrate up --experimental`, { cwd })

    return [one, two]
}

const addProject = async ({ id }) => {
    // create postgres user
    await createPGUser(id)
    // create prisma service
    await createPrismService(id)
    // create base schema.prisma
    const schema = await createBaseSchema(id)
    
    // run migrate
    const migrationResults = await runBaseMigration(id, schema)

    console.log(JSON.stringify(migrationResults, null, '\t'))

    return true
}


addProject({ id: 'fu'+uuid().split('-')[0] }).then(console.log).catch(console.error)