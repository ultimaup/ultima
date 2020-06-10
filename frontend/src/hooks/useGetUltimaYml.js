import { gql, useQuery } from '@apollo/client'

const GET_ULTIMA_YML = gql`
    query getUltimaYml($owner: String, $repoName: String, $branch: String) {
        getUltimaYml(owner: $owner, repoName: $repoName, branch: $branch)
    }
`

const useGetUltimaYml = ({ owner, repoName, branch }) => {
    const { loading, error, data } = useQuery(GET_ULTIMA_YML, { variables: { owner, repoName, branch } })

    return {
        loading,
        error,
        ultimaYml: data && data.getUltimaYml,
    }
}

export default useGetUltimaYml