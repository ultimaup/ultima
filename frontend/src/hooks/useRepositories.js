import { gql, useQuery } from '@apollo/client'

const LIST_REPOS = gql`
    query listGithubRepos {
        listRepos(vcs:"github") {
            id
            name
            full_name
            private
            isUltima
        }
    }
`

const useRepositories = () => {
    const { loading, error, data } = useQuery(LIST_REPOS)

    return {
        loading,
        error,
        repositories: data ? [...data.listRepos].sort((a,b) => {
            if (a.isUltima) {
                return 1
            } else if (b.isUltima) {
                return -1
            } else {
                return 0
            }
        }) : [],
    }
}

export default useRepositories