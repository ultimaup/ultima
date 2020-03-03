const { createApolloFetch } = require('apollo-fetch')
const jwt = require('jsonwebtoken')

const {
	PRISMA_MANAGEMENT_URL,
	PRISMA_MANAGEMENT_API_SECRET,
} = process.env

const mgmtFetch = createApolloFetch({
    uri: PRISMA_MANAGEMENT_URL,
})

mgmtFetch.use(async ({ options }, next) => {
    if (!options.headers) {
      options.headers = {}  // Create the headers object if needed.
    }

    const mgmtToken = await jwt.sign({ grants: [{ target: '*/*', action: '*' }] }, PRISMA_MANAGEMENT_API_SECRET, { expiresIn: '1h' })
    options.headers['authorization'] = `Bearer ${mgmtToken}`

    next()
})

const addProject = (input) => {
    return mgmtFetch({
        query:`mutation addProject($input: AddProjectInput!) {
                addProject(input: $input) {
                    project {
                        name
                        stage
                    }
                }
            }`,
        variables: { input },
    }).then(({ data, errors }) => {
        if (errors && errors[0]) {
            throw errors[0]
        }

        return data.addProject.project
    })
}

const getProject = (name, stage) => {
    return mgmtFetch({
        query:`query getProject($name: String!, $stage: String!) {
                project(name: $name, stage: $stage) {
                    name
                    stage
                }
            }`,
        variables: { name, stage },
    }).then(({ data, errors }) => {
        if (errors && errors[0]) {
            throw errors[0]
        }

        return data.project
    })
}

const getProjectStatus = (name, stage) => {
    return mgmtFetch({
        query:`query getProjectStatus($name: String!, $stage: String!) {
                migrationStatus(name: $name, stage: $stage) {
                    projectId
                    revision
                    status
                    applied
                    errors
                    startedAt
                    finishedAt
                }
            }`,
        variables: { name, stage },
    }).then(({ data, errors }) => {
        if (errors && errors[0]) {
            throw errors[0]
        }

        return data.migrationStatus
    })
}

const deployProject = ({ name, stage, types, dryRun }) => {
    return mgmtFetch({
        query:`mutation deploy($name: String!, $stage: String!, $types: String!, $dryRun: Boolean!) {
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
        variables: { name, stage, types, dryRun },
    }).then(({ data, errors }) => {
        if (errors && errors[0]) {
            throw errors[0]
        }
        
        return data.deploy
    })
}

const ensurePrismaService = async ({ id, stage, schema, dryRun }) => {
    console.log(`${id}$${stage}`, `ensuring project exists`)
    
    try {
        const existing = await getProject(id, stage)
        console.log(`${id}$${stage}`, `found project`, existing)
    } catch (e) {
        if (!e.message.toLowerCase().startsWith('no service')) {
            throw e
        }

        console.log(`${id}$${stage}`, `no project found, creating...`)

        const newPrj = await addProject({
            name: id,
            stage,
            secrets: [id],
        })

        console.log(`${id}$${stage}`, `created blank project`, newPrj)
    }

    if (schema) {
        console.log(`${id}$${stage}`, `deploying schema ${schema} to project`)

        const res = await deployProject({
            name: id,
            stage,
            types: schema,
            dryRun,
        })

        console.log(`${id}$${stage}`, `started deploying schema to project`, res)
    } else {
        console.log(`${id}$${stage}`, `no schema specified so skipping deploy`, res)
    }
}

module.exports = {
	getProjectStatus,
	ensurePrismaService,
}