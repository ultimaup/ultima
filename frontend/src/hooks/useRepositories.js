import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'

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

const useRepositories = () => {
    const [refetchLoading, setRefetchLoading] = useState(false)
    const { loading, error, data, refetch } = useQuery(LIST_REPOS)

    return {
        loading: loading || refetchLoading,
        error,
        refresh: () => {
            setRefetchLoading(true)
            refetch({
                force: true,
            }).then(() => {
                setRefetchLoading(false)
            })
        },
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