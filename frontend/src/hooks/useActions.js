import { gql, useQuery } from '@apollo/client'
import { useEffect } from 'react'

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

export const useActions = ({ owner, repoName, parentId, pollInterval = 3000 }) => {
    const { loading, error, data, startPolling, stopPolling } = useQuery(GET_ACTIONS, { variables: { owner, repoName, parentId } })

    useEffect(() => {
        startPolling(pollInterval)
        return stopPolling
    }, [startPolling, pollInterval, stopPolling])

    return {
        loading,
        error,
        actions: data && data.getActions,
    }
}


export const useAction = (id) => {
    const { loading, error, data, startPolling, stopPolling } = useQuery(GET_ACTION, { variables: { id }, skip: !id })

    useEffect(() => {
        startPolling(1000)
        return stopPolling
    }, [startPolling, stopPolling])

    return {
        loading,
        error,
        action: data && data.getAction,
    }
}