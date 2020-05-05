const gqlFetch = require('../../utils/gqlFetch')

const getEnvironments = ({ token }) => {
    return gqlFetch({token})(`query getEnvironments {
        getEnvironments {
          id
          createdAt
          repoName
          owner
          stage
        }
      }`).then(({ data }) => data.getEnvironments)
}

module.exports = getEnvironments