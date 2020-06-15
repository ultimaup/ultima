import { gql, useQuery } from '@apollo/client'

const LIST_REPOS = gql`
    query getMyRepos {
        getMyRepos {
            id
            name
            full_name
            ssh_url
        }
    }

`

const useLegacyRepositories = () => {
    const { loading, error, data } = useQuery(LIST_REPOS)

    return {
        loading,
        error,
        repositories: data ? data.getMyRepos : [],
    }
}

export default useLegacyRepositories