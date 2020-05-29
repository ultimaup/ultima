import { gql, useQuery } from '@apollo/client'

const GET_RESOURCES = gql`
    query getResources($owner: String, $repoName: String) {
        getResources(owner: $owner, repoName: $repoName) {
            id
            name
            resources {
                id
                name
                type
                apiDeployment {
                    id
                    runtime
                }
                deploymentId
                route {
                    id
                    url
                }
                createdAt
            }
        }
    }
`

const useResources = ({ owner, repoName }) => {
    const { loading, error, data } = useQuery(GET_RESOURCES, { variables: { owner, repoName } })

    return {
        loading,
        error,
        resources: data && data.getResources,
    }
}

export default useResources