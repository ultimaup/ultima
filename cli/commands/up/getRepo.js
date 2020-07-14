const graphqlFetch = require('../../utils/gqlFetch')

const getRepo = async ({ token }, { owner, repoName }) => {
    return graphqlFetch({ token })(`
    query getRepo($owner: String, $repoName: String) {
        getRepo(owner: $owner, repoName: $repoName) {
            id
            name
            full_name
            private
            vcs
        }
    }`, { owner, repoName }).then(({ data }) => data.getRepo)
}

module.exports = getRepo