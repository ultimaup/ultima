import { gql, useQuery } from '@apollo/client'

const GET_DNS_INFO = gql`
    query getDNSRecords {
        getDNSRecords {
            ipv4
            ipv6
            cname
        }
    }
`

const useDNSInfo = () => {
    const { loading, error, data } = useQuery(GET_DNS_INFO)

    return {
        loading,
        error,
        dnsInfo: data && data.getDNSRecords,
    }
}

export default useDNSInfo