import React, { useState, useEffect } from 'react'
import styled, { css } from 'styled-components'
import { useParams } from 'react-router-dom'
import moment from 'moment'
import Octicon, {GitBranch} from '@primer/octicons-react'

import { useActions, useAction } from '../../hooks/useActions'
import { Badge } from '../../components/Badge'
import { LogFrame } from '../Logs/Logs'

const StatusDot = styled.div`
    background: #2AA827;
    width: 8px;
    height: 8px;
    border-radius: 100%;

    opacity: 1;
    ${({ complete }) => !complete && css`
        @keyframes flickerAnimation { /* flame pulses */
            0%   { opacity:1; }
            50%  { opacity:0; }
            100% { opacity:1; }
        }

        animation: flickerAnimation 1s infinite;
    `}
    ${({ status }) => {
        if (status === 'error') {
            return css`
                background: #E01E5A;
            `
        }

        return ''
    }}
`

const ActionContainer = styled.div`
    display: flex;
    padding: 16px 12px;
    border-radius: 4px;
    color: white;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    box-sizing: border-box;
    border-radius: 3px;

    align-items: center;

    ${props => props.type === 'error' && css`
        border: 1px solid #E01E5A;
    `}

    ${StatusDot} {
        margin-right: 8px;
    }
`

const AddonContainer = styled.div`
    margin-top: -3px;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    border-top: none;
    
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
`

const ActionLink = styled(ActionContainer).attrs(() => ({ as: 'a' }))`
    :hover {
        color: white;
    }
`

const ActionsContainer = styled.div`
    ${ActionContainer}:not(:first-child) {
        margin-top: 16px;
    }
    ${ActionLink} {
        margin-bottom: 32px;
    }
`

const Body = styled.div`
    flex: 1;
    display: flex;
    align-items: center;

    img {
        width: 32px;
        height: 32px;
        margin-right: 8px;
        margin-left: 16px;
    }
    a {
        margin-left: 0 !important;
    }
    svg {
        margin-left: 6px;
        margin-right: 6px;
    }
`

const Timings = styled.div`
    display: flex;
    flex-direction: column;
    margin-left: 8px;
    text-align: right;
`

const Status = styled.div`
    width: 125px;
    display: flex;
    justify-content: center;
`

const Spinner = styled.div`
    &,
    &:after {
        border-radius: 50%;
        width: 10em;
        height: 10em;
    }

    font-size: 1px;
    position: relative;
    text-indent: -9999em;
    display: inline-block;
    
    border-top: 1.1em solid rgba(255, 255, 255, 0.2);
    border-right: 1.1em solid rgba(255, 255, 255, 0.2);
    border-bottom: 1.1em solid rgba(255, 255, 255, 0.2);
    border-left: 1.1em solid #ffffff;
    
    
    transform: translateZ(0);
    
    animation: load8 1.1s infinite linear;
    
    @keyframes load8 {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`

const BadgeSpinner = styled(Badge)`
    display: flex;
    align-items: center;

    ${Spinner} {
        margin-left: 4px;
    }
`

const Logs = styled(LogFrame)`
    width: 100%;
    min-height: 450px;
    display: flex;
    flex-direction: column;
    
    iframe {
        flex: 1;
    }
`

const DeployedUrl = styled(ActionContainer)`
    color: #2AA827;
    background: #292929;
    border: 1px solid #2AA827;
    font-size: 16px;
    text-align: center;
`

const Description = styled.span`
    font-weight: 300;
`

const Action = ({ type, title, description, createdAt, completedAt, metadata, branch, hash, href }) => {
    const data = JSON.parse(metadata)
    const { owner } = useParams()

    if (!title) {
        let commit
        let imageUrl

        if (data.commits) {
            commit = data.commits.find(c => c.id === hash)
            imageUrl = new URL(data.pusherImageUrl)
            imageUrl = imageUrl.pathname
        }

        return (
            <ActionLink href={href}>
                <Status>
                    {completedAt ? (type === 'error' ? <Badge variant="danger">Failed</Badge> : <Badge variant="success">Success</Badge>) : <BadgeSpinner variant="warning">Deploying <Spinner /></BadgeSpinner>}
                </Status>
                <Body>
                    <Octicon icon={GitBranch}/>
                    {branch}
                    <img src={imageUrl} />
                    <a className="ui sha label " href={window.location.pathname.split('/activity/deployments').join(`/commit/${hash}`)}>
                        <span className="shortsha">{hash.substring(0,9)}</span>
                    </a>
                    {commit && commit.message}
                </Body>
                <Timings>
                    <span title={completedAt}>{completedAt ? `completed in ${moment(completedAt).diff(createdAt, 'seconds')} seconds` : null}</span>
                    <span title={createdAt}>{moment(createdAt).fromNow()}</span>
                </Timings>
            </ActionLink>
        )
    }

    return (
        <>
            <ActionContainer>
                <StatusDot status={type} complete={!!completedAt} />
                <Body>
                    <strong>
                    {type === 'error' ? 'Failed ' : ''}{title.replace(/^\w/, c => c.toUpperCase())}
                    </strong>&nbsp;
                    <Description>{description}</Description>
                </Body>
                <Timings>
                    <span title={completedAt}>{completedAt ? `completed in ${moment(completedAt).diff(createdAt, 'seconds')} seconds` : null}</span>
                    <span title={createdAt}>{moment(createdAt).fromNow()}</span>
                </Timings>
            </ActionContainer>
            
            {data && data.logTag && (
                <AddonContainer>
                    <Logs owner={owner} tag={data.logTag} />
                </AddonContainer>
            )}
            {data && data.endpointRouteUrl && (
                <DeployedUrl>API Deployed to&nbsp;<a href={data.endpointRouteUrl}>{data.endpointRouteUrl}</a></DeployedUrl>
            )}
            {data && data.staticRouteUrl && (
                <DeployedUrl>Deployed static content to <a href={data.staticRouteUrl}>{data.staticRouteUrl}</a></DeployedUrl>
            )}
        </>
    )
}

const Deployments = () => {
    const [parentId, setParentId] = useState(window.location.hash.split('#')[1] || undefined)

    useEffect(() => {
        const onHashChange = () => {
            setParentId(window.location.hash.split('#')[1] || undefined)
        }
        window.addEventListener('hashchange', onHashChange, false)

        return () => {
            window.removeEventListener('hashchange', onHashChange, false)
        }
    }, [])

    const { owner, repoName } = useParams()
    const { loading, error, actions } = useActions({ owner, repoName, parentId })
    const { action } = useAction(parentId)

    if (loading) {
        return <p>Loading...</p>
    }

    if (error) {
        console.error(error)
        return <p>an error occurred loading deployments</p>
    }

    if (!actions.length) {
        return <p>nothing yet</p>
    }

    return (
        <ActionsContainer>
            {action && <Action {...action} />}
            {actions.map(action => (
                <Action key={action.id} {...action} href={`#${action.id}`} />
            ))}
        </ActionsContainer>
    )
}

export default Deployments