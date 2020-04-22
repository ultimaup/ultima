const { ApolloServer, gql } = require('apollo-server-express')

const Route = require('./db/Route')
const Action = require('./db/Action')
const User = require('./db/User')

const { headersToUser } = require('./jwt')

const {
    PUBLIC_ROUTE_ROOT_PROTOCOL,
    PUBLIC_ROUTE_ROOT_PORT,

    ADMIN_USERNAME,
} = process.env

const admins = [
    ADMIN_USERNAME,
]

const typeDefs = gql`
    scalar DateTime

    type User {
        id: ID
        imageUrl: String
        username: String
        activated: Boolean
    }

    type Deployment {
        id: ID
        createdAt: DateTime
        hash: String
        url: String
    }

    type Action {
        id: ID
        owner: String
        repoName: String
        branch: String
        hash: String
        createdAt: DateTime
        completedAt: DateTime

        type: String # (error, warning, info)
        title: String
        description: String
        metadata: String

        parentId: ID
    }

    type Query {
        getDeployments(owner: String, repoName: String, branch: String) : [Deployment]
        getActions(owner: String, repoName: String, parentId: String) : [Action]
        getAction(id: ID) : Action
        getUsers: [User]
    }

    type Mutation {
        activateUser(id: ID, activated: Boolean): User
    }
`

const userCanAccessRepo = (user, { owner, repoName }) => {
    // console.log(user.username, 'accessed', owner, repoName)
    return true
}

const resolvers = {
    Query: {
        getDeployments: async (parent, { owner, repoName, branch }, context) => {
            if (!context.user || !userCanAccessRepo(context.user, { owner, repoName })) {
                throw new Error('unauthorized')
            }

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
        getActions: async (parent, { owner, repoName, parentId }, context) => {
            if (!context.user || !userCanAccessRepo(context.user, { owner, repoName })) {
                throw new Error('unauthorized')
            }

            return await Action.query().where(parentId ? { parentId } : { owner, repoName }).orderBy('createdAt', parentId ? 'ASC' : 'DESC').skipUndefined()
        },
        getAction: async (parent, { id }, context) => {
            if (!id) {
                return null
            }
            const action = await Action.query().where({ id }).first()
            const { owner, repoName } = action

            if (!context.user || !userCanAccessRepo(context.user, { owner, repoName })) {
                throw new Error('unauthorized')
            }

            return action
        },
        getUsers: async (parent, {}, context) => {
            if (!context.user || !admins.includes(context.user.username)) {
                if (context.user.username) {
                    console.error('getUsers access attempt by ', context.user.username)
                }
                throw new Error('unauthorized')
            }

            return await User.query()
        },
    },
    Mutation: {
        activateUser: async (parent, { id, activated }, context) => {
            await User.query().update({ activated }).where('id', id)
            return await User.query().findById(id)
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
    formatError: (err) => {
        console.error(err)
        
        // Otherwise return the original error.  The error can also
        // be manipulated in other ways, so long as it's returned.
        return err;
      },
})

module.exports = app => {
	server.applyMiddleware({ app, path: '/graphql' })
}