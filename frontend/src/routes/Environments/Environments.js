import React, { useState, useEffect } from 'react'
import styled from 'styled-components/macro'
import moment from 'moment'
import Octicon, { GitBranch } from '@primer/octicons-react'

import useResources from '../../hooks/useResources'
import useGetMinioToken from '../../hooks/useGetMinioToken'

import StatusDot from '../../components/StatusDot'
import Loading from '../../components/Loading'
import langs from '../../utils/langs'

import { ActionList } from '../Deployments/Deployments'

import { Header } from '../../components/RepoList/RepoList'
import { Button } from '../../components/Layout'
import { ActionLink } from '../Deployments/Deployments'
import UltimaModal from '../../components/UltimaModal'

const LangLogo = styled.div`
    color: ${({ theme: { offWhite } }) => offWhite};
    font-size: 34px;
    border: 0.5px solid #565656;
    border-radius: 3px;
    width: 52px;
    height: 52px;
    background: ${({ theme: { backgroundColor } }) => backgroundColor};

    i {
        display: flex;
        height: 100%;
        justify-content: center;
        align-items: center;
        text-align: center;
    }
`

const Route = styled.div`

`

const EnvBody = styled.span`
    display: flex;
    flex: 1;
    flex-direction: column;

    h4 {
        margin-bottom: 5px;
    }
`

const Faded = styled.span`
    color: #8A8C93;
`

const Env = styled.div`
    display: flex;
    color: ${({ theme: { offWhite } }) => offWhite};
    background: #292929;
    box-sizing: border-box;
    align-items: center;
    flex: 1;
    padding-left: 16px;
    padding-right: 16px;

    height: 70px;

    ${StatusDot} {
        display: inline-block;
        margin-right: 8px;
    }
    ${LangLogo} {
        margin-right: 10px;
    }

    ${Faded} {
        margin-right: 18px;
        font-family: Inter;
        font-style: normal;
        font-weight: normal;
        font-size: 13px;
        line-height: 16px;
    }

    position: relative;
`

let nf
const ensureNF = () => {
    if (!nf) {
        nf = import('../../nf.css')
    }
}

const Environment = ({ id, stage, type, name, route, deploymentId, setDbConnectionInstructions, createdAt, startedAt, apiDeployment, stoppedAt, routes = [], className }) => {
    const { getMinioToken } = useGetMinioToken()
    const runtime = apiDeployment ? apiDeployment.runtime : undefined
    const lang = langs.find(lang => lang.runtime === (type === 'api' ? runtime : 'html'))
    if (type === 'postgres') {
        return (
            <Env>
                <LangLogo><i className={`nf nf-dev-postgresql`} /></LangLogo>
                <EnvBody>
                    <h4>
                        <StatusDot complete/>
                        Postgres DB
                    </h4>
                    <span>Created on {moment(createdAt).format('YYYY-MM-DD [at] HH:mm A')}</span>
                </EnvBody>
                <Button onClick={() => {
                    setDbConnectionInstructions(name)
                }}>Click for Connection Instructions</Button>
            </Env>
        )
    }

    if (type === 'bucket') {
        return (
            <Env>
                <LangLogo><i className={`nf nf-dev-bitbucket`} /></LangLogo>
                <EnvBody>
                    <h4>
                        <StatusDot complete/>
                        {name}
                    </h4>
                    <span>Created on {moment(createdAt).format('YYYY-MM-DD [at] HH:mm A')}</span>
                </EnvBody>
                <Button onClick={() => {
                    getMinioToken(deploymentId).then(({ token }) => {
                        window.localStorage.setItem('token', token)
                        window.open(`/minio/${deploymentId}`)
                    })
                }}>Click to Explore</Button>
            </Env>
        )
    }

    return (
        <Env>
            <LangLogo>
                <i className={`nf ${lang ? lang.nerdfontClassName : 'nf-dev-docker'}`} />
            </LangLogo>
            <EnvBody>
                <h4>
                    <StatusDot complete status={stoppedAt ? 'error' : 'success'} />
                    {name}
                </h4>
                <span>Created on {moment(startedAt || createdAt).format('YYYY-MM-DD [at] HH:mm A')}</span>
                {stoppedAt && <span>stopped on {moment(stoppedAt).format('YYYY-MM-DD [at] HH:mm A')}</span>}
                {stoppedAt && <span>Live for {moment.duration(moment(stoppedAt).diff(startedAt || createdAt)).humanize()}</span>}
            </EnvBody>
            {route && <>
                <Faded>{route.url}</Faded>
                <Button href={route.url} target="_blank">Preview</Button>
            </>}
        </Env>
    )
}


