const { ApolloServer, gql } = require('apollo-server-express')
const { GraphQLJSON } = require('graphql-type-json')

const Route = require('./db/Route')
const Action = require('./db/Action')
const Deployment = require('./db/Deployment')
const User = require('./db/User')
const Resource = require('./db/Resource')
const Repository = require('./db/Repository')
const GithubRepository = require('./db/GithubRepository')

const { headersToUser } = require('./jwt')
const { genBucketPass } = require('./ci')
const templates = require('./templates')

const { getCname } = require('./dns')
const s3 = require('./s3')
const github = require('./github')
const auth = require('./auth')
const billing = require('./billing')


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
    scalar JSON

    type User {
        id: ID
        imageUrl: String
        username: String
        activated: Boolean
        tier: String
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

    type APIDeployment {
        id: ID
        name: String
        runtime: String
    }
    type ResourceRoute {
        id: ID
        url: String
    }
    type Resource {
        id: ID,
        name: String
        type: String
        apiDeployment: APIDeployment
        deploymentId: String
        route: ResourceRoute
        createdAt: DateTime
    }

    type ResourceEnvironment {
        id: ID,
        name: String
        resources: [Resource]
    }

    type MinioAuth {
        token: String
    }
    type Repo {
        id: ID
        name: String
        full_name: String
        private: Boolean
        isUltima: Boolean
        vcs: String
        ssh_url: String
    }

    type File {
        content: String
        sha: String
    }

    type Template {
        id: ID,
        name: String
        template: JSON
    }

    input TemplateDirMapping {
        dir: String
        templateName: String
    }

    type LoginSession {
        id: ID
        token: String
    }

    type Query {
        getDeployments(owner: String, repoName: String, branch: String) : [Deployment]
        getActions(owner: String, repoName: String, parentId: String) : [Action]
        getAction(id: ID) : Action
        getUsers: [User]
        getTemplates: [Template]
        getMyRepos: [Repo] #deprecated
        getPGEndpoint: String
        getEnvironments(owner: String, repoName: String): [Environment]
        getResources(owner: String, repoName: String): [ResourceEnvironment]
        getDNSRecords: DNSInfo
        listRepos(vcs: String, force: Boolean): [Repo]
        getUltimaYml(owner: String, repoName: String, branch: String, force: Boolean): File
        getRepo(owner: String, repoName: String): Repo
        getLoginSession(id: ID!): LoginSession
        getHasGithubApp: Boolean
        getCheckoutSessionId(tier: String): String
        getPortalUrl: String
        getStripePublicKey: String
    }

    type Mutation {
        createLoginSession: LoginSession
        activateUser(id: ID, activated: Boolean): User
        createRepo(name: String, private: Boolean, template: String, templatePopulatedDirs: [TemplateDirMapping], vcs: String) : Repo
        queryCname(hostname: String): CNameResult
        getMinioToken(bucketName: String): MinioAuth
        setUltimaYml(owner: String, repoName: String, branch: String, commitMessage: String, commitDescription: String, value: String, sha: String) : File
    }
`

const userCanAccessRepo = (user, { owner, repoName }) => {
    // console.log(user.username, 'accessed', owner, repoName)
    return user.username === owner
}

const unique = myArray => [...new Set(myArray)]

const listGithubRepos = async (accessToken, username) => {
    const repos = await github.listRepos({ accessToken })
    const repoIds = repos.map(r => `${r.id}`)

    const existing = await GithubRepository.query().where({ username })
    const existingIds = existing.map(r => `${r.id}`)
    const newRepos = repos.filter(r => !existingIds.includes(`${r.id}`))

    const deletedRepoIds = existingIds.filter(id => !repoIds.includes(id))

    if (newRepos.length) {
        await GithubRepository.query().insert(
            newRepos.map(({ id, created_at, pushed_at, name, full_name, private, installationId }) => ({
                id,
                createdAt: created_at,
                pushedAt: pushed_at,
                username,
                name,
                full_name,
                private,
                installationId,
            }))
        )
    }

    if (deletedRepoIds.length) {
        await GithubRepository.query().where({
            username,
        }).whereIn('id', deletedRepoIds).delete()
    }

    if (existing.length) {
        await Promise.all(
            existing.map(({ id, created_at, pushed_at, name, full_name, private, installationId }) => GithubRepository.query().update({
                createdAt: created_at,
                pushedAt: pushed_at,
                username,
                name,
                full_name,
                private,
                installationId,
            }).where({
                id,
                username,
            }))
        )
    }
}

const resolvers = {
    JSON: GraphQLJSON,
    Query: {
        getStripePublicKey: billing.getStripeKey,
        getCheckoutSessionId: (parent, { tier }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            return billing.getCheckoutSessionId(tier, context.user.username)
        },
        getPortalUrl: (parent, args, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            return billing.getPortalUrl(context.user.username)
        },
        getHasGithubApp: (parent, args, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }
            const { username } = context.user
            return github.doesUserHaveInstallation(username)
        },
        getLoginSession: (parent, { id }) => auth.getLoginSession(id),
        getUltimaYml: async (parent, { owner, repoName, branch }, context) => {
            const { username } = context.user
            const full_name = [owner, repoName].join('/')
            const githubRepo = await GithubRepository.query().where({ username, full_name }).first()
            if (githubRepo) {
                const file = await github.getUltimaYml(githubRepo.installationId, { owner, repo: repoName, branch })
                return file
            } else {
                throw new Error('not found')
            }
        },
        listRepos: async (parent, { force, vcs }, context) => {
            const { githubAccessToken, username } = context.user

            if (vcs === 'github') {
                if (!githubAccessToken) {
                    throw new Error('unauthorized')
                }
                
                let results = await GithubRepository.query().where({ username })
                let recheckAccess = false
                if (!results.length || force) {
                    await listGithubRepos(githubAccessToken, username)
                    results = await GithubRepository.query().where({ username })
                    recheckAccess = true
                }

                const ultimaRepos = await Repository.query().whereIn('fullName', results.map(r => r.full_name))
                const urMap = {}
                ultimaRepos.forEach(({ fullName }) => {
                    urMap[fullName] = true
                })

                // if (recheckAccess) {
                    auth.ensureResourceAccess(username, Object.keys(urMap).filter(fname => fname.split('/')[0] !== username)).catch(console.error)
                // }

                return results.map(repo => {
                    return {
                        ...repo,
                        vcs: 'github',
                        isUltima: !!urMap[repo.full_name],
                    }
                })
            }

            return []
        },
        getDNSRecords: async () => {
            return {
                ipv4: PUBLIC_IPV4,
                ipv6: PUBLIC_IPV6,
                cname: PUBLIC_ROUTE_ROOT,
            }
        },
        getResources: async (parent, { repoName, owner }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            const eqq = Resource.query().where('repoName', `${owner}/${repoName}`).where('stage', 'like', 'refs/%')

            const [eq, deployments,routes] = await Promise.all([
                eqq,
                Deployment.query().whereIn('id', eqq.clone().where('type', 'api').whereNotNull('deploymentId').select('deploymentId')),
                Route.query().whereIn('source', eqq.clone().whereNotNull('routeId').select('routeId')),
            ])
            
            const environments = unique(eq.map(e => e.stage)).map((stage) => {
                return {
                    id: stage,
                    name: stage.split('refs/heads/')[1],
                    stage,
                }
            }).map(environment => {
                const resources = {}
                eq
                    .filter(e => e.stage === environment.stage)
                    .filter(({ type, routeId }) => {
                        if (type === 'web' || type === 'api') {
                            return !!routeId
                        } else {
                            return true
                        }
                    })
                    .map(e => {
                        let deployment
                        let route
                        
                        if (e.deploymentId && e.type === 'api') {
                            deployment = deployments.find(d => d.id === e.deploymentId)
                        }
                        
                        if (e.routeId) {
                            route = routes.find(r => r.source === e.routeId)
                            if (route) {
                                route = {
                                    ...route,
                                    id: route.source,
                                    url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${route.alias || route.source}:${PUBLIC_ROUTE_ROOT_PORT}`,
                                }
                            }
                        }
                        
                        return {
                            ...e,
                            apiDeployment: deployment,
                            route,
                        }
                    })
                    .forEach(resource => {
                        if (!resources[resource.deploymentId]) {
                            resources[resource.deploymentId] = resource
                        }
                    })

                return {
                    ...environment,
                    resources: Object.values(resources),
                }
            }).filter(e => !!e.resources.length)

            return environments
        },
        getEnvironments: async (parent, { repoName, owner }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }

            const o = owner || context.user.username

            let q = Deployment.query()
            
            if (!repoName) {
                const usersGithubRepos = GithubRepository.query().select('full_name').where('username', context.user.username)
                const userDeploymentIds = Resource.query().select('deploymentId').whereIn('repoName', usersGithubRepos)
                
                q = q.whereIn('id',
                        Route.query().select('deploymentId').whereIn('deploymentId', userDeploymentIds)
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
                            url: `${PUBLIC_ROUTE_ROOT_PROTOCOL}://${r.alias || r.source}:${PUBLIC_ROUTE_ROOT_PORT}`,
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

            if (!owner && !repoName && !parentId) {
                const { username } = context.user
                const githubRepos = await GithubRepository.query().where({ username }).whereIn('full_name', Repository.query().select('full_name'))
                const fullNames = [
                    ...githubRepos.map(g => g.full_name),
                ]

                // TODO: this is dumb
                const f = await Promise.all(
                    fullNames.map(full_name => {
                        const [ owner, repoName ] = full_name.split('/')
                        return {
                            owner, repoName,
                        }
                    }).map(({ owner, repoName }) => Action.query().where({ owner, repoName }).orderBy('createdAt', 'DESC'))
                )

                return f.flat().sort((a, b) => {
                    return b.createdAt - a.createdAt
                }).filter((_, i) => i < 20)
            }

            return await Action.query().limit(10).where(parentId ? { parentId } : { owner, repoName }).orderBy('createdAt', parentId ? 'ASC' : 'DESC').skipUndefined()
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
        getTemplates: async (parent, {}, context) => {
            return await templates.list()
        },
        getMyRepos: async (parent, {}, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }
            return []
        },
        getRepo: async (parent, { owner, repoName }, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }
            const { username } = context.user
            const full_name = [owner, repoName].join('/')

            const githubRepo = await GithubRepository.query().where({ username, full_name }).first()
            if (githubRepo) {
                return {
                    ...githubRepo,
                    vcs: 'github',
                }
            } else {
                throw new Error('not found')
            }
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
        createLoginSession: auth.createLoginSession,
        getMinioToken: async (parent, args, context) => {
            if (!context.user) {
                throw new Error('unauthorized')
            }
            const { username } = context.user
            const password = genBucketPass(username)
            const token = await s3.getWebLoginToken({ username, password })

            return {
                token,
            }
        },
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
        setUltimaYml: async (parent, { owner, repoName, branch, value, commitMessage, commitDescription, sha }, context) => {
            const { username } = context.user
            const full_name = [owner, repoName].join('/')
            const githubRepo = await GithubRepository.query().where({ username, full_name }).first()
            if (githubRepo) { 
                await github.setUltimaYml(githubRepo.installationId, { owner, repo: repoName, branch }, {
                    message: commitMessage,
                    description: commitDescription,
                    sha,
                }, value)

                return await github.getUltimaYml(githubRepo.installationId, { owner, repo: repoName, branch })
            } else {
                throw new Error('not found')
            }        
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
        if (!err.message.includes('unauthorized')) {
            console.error(err)
        }
        
        // Otherwise return the original error.  The error can also
        // be manipulated in other ways, so long as it's returned.
        return err;
    },
})

module.exports = app => {
	server.applyMiddleware({ app, path: '/graphql' })
}