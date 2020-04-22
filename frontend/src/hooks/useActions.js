import { gql, useQuery } from '@apollo/client'

const actionFields = `
id
            owner
            repoName
            branch
            hash
            createdAt
            completedAt
            type
            title
            description
            metadata
            parentId
`

const GET_ACTIONS = gql`
    query getActions($owner: String, $repoName: String, $parentId: String) {
        getActions(owner: $owner, repoName: $repoName, parentId: $parentId) {
            ${actionFields}
        }
    }
`


const GET_ACTION = gql`
    query getAction($id: ID) {
        getAction(id: $id) {
            ${actionFields}
        }
    }
`

export const useActions = ({ owner, repoName, parentId }) => {
    const { loading, error, data } = useQuery(GET_ACTIONS, { variables: { owner, repoName, parentId } })

    return {
        loading,
        error,
        actions: data && data.getActions,
    }
}


export const useAction = (id) => {
    const { loading, error, data } = useQuery(GET_ACTION, { variables: { id }, skip: !id })

    return {
        loading,
        error,
        action: data && data.getAction,
    }
}