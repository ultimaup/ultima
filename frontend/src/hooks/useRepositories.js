import { gql, useQuery } from '@apollo/client'

const LIST_REPOS = gql`
    query listGithubRepos($force: Boolean) {
        listRepos(vcs:"github", force: $force) {
            id
            name
            full_name
            private
            isUltima
        }
    }
`

const useRepositories = (force) => {
    const { loading, error, data } = useQuery(LIST_REPOS, { variables: { force } })

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