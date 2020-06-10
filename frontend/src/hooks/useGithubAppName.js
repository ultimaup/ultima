import { gql, useQuery } from '@apollo/client'

const GET_GITHUB_APP_NAME = gql`
    query getGithubAppName {
        getGithubAppName
    }
`

const useGetUltimaYml = () => {
    const { loading, error, data } = useQuery(GET_GITHUB_APP_NAME)

    return {
        loading,
        error,
        githubAppName: data && data.getGithubAppName,
    }
}

export default useGetUltimaYml