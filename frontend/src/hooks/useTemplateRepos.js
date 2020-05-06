import { gql, useQuery } from '@apollo/client'

const GET_TEMPLATE_REPOS = gql`
    query getTemplateRepos {
        getTemplateRepos {
          id
          name
          ssh_url
        }
      }
`

const useTemplateRepos = () => {
    const { loading, error, data } = useQuery(GET_TEMPLATE_REPOS)

    return {
        loading,
        error,
        templates: data && data.getTemplateRepos,
    }
}

export default useTemplateRepos