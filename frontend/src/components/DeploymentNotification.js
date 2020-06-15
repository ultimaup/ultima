import React from 'react'
import styled from 'styled-components'

import StatusDot from './StatusDot'
import {useActions} from '../hooks/useActions'

const Container = styled.div`
    position: absolute;
    margin-top: 1px;
    right: 9px;
`

const DeploymentNotification = ({ owner, repoName }) => {
    const { actions } = useActions({ owner, repoName, pollInterval: 1000 })
    const hasLiveAction = actions && actions.some(a => !a.completedAt)

    return (
        <Container>
            {hasLiveAction && <StatusDot />}
        </Container>
    )
}

export default DeploymentNotification