const gqlFetch = require('../../utils/gqlFetch')

const listRepoTemplates = ({ token }) => {
    return gqlFetch({token})(`query getTemplateRepos {
        getTemplateRepos {
          id
          name
          ssh_url
        }
      }`).then(({ data }) => data.getTemplateRepos)
}

module.exports = listRepoTemplates