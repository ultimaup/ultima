import { gql, useMutation } from '@apollo/client'

const SET_ULTIMA_YML = gql`
    mutation setUltimaYml($owner: String, $repoName: String, $branch: String, $commitMessage: String, $commitDescription: String, $value: String, $sha: String) {
        setUltimaYml(owner: $owner, repoName: $repoName, branch: $branch, value: $value, commitMessage: $commitMessage, commitDescription: $commitDescription, sha: $sha) {
            content
            sha
        }
    }
`

const useSetUltimaYml = ({ owner, repoName }) => {
    const [mutate, { loading }] = useMutation(SET_ULTIMA_YML)

    return {
        loading,
        setUltimaYml: ({ branch, value, commitMessage, commitDescription, sha }) => mutate({ variables: { owner, repoName, branch, value, commitMessage, commitDescription, sha } }).then(({ data }) => data.setUltimaYml),
    }
}

export default useSetUltimaYml