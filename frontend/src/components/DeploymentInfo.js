import React from 'react'
import styled from 'styled-components'

import useDeployments from '../hooks/useDeployments'

import { LiveBadge } from './Badge'

const Branch = styled.span`
    font-family: monospace;
    font-style: normal;
    font-weight: bold;
    font-size: 13px;
    line-height: 17px;
    /* identical to box height */

    letter-spacing: -0.035em;
    color: white;
`

const Container = styled.div`
    width: 1127px;
    margin-left: auto;
    margin-right: auto;

    padding-top: 10px;

    display: flex;
    align-items: center;

    ${LiveBadge} {
        margin-right: 12px;
    }
    ${Branch} {
        margin-right: 4px;
        margin-left: 12px;
    }
`

const DeploymentInfo = ({ owner, repoName, branch }) => {
    const { loading, error, deployments } = useDeployments({ owner, repoName, branch })
    if (error) {
        console.error(error)
    }
    let liveDeployment
    if (deployments) {
        liveDeployment = [...deployments].sort((a,b) => b.createdAt - a.createdAt).find(d => !!d.url)
    }

    return (
        <Container>
            {liveDeployment ? <LiveBadge>LIVE</LiveBadge> : null}
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.75 4.28125C9.75 3.16406 8.83594 2.25 7.71875 2.25C6.57617 2.25 5.6875 3.16406 5.6875 4.28125C5.6875 5.29688 6.39844 6.10938 7.33789 6.28711C7.3125 6.71875 7.21094 7.07422 7.00781 7.30273C6.57617 7.86133 5.66211 7.9375 4.72266 8.03906C3.98633 8.08984 3.25 8.16602 2.66602 8.4707C2.58984 8.49609 2.51367 8.54688 2.4375 8.59766V4.66211C3.35156 4.45898 4.0625 3.64648 4.0625 2.65625C4.0625 1.53906 3.14844 0.625 2.03125 0.625C0.888672 0.625 0 1.53906 0 2.65625C0 3.64648 0.685547 4.45898 1.625 4.66211V9.61328C0.685547 9.79102 0 10.6289 0 11.5938C0 12.7363 0.888672 13.625 2.03125 13.625C3.14844 13.625 4.0625 12.7363 4.0625 11.5938C4.0625 10.6797 3.42773 9.89258 2.56445 9.63867C2.69141 9.41016 2.86914 9.2832 3.04688 9.18164C3.47852 8.95312 4.11328 8.90234 4.79883 8.85156C5.86523 8.75 6.98242 8.62305 7.64258 7.81055C7.97266 7.42969 8.125 6.92188 8.15039 6.26172C9.06445 6.05859 9.75 5.27148 9.75 4.28125ZM0.8125 2.65625C0.8125 1.99609 1.3457 1.4375 2.03125 1.4375C2.69141 1.4375 3.25 1.99609 3.25 2.65625C3.25 3.3418 2.69141 3.875 2.03125 3.875C1.3457 3.875 0.8125 3.3418 0.8125 2.65625ZM3.25 11.5938C3.25 12.2793 2.69141 12.8125 2.03125 12.8125C1.3457 12.8125 0.8125 12.2793 0.8125 11.5938C0.8125 10.9336 1.3457 10.4004 2.00586 10.375H2.03125C2.69141 10.4004 3.25 10.9336 3.25 11.5938ZM7.99805 5.47461L7.71875 5.5C7.0332 5.5 6.5 4.9668 6.5 4.28125C6.5 3.62109 7.0332 3.0625 7.71875 3.0625C8.37891 3.0625 8.9375 3.62109 8.9375 4.28125C8.9375 4.86523 8.53125 5.34766 7.99805 5.47461Z" fill="#919191"/>
            </svg>
            <Branch>{branch}:</Branch> {loading ? 'loading status' : liveDeployment ? '' : 'not deployed'}
            {liveDeployment ? <a href={liveDeployment.url} target="_blank">{liveDeployment.url}</a> : ''}
        </Container>
    )
}

export default DeploymentInfo