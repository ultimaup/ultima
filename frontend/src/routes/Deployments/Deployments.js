import React from 'react'
import styled, { css } from 'styled-components/macro'
import { Route, Switch, Link, useParams } from 'react-router-dom'
import moment from 'moment'
import Octicon, {GitBranch,ChevronRight} from '@primer/octicons-react'
import { readableColor } from 'polished'

import { useActions, useAction } from '../../hooks/useActions'
import { Badge } from '../../components/Badge'
import { LogFrame } from '../Logs/Logs'
import StatusDot from '../../components/StatusDot'
import Loading from '../../components/Loading'

export const ActionContainer = styled.div`
    display: flex;
    padding: 16px 12px;
    border-radius: 4px;
    color: ${({ theme: { offWhite } }) => offWhite};
    background: #292929;
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

export const ActionLink = styled(ActionContainer).attrs(() => ({ as: Link }))`
    color: ${({ theme: { offWhite } }) => offWhite};
    :hover {
        color: ${({ theme: { offWhite } }) => offWhite};
    }
`

const ActionsContainer = styled.div`
    ${ActionContainer}:not(:first-child) {
        margin-top: 16px;
    }
    ${ActionLink} {
        margin-bottom: 18px;
    }
`

const ProfilePic = styled.div`
    width: 32px;
    height: 32px;
    background: rgba(255,255,255,0.1);
    background-image: url('${({ src }) => src}');
    background-size: cover;
    border-radius: 3px;
`

const ShaLabel = styled.span`
    background: ${({ theme: { backgroundColor } }) => backgroundColor};
    border-radius: 2px;
    font-size: 12px;
    line-height: 15px;
    font-family: monospace;
    padding: 3px 12px;
    color: ${({ theme: { offWhite } }) => offWhite};
`

const Body = styled.div`
    flex: 1;
    display: flex;
    align-items: center;

    ${ProfilePic} {
        margin-right: 8px;
        margin-left: 16px;
    }
    ${ShaLabel} {
        margin-right: 8px;
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

const Chevron = styled.div`
    margin-left: 16px;
`

const stringToColour = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let colour = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
}

const ResourceName = styled.div`
    background: ${props => stringToColour(props.resourceName)};
    padding-left: 8px;
    padding-right: 8px;
    margin-right: 8px;
    border-radius: 2px;
    text-transform: uppercase;
    font-size: 12px;
    color: ${props => readableColor(stringToColour(props.resourceName))};
`

const Action = ({ type, title, description, owner, createdAt, completedAt, metadata, branch, hash, noLink, to, onClick }) => {
    const data = JSON.parse(metadata)

    if (!title) {
        let commit
        let imageUrl

        if (data.commits) {
            commit = data.commits.find(c => c.id === hash)
            imageUrl = data.pusherImageUrl
        }

        return (
            <ActionLink to={to} onClick={onClick}>
                {/* <Status>
                    {completedAt ? (type === 'error' ? <Badge variant="danger">Failed</Badge> : <Badge variant="success">Success</Badge>) : <BadgeSpinner variant="warning">Deploying <Spinner /></BadgeSpinner>}
                </Status> */}
                <StatusDot complete={!!completedAt} status={type} />
                <Body>
                    <Octicon icon={GitBranch}/>
                    {branch}
                    <ProfilePic src={imageUrl} title="pusher profile pic" />
                    <ShaLabel>
                        {hash.substring(0,9)}
                    </ShaLabel>
                    {commit && commit.message.split('\n')[0]}
                </Body>
                <Timings>
                    <span title={completedAt}>{completedAt ? `completed in ${moment(completedAt).diff(createdAt, 'seconds')} seconds` : null}</span>
                    <span title={createdAt}>{moment(createdAt).fromNow()}</span>
                </Timings>
                {!noLink && <Chevron><Octicon icon={ChevronRight} /></Chevron>}
            </ActionLink>
        )
    }

    return (
        <>
            <ActionContainer onClick={onClick}>
                <StatusDot status={type} complete={!!completedAt} />
                <Body>
                    {data && data.resourceName && <ResourceName resourceName={data.resourceName}>{data.resourceName}</ResourceName>}
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
            {data && data.resourceUrl && (
                <DeployedUrl>Deployed to&nbsp;<a href={data.resourceUrl}>{data.resourceUrl}</a></DeployedUrl>
            )}
        </>
    )
}

const ActionDetails = () => {
    const { parentId, owner } = useParams()
    const { action } = useAction(parentId)
    const { loading, error, actions } = useActions({ parentId })

    if (loading) {
        return <Loading />
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
            {action && <Action noLink {...action} />}
            {actions.map(action => (
                <Action key={action.id} {...action} owner={owner} />
            ))}
        </ActionsContainer>
    )
}

export const ActionList = ({ style, owner, branch, repoName, limit = Infinity, onClick }) => {
    const { loading, error, actions } = useActions({ owner, repoName })
    const { re } = useParams()

    if (loading) {
        return <Loading />
    }

    if (error) {
        console.error(error)
        return <p>an error occurred loading deployments</p>
    }

    if (!actions.length) {
        return <p>nothing yet</p>
    }

    return (
        <ActionsContainer style={style}>
            {actions.filter(a => !branch || a.branch === branch).filter((a, i) => i < limit).map(action => (
                <Action key={action.id} {...action} to={`/${re}/${owner || action.owner}/${repoName || action.repoName}/deployments/${action.id}`} onClick={() => onClick && onClick(action.id)} />
            ))}
        </ActionsContainer>
    )
}

const ActionListRoute = () => {
    const { owner, repoName } = useParams()
    return <ActionList owner={owner} repoName={repoName} />
}

const Deployments = () => {
    return (
        <Switch>
            <Route path="/:re/:owner/:repoName/deployments/:parentId" component={ActionDetails} />
            <Route path="/:re/:owner/:repoName/deployments" component={ActionListRoute} />
        </Switch>
    )
}

export default Deployments