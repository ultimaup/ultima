import React from 'react'
import styled from 'styled-components/macro'
import { useParams } from 'react-router-dom'

import jwtDecode from 'jwt-decode'
import { getToken } from '../../utils/token'

const KibanaIframe = styled.iframe`
    width: 100%;
    height: 100%;
    border: none;
    position: absolute;
`

const LogContainer = styled.div`
    a {
        width: 100%;
        display: block;
        text-align: right;
        background: rgb(29, 30, 36);
        padding: 4px;
        color: #1BA9F5;
        font-weight: bold;
    }
`

const IframeWrapper = styled.div`
    height: 100%;
    position: relative;
    overflow: hidden;
    flex: 1;
    iframe {
        height: calc(100% + 90px);
        top: -90px;
    }
`

export const LogFrame = ({ tag, className }) => {
    const token = getToken()
    const user = token ? jwtDecode(token) : {}
    const { username } = user

    const iframeUrl = `/kibana/s/${username.toLowerCase()}/app/infra#/logs/stream?embed=true&flyoutOptions=(flyoutId:!n,flyoutVisibility:hidden,surroundingLogsId:!n)&logFilter=(expression:'tag:"${tag.toLowerCase()}"',kind:kuery)`
    const linkUrl = `/kibana/s/${username.toLowerCase()}/app/infra#/logs/stream?flyoutOptions=(flyoutId:!n,flyoutVisibility:hidden,surroundingLogsId:!n)&logFilter=(expression:'tag:"${tag.toLowerCase()}"',kind:kuery)`

    return (
        <LogContainer className={className}>
            <a target="_blank" href={linkUrl}>View in Kibana &#x2197;</a>
            <IframeWrapper>
                <KibanaIframe src={iframeUrl} />
            </IframeWrapper>
        </LogContainer>
    )
}

const FullScreenLogs = styled(LogFrame)`
    display: flex;
    flex-direction: column;
    min-height: 600px;
`

const Logs = () => {
    const { owner, repoName } = useParams()
    const tag = `${owner}-${repoName}`
    
    return <FullScreenLogs tag={tag} owner={owner} />
}

export default Logs