const EnvironmentsContainer = styled.div`
    margin-bottom: 24px;

    border-radius: 4px;
    color: ${({ theme: { offWhite } }) => offWhite};
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    box-sizing: border-box;
    border-radius: 3px;

    summary h5 {
        display: inline;
    }

    h5 {
        margin-bottom: 0;
    }

    ${Env}:not(:first-of-type) {
        margin-top: 12px;
    }
`

const EnvList = styled.div`
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
`

const DeploymentsContainer = styled.div`
    margin-top: 4px;
    > div > a {
        margin-top: 8px !important;
        margin-bottom: 0 !important;
    }
`

const EnvironmentHeader = styled(Header)`
    a:not(${Button}) {
        color: #B6B7BA;
        display: flex;
        svg {
            margin-right: 8px;
        }
    }
`

const EnvironmentBody = styled.div`
    padding-top: 22px;
    padding-bottom: 12px;
    color: #B6B7BA;

    ${ActionLink} {
        border: none;
        padding-top: 12px;
        padding-bottom: 12px;
        border-radius: 0;
        padding-left: 16px;
        padding-right: 16px;
    }

    h5 {
        padding-left: 16px;
        margin-bottom: 12px;
    }
`

const DBInstructionsModal = ({ dbConnectionInstructions, setDbConnectionInstructions }) => (
    <UltimaModal
        title="Database Connection"
        isOpen={dbConnectionInstructions}
        onRequestClose={() => setDbConnectionInstructions(false)}
    >
        <p>Install the CLI if you haven't already</p>
        <p>Open a terminal window</p>
        <p>Run <code>ultima db</code></p>
        <p>Choose <code>{dbConnectionInstructions}</code></p>
        <p>Use the connection info provided to connect to your database</p>
        <button className="ui button green" onClick={() => setDbConnectionInstructions(false)}>OK</button>
    </UltimaModal>
)

const Environments = ({ owner, repoName }) => {
    const { loading, error, resources } = useResources({ owner, repoName })
    const [dbConnectionInstructions, setDbConnectionInstructions] = useState(false)

    useEffect(ensureNF, [])

    if (loading) {
        return <Loading />
    }

    if (error) {
        return error.message
    }

    return (
        <>
            {resources.map(({ name, id, resources }) => {
                return (
                    <EnvironmentsContainer key={id}>
                        <EnvironmentHeader>
                            <a href={`/${owner}/${repoName}/src/branch/${name}`}>
                                <Octicon icon={GitBranch} size={21} />
                                {name}
                            </a>
                            <Button to={`/repo/${owner}/${repoName}/${name}/config`}>Edit Environment Config</Button>
                        </EnvironmentHeader>
                        <EnvironmentBody>
                            <h5>Resources</h5>
                            <EnvList>
                                {resources && resources.map(resource => <Environment setDbConnectionInstructions={setDbConnectionInstructions} key={resource.id} {...resource} />)}
                            </EnvList>
                            <h5>Recent Deployments</h5>
                            <DeploymentsContainer>
                                <ActionList owner={owner} repoName={repoName} branch={name} limit={3} />
                            </DeploymentsContainer>
                        </EnvironmentBody>
                    </EnvironmentsContainer>
                )
            })}

            <DBInstructionsModal setDbConnectionInstructions={setDbConnectionInstructions} dbConnectionInstructions={dbConnectionInstructions} />
        </>
    )
}

export default Environments