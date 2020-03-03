const uuid =  require('uuid').v4
const { ApolloServer, gql } = require('apollo-server')

const {
	getProjectStatus,
	ensurePrismaService,
} = require('./prisma')

const {
    PORT = 3000,
} = process.env

const newId = () => ('i'+uuid()).substring(0,29)

const getProject = async ({ id, stage = 'master' }) => {
    const status = await getProjectStatus(id, stage)

    return {
        ...status,
        id,
    }
}

const createProject = async ({ stage = 'master' }) => {
    const id = newId()

    await ensurePrismaService({ 
        id,
        stage,
        schema: null,
        dryRun: false,
    })

    return getProject({ id, stage })
}

const setProjectSchema = async ({ id, stage, schema, dryRun = false }) => {
    await ensurePrismaService({ id, stage, schema, dryRun })

    return getProject({ id, stage })
}

const typeDefs = gql`
    scalar DateTime

    type Project {
        id: ID
        revision: Int
        status: String
        applied: Int
        errors: [String!]!
        startedAt: DateTime
        finishedAt: DateTime
    }

    type Query {
        getProject(id: ID!, stage: String) : Project
    }

    type Mutation {
        createProject(stage: String) : Project
        setProjectSchema(id: ID!, stage: String, schema: String!, dryRun: Boolean) : Project
    }
`

const resolvers = {
    Query: {
        getProject: (parent, { id, stage }, context) => getProject({ id, stage }),
    },
    Mutation: {
        createProject: (parent, { stage }, context) => createProject({ stage }),
        setProjectSchema: (parent, { id, stage, schema, dryRun }, context) => setProjectSchema({ id, stage, schema, dryRun }),
    }
}

const server = new ApolloServer({ typeDefs, resolvers })

server.listen({
    port: PORT,
}).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
})