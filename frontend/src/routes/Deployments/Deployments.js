import React from 'react'
import styled, { css } from 'styled-components'
import { HashRouter, Route, Switch, Link, useParams } from 'react-router-dom'
import moment from 'moment'
import Octicon, {GitBranch} from '@primer/octicons-react'
import { readableColor } from 'polished'

import { useActions, useAction } from '../../hooks/useActions'
import { Badge } from '../../components/Badge'
import { LogFrame } from '../Logs/Logs'
import StatusDot from '../../components/StatusDot'

export const ActionContainer = styled.div`
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

const ActionLink = styled(ActionContainer).attrs(() => ({ as: Link }))`
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
            imageUrl = new URL(data.pusherImageUrl)
            imageUrl = imageUrl.pathname
        }

        return (
            <ActionLink to={to} onClick={onClick}>
                <Status>
                    {completedAt ? (type === 'error' ? <Badge variant="danger">Failed</Badge> : <Badge variant="success">Success</Badge>) : <BadgeSpinner variant="warning">Deploying <Spinner /></BadgeSpinner>}
                </Status>
                <Body>
                    <Octicon icon={GitBranch}/>
                    {branch}
                    <img src={imageUrl} alt="" />
                    <a className="ui sha label ">
                        <span className="shortsha">{hash.substring(0,9)}</span>
                    </a>
                    {commit && commit.message}
                </Body>
                <Timings>
                    <span title={completedAt}>{completedAt ? `completed in ${moment(completedAt).diff(createdAt, 'seconds')} seconds` : null}</span>
                    <span title={createdAt}>{moment(createdAt).fromNow()}</span>
                </Timings>
                {!noLink && <Chevron><i className="fa fa-chevron-right" /></Chevron>}
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

const ActionDetails = ({ owner }) => {
    const { parentId } = useParams()
    const { action } = useAction(parentId)
    const { loading, error, actions } = useActions({ parentId })

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
            {action && <Action noLink {...action} />}
            {actions.map(action => (
                <Action key={action.id} {...action} owner={owner} />
            ))}
        </ActionsContainer>
    )
}

export const ActionList = ({ owner, branch, repoName, limit = Infinity, onClick }) => {
    const { loading, error, actions } = useActions({ owner, repoName })

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
            {actions.filter(a => !branch || a.branch === branch).filter((a, i) => i < limit).map(action => (
                <Action key={action.id} {...action} to={`/${action.id}`} onClick={() => onClick && onClick(action.id)} />
            ))}
        </ActionsContainer>
    )
}

const Deployments = () => {
    const { owner, repoName } = useParams()

    return (
        <HashRouter>
            <Switch>
                <Route path="/:parentId" component={props => <ActionDetails owner={owner} repoName={repoName} {...props} />} />
                <Route path="/" component={props => <ActionList owner={owner} repoName={repoName} {...props} />} />
            </Switch>
        </HashRouter>
    )
}

export default Deployments