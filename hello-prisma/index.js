const fs = require('fs')
const util = require('util')
const fse = require('fs-extra')
const uuid = require('uuid').v4
const { Pool } = require('pg')
const { createApolloFetch } = require('apollo-fetch')
const jwt = require('jsonwebtoken')

// const { Client } = require('prisma-cli-engine')
const { PrismaDefinitionClass, Environment } = require('prisma-yml')

const exec = util.promisify(require('child_process').exec)

const mgmtFetch = createApolloFetch({
    uri: process.env.PRISMA_MANAGEMENT_URL,
})

mgmtFetch.use(async ({ request, options }, next) => {
    if (!options.headers) {
      options.headers = {}  // Create the headers object if needed.
    }

    const mgmtToken = await jwt.sign({ grants: [{ target: '*/*', action: '*' }] }, process.env.PRISMA_MANAGEMENT_SECRET, { expiresIn: '1h' })
    options.headers['authorization'] = `Bearer ${mgmtToken}`

    next()
})

const createPrismService = async (id) => {
    const cwd = `/tmp/${id}`
    const definitionPath = `/tmp/${id}/prisma.yml`

    const datamodelStr = await createBaseSchema(id)

    const ymlStr = [
        'datamodel: datamodel.graphql', 
        `endpoint: ${process.env.PRISMA_MANAGEMENT_URL.split('/management').join('')}`,
    ].join('\n')

    await fse.outputFile(definitionPath, ymlStr)
    await fse.outputFile(`${cwd}/datamodel.graphql`, datamodelStr)

    const input = {
        name: id,
        stage: 'live',
        secrets: [id],
    }

    const environment = new Environment(cwd)
    const definition = new PrismaDefinitionClass(environment, definitionPath)
    await definition.load({})

    const { typesString } = definition

    if (!typesString) {
        throw new Error('typesString is falsey')
    }

    await mgmtFetch({
        query:`mutation addProject($input: AddProjectInput!) {
                addProject(input: $input) {
                    project {
                        name
                        stage
                    }
                }
            }`,
        variables: { input },
    })

    const deployInput = {
        name: id,
        stage: 'live',
        types: typesString,
    }

    const res = await mgmtFetch({
        query:`mutation deploy($name: String!, $stage: String!, $types: String!) {
                deploy(input: { name: $name, stage: $stage, types: $types }) {
                    errors {
                        type
                        field
                        description
                    }
                    migration {
                        status
                    }
                }
            }`,
        variables: deployInput,
    })

    return res
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

const createBaseSchema = async id => {
    // const template = await fse.readFile('schema.prisma', 'utf-8')
    // const schema = template.split('$url').join(`postgresql://${id}:${id}@${process.env.PGHOST}:${process.env.PGPORT}/${id}`)

    // return schema

    return fse.readFile('datamodel.graphql', 'utf-8')
}

// const runBaseMigration = async (id, schema) => {
//     const cwd = `/tmp/${id}`
//     await fse.outputFile(`${cwd}/schema.prisma`, schema)
//     const one = await exec(`prisma2 migrate save --name "init ${id}" --experimental`, { cwd, env: {
//         ...process.env,
//         DEBUG: '*',
//     } })
//     const two = await exec(`prisma2 migrate up --experimental`, { cwd })

//     return [one, two]
// }

const addProject = async ({ id }) => {
    // create postgres user
    // await createPGUser(id)

    // create prisma service
    const res = await createPrismService(id)
    console.log(JSON.stringify(res, null, '\t'))

    console.log('(probably) created', id)

    // create base schema.prisma
    // const schema = await createBaseSchema(id)
    
    // // run migrate
    // const migrationResults = await runBaseMigration(id, schema)

    // console.log(JSON.stringify(migrationResults, null, '\t'))

    return true
}


addProject({ id: 'fu'+uuid().split('-')[0] }).then(console.log).catch(console.error)