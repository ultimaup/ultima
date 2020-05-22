import { useState } from 'react'
import { gql, useMutation } from '@apollo/client'

const QUERY_CNAME = gql`
    mutation queryCname($hostname: String) {
        queryCname(hostname: $hostname) {
            id
            googleResult {
                ipv4
                ipv6
                cname
            }
            cfResult {
                ipv4
                ipv6
                cname
            }
        }
    }
`
const useQueryCName = () => {
    const [data, setData] = useState(null)
    const [mutate, { loading }] = useMutation(QUERY_CNAME)

    return {
        loading,
        queryCName: hostname => mutate({ variables: { hostname } }).then(({ data }) => setData(data.queryCname)),
        results: data,
    }
}

export default useQueryCName