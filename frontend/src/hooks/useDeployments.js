import { gql, useQuery } from '@apollo/client'

const GET_DEPLOYMENTS = gql`
    query getDeployments($owner: String, $repoName: String, $branch: String) {
        getDeployments(owner: $owner, repoName: $repoName, branch: $branch) {
            id
            createdAt
            url
        }
    }
`

const useDeployments = ({ owner, repoName, branch }) => {
    const { loading, error, data } = useQuery(GET_DEPLOYMENTS, { variables: { owner, repoName, branch } })

    return {
        loading,
        error,
        deployments: data && data.getDeployments,
    }
}

export default useDeployments