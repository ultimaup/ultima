import { gql, useQuery } from '@apollo/client'

const GET_HAS_GITHUB_APP = gql`
    query getHasGithubApp {
        getHasGithubApp
    }
`

const useHasGithubApp = () => {
    const { loading, error, data } = useQuery(GET_HAS_GITHUB_APP)

    return {
        loading,
        error,
        hasGithubApp: data && data.getHasGithubApp,
    }
}

export default useHasGithubApp