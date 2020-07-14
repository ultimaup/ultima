import { gql, useQuery } from '@apollo/client'

const GET_EXTENSION_IDS = gql`
    query getExtensionIds {
        getExtensionIds {
            chrome
        }
    }
`

const useExtensionIds = () => {
    const { loading, error, data } = useQuery(GET_EXTENSION_IDS)

    return {
        loading,
        error,
        extensionIds: data && data.getExtensionIds,
    }
}

export default useExtensionIds