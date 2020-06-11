import { gql, useQuery } from '@apollo/client'

const GET_REPO = gql`
    query getRepo($owner: String, $repoName: String) {
        getRepo(owner: $owner, repoName: $repoName) {
            id
            name
            full_name
            private
        }
    }
`

const useRepo = ({ repoName, owner}) => {
    const { loading, error, data } = useQuery(GET_REPO, { variables: { repoName, owner } })

    return {
        loading,
        error,
        repo: data && data.getRepo
    }
}

export default useRepo