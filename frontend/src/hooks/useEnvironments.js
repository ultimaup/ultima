import { gql, useQuery } from '@apollo/client'

const GET_ENVIRONMENTS = gql`
    query getEnvironments($owner: String, $repoName: String) {
        getEnvironments(owner: $owner, repoName: $repoName) {
            id
            createdAt
            stage
            startedAt
            stoppedAt
            hash
            runtime
            routes {
                id
                url
            }
        }
    }
`

const useEnvironments = ({ owner, repoName }) => {
    const { loading, error, data } = useQuery(GET_ENVIRONMENTS, { variables: { owner, repoName } })

    return {
        loading,
        error,
        environments: data && data.getEnvironments,
    }
}

export default useEnvironments