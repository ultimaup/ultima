import { gql, useMutation } from '@apollo/client'

const QUERY_CNAME = gql`
    mutation getMinioToken($bucketName: String) {
        getMinioToken(bucketName: $bucketName) {
            token
        }
    }
`
const useGetMinioToken = () => {
    const [mutate, { loading }] = useMutation(QUERY_CNAME)

    return {
        loading,
        getMinioToken: bucketName => mutate({ variables: { bucketName } }).then(({ data }) => data.getMinioToken),
    }
}

export default useGetMinioToken