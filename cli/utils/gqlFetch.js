const { program } = require('commander')
const graphqlFetch = require('graphql-fetch')

const gqlFetch = ({token}) => {
    return (query, vars, opts = {}) => {
        const gqlFetch = graphqlFetch(`${program.server}/graphql`)

        return gqlFetch(query, vars, {
            ...opts,
            headers: new Headers({
                Authorization: `Bearer ${token}`,
                ...(opts.headers || {})
            }),
        }).then(res => {
            if (res.errors) {
                throw new Error(res.errors[0].message, res.errors[0])
            }
            return res
        })
    }
}

module.exports = gqlFetch