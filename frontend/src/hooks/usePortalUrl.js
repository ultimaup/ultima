import { gql, useQuery } from '@apollo/client'

const GET_PORTAL_URL = gql`
    query getPortalUrl {
        getPortalUrl
    }
`

const usePortalUrl = () => {
    const { loading, error, data } = useQuery(GET_PORTAL_URL)

    return {
        loading,
        error,
        getPortalUrl: data && data.getPortalUrl,
    }
}

export default usePortalUrl