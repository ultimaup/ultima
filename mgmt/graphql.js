const { ApolloServer, gql } = require('apollo-server-express')
const slugify = require('slugify')

const Route = require('./db/Route')
const Action = require('./db/Action')
const Deployment = require('./db/Deployment')
const User = require('./db/User')

const { headersToUser } = require('./jwt')
const { addSshKey, listTemplateRepos, createRepoFromTemplate, getRepo, getUserRepos, getLatestCommitFromRepo } = require('./gitea')
const { runTests } = require('./ci')

const { getCname } = require('./dns')

const {
    PUBLIC_ROUTE_ROOT_PROTOCOL,
    PUBLIC_ROUTE_ROOT_PORT,
    PUBLIC_ROUTE_ROOT,

    PG_BROKER_PORT,

    ADMIN_USERNAME,

    PUBLIC_IPV4,
    PUBLIC_IPV6,
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

    type Repo {
        id: ID,
        name: String
        full_name: String
        private: Boolean
        ssh_url: String
    }

    type Route {
        id: ID
        url: String
    }

    type Environment {
        id: ID
        repoName: String
        stage: String
        owner: String
        runtime: String
        createdAt: DateTime
        startedAt: DateTime
        stoppedAt: DateTime
        hash: String
        routes: [Route]
    }

    type DNSResult {
        ipv4: [String]
        ipv6: [String]
        cname: [String]
    }

    type CNameResult {
        id: ID
        cfResult: DNSResult,
        googleResult: DNSResult
    }

    type DNSInfo {
        cname: String
        ipv4: String
        ipv6: String
    }

    type Query {
        getDeployments(owner: String, repoName: String, branch: String) : [Deployment]
        getActions(owner: String, repoName: String, parentId: String) : [Action]
        getAction(id: ID) : Action
        getUsers: [User]
        getTemplateRepos: [Repo]
        getMyRepos: [Repo]
        getPGEndpoint: String
        getEnvironments(owner: String, repoName: String): [Environment]
        getDNSRecords: DNSInfo
    }

    type Mutation {
        activateUser(id: ID, activated: Boolean): User
        addSSHkey(key: String, title: String) : Boolean
        createRepo(name: String, description: String, private: Boolean, templateId: ID) : Repo
        queryCname(hostname: String): CNameResult
    }
`

const userCanAccessRepo = (user, { owner, repoName }) => {
    // console.log(user.username, 'accessed', owner, repoName)
    return user.username === owner
}

const resolvers = {
    Query: {
        getDNSRecords: async () => {
            return {
                ipv4: PUBLIC_IPV4,
                ipv6: PUBLIC_IPV6,
                cname: PUBLIC_ROUTE_ROOT,
            }
        },
        getEnvironments: async (parent, { repoName, owner }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            const o = owner || context.user.username

            let q = Deployment.query()
            
            if (!repoName) {
                q = q.whereIn('id',
                        Route.query().select('deploymentId').where('deploymentId', 'like', `${o}-%`)
                    )
            } else {
                q = q.where('repoName', `${owner}/${repoName}`).where('stage', 'like', 'refs/%')
            }

            const deployments = await q

            const routes = await Route.query().whereIn('deploymentId', deployments.map(d => d.id))

            return deployments.map(d => {
                return {
                    ...d,
                    owner: d.id.split('-')[0],
                    routes: routes.filter(r => r.deploymentId === d.id).map(r => {
                        return {
                            ...r,
                            id: r.source+r.createdAt,
                            url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${r.source}:${PUBLIC_ROUTE_ROOT_PORT}`,
                        }
                    }),
                }
            })
        },
        getDeployments: async (parent, { owner, repoName, branch }, context) => {
            if (!context.user || !userCanAccessRepo(context.user, { owner, repoName })) {
                throw new Error('unauthorized')
            }

            const routes = await Route.query().where('source', 'like', `%${branch}-${repoName}-${owner}%`)

            return routes.filter(r => !!r.deploymentId).map(r => {
                const a = r.deploymentId.split('-')
                const hash = a[a.length - 1]
                return {
                    id: r.deploymentId,
                    url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${r.alias || r.source}:${PUBLIC_ROUTE_ROOT_PORT}`,
                    hash,
                    createdAt: r.createdAt,
                }
            })
        },
        getActions: async (parent, { owner, repoName, parentId }, context) => {
            if (!context.user) {
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
        getTemplateRepos: listTemplateRepos,
        getMyRepos: async (parent, {}, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }
            const { username } = context.user

            return await getUserRepos({ username })
        },
        getPGEndpoint: () => {
            let port = PG_BROKER_PORT
            if (PUBLIC_ROUTE_ROOT_PROTOCOL === 'https') {
                port = 443
            }

            return `pg.${PUBLIC_ROUTE_ROOT}:${port}`
        },
    },
    Mutation: {
        queryCname: async (parent, { hostname }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            const result = await getCname(hostname)
            return {
                id: hostname,
                ...result,
            }
        },
        activateUser: async (parent, { id, activated }, context) => {
            if (!context.user || !admins.includes(context.user.username)) {
                if (context.user.username) {
                    console.error('activateUser access attempt by ', context.user.username)
                }
                throw new Error('unauthorized')
            }

            await User.query().update({ activated }).where('id', id)
            return await User.query().findById(id)
        },
        addSSHkey: async (parent, { key, title }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            try {
                await addSshKey(context.user.username, { key, title })
            } catch (e) {
                if (e.response) {
                    throw new Error(e.response.body)
                }
                throw e
            }

            return true
        },
        createRepo: async (parent, { name, description, private, templateId }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            const { username, id, imageUrl } = context.user

            const result = await createRepoFromTemplate({ username, userId: id }, {
                name: slugify(name), description, private, templateId
            })

            const repo = await getRepo({ username }, { id: result.id })

            try {
                const latestCommit = await getLatestCommitFromRepo({ owner: repo.owner.login, repo: repo.name })
                runTests({
                    repository: repo,
                    ref: `refs/heads/${repo.default_branch}`,
                    pusher: {
                        login: username,
                        avatar_url: imageUrl,
                    },
                    commits: [latestCommit],
                    after: latestCommit.sha,
                })
            } catch (e) {
                console.error(e)
            }
            return repo
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