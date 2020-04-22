import React from 'react'
import styled from 'styled-components'
import { useParams } from 'react-router-dom'

const KibanaIframe = styled.iframe`
    width: 100%;
    min-height: 600px;
    border: none;
`

const LogContainer = styled.div`
    a {
        width: 100%;
        display: block;
        text-align: right;
        margin-bottom: 4px;
    }
`

const Logs = () => {
    const { owner, repoName } = useParams()
    const iframeUrl = `/kibana/s/${owner}/app/infra#/logs/stream?embed=true&flyoutOptions=(flyoutId:!n,flyoutVisibility:hidden,surroundingLogsId:!n)&logFilter=(expression:'tag:${owner}-${repoName}',kind:kuery)`
    const linkUrl = `/kibana/s/${owner}/app/infra#/logs/stream?flyoutOptions=(flyoutId:!n,flyoutVisibility:hidden,surroundingLogsId:!n)&logFilter=(expression:'tag:${owner}-${repoName}',kind:kuery)`

    return (
        <LogContainer>
            <a href={linkUrl}>View in Kibana</a>
            <KibanaIframe src={iframeUrl} />
        </LogContainer>
    )
}

export default Logs