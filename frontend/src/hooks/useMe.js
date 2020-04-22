import { gql, useQuery } from '@apollo/client'

const GET_ME = gql`
    query getMe {
        getMe {
            id
            username
            imageUrl
        }
    }
`

const useMe = () => {
    const { loading, error, data } = useQuery(GET_ME)

    return {
        loading,
        error,
        me: data && data.me,
    }
}

export default useMe