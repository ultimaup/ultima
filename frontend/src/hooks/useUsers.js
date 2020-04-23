import { gql, useQuery } from '@apollo/client'

const GET_USERS = gql`
    query getUsers {
        getUsers {
            id
            username
            imageUrl
            activated
        }
    }
`

const useUsers = () => {
    const { loading, error, data } = useQuery(GET_USERS)

    return {
        loading,
        error,
        users: data && data.getUsers,
    }
}

export default useUsers