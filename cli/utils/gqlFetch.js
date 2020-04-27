const { program } = require('commander')

const gqlFetch = ({token}) => {
    return (query, vars, opts = {}) => {
        const gqlFetch = graphqlFetch(`${program.server}/graphql`)

        return gqlFetch(query, vars, {
            ...opts,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(opts.headers || {})
            },
        })
    }
}

module.exports = gqlFetch