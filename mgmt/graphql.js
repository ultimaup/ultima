const { ApolloServer, gql } = require('apollo-server-express')

const Route = require('./db/Route')

const { headersToUser } = require('./jwt')

const {
    PUBLIC_ROUTE_ROOT_PROTOCOL,
    PUBLIC_ROUTE_ROOT_PORT,
} = process.env

const typeDefs = gql`
    scalar DateTime

    type Deployment {
        id: ID
        createdAt: DateTime
        hash: String
        url: String
    }

    type Query {
        getDeployments(owner: String, repoName: String, branch: String) : [Deployment]
    }
`

const resolvers = {
    Query: {
        getDeployments: async (parent, { owner, repoName, branch }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }
            console.log(context.user.username, 'accessed', owner, repoName, branch)

            const routes = await Route.query().where('source', 'like', `%${branch}.${repoName}.${owner}%`)

            return routes.filter(r => !!r.deploymentId).map(r => {
                const a = r.deploymentId.split('-')
                const hash = a[a.length - 1]
                return {
                    id: r.deploymentId,
                    url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${r.source}:${PUBLIC_ROUTE_ROOT_PORT}`,
                    hash,
                    createdAt: r.createdAt,
                }
            })
        },
    },
}

const server = new ApolloServer({
    typeDefs, 
    resolvers,
    context: async ({ req }) => {
        try {
            const user = await headersToUser(req)
            return { user }
        } catch (e) {
            return {}
        }
      },
})

module.exports = app => {
	server.applyMiddleware({ app, path: '/graphql' })
}