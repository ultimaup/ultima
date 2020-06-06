import React, { useState } from 'react'
import styled from 'styled-components'
import moment from 'moment'
import Modal from 'react-modal'
import { HashRouter as Router } from 'react-router-dom'

import Octicon, { GitBranch, LinkExternal } from '@primer/octicons-react'

import useResources from '../../hooks/useResources'

import StatusDot from '../../components/StatusDot'
import langs from '../../utils/langs'

import { ActionList, ActionContainer } from '../Deployments/Deployments'

const LangLogo = styled.div`
    width: 75px;
    height: 75px;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-color: white;
    color: white;
    background: rgba(0,0,0,0.4);
    font-size: 58px;

    i {
        display: flex;
        justify-content: center;
    }
`

const Route = styled.div`
    background: #176615;
    padding: 8px;
    font-size: 12px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`

const Env = styled.a`
    display: inline-flex;
    min-width: 300px;
    border-radius: 4px;
    color: white;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    box-sizing: border-box;
    border-radius: 3px;
    flex-direction: column;
    overflow: hidden;

    > div {
        display: inline-flex;
        flex-direction: row;
    }

    > div > div {
        display: inline-flex;
        flex-direction: column;
        justify-content: center;
        padding-left: 12px;
        padding-right: 12px;
    }

    :hover {
        color: white;
        .ext {
            opacity: 0.9;
        }
    }

    margin-top: 16px;
    margin-right: 8px;

    ${StatusDot} {
        display: inline-block;
        margin-right: 8px;
    }

    h4 {
        margin-bottom: 6px;
        display: flex;
        align-items: center;
    }

    position: relative;

    .ext {
        position: absolute;
        right: 8px;
        top: 8px;
        opacity: 0.6;
    }

    ${ActionContainer} {
        margin-top: 8px !important;
        margin-bottom: 8px !important;
    }
`

let nf
const ensureNF = () => {
    if (!nf) {
        nf = import('../../nf.css')
    }
}

const Environment = ({ id, stage, type, name, route, setDbConnectionInstructions, createdAt, startedAt, apiDeployment, stoppedAt, routes = [], className }) => {
    ensureNF()
    const runtime = apiDeployment ? apiDeployment.runtime : undefined
    const lang = langs.find(lang => lang.runtime === (type === 'api' ? runtime : 'html'))
    if (type === 'postgres') {
        return (
            <Env onClick={() => {
                setDbConnectionInstructions(name)
            }}>
                <Octicon icon={LinkExternal} className="ext" />
                <div>
                    <LangLogo><i className={`nf nf-dev-postgresql`} /></LangLogo>
                    <div>
                        <h4>
                            <StatusDot complete/>
                            Postgres DB
                        </h4>
                        <span>Created on {moment(createdAt).format('YYYY-MM-DD [at] HH:mm A')}</span>
                    </div>
                </div>
                <Route>Click for Connection Instructions</Route>
            </Env>
        )
    }

    if (type === 'bucket') {
        return (
            <Env onClick={() => {
            }}>
                <Octicon icon={LinkExternal} className="ext" />
                <div>
                    <LangLogo><i className={`nf nf-dev-bitbucket`} /></LangLogo>
                    <div>
                        <h4>
                            <StatusDot complete/>
                            {name}
                        </h4>
                        <span>Created on {moment(createdAt).format('YYYY-MM-DD [at] HH:mm A')}</span>
                    </div>
                </div>
                <Route>Click to Explore</Route>
            </Env>
        )
    }

    return (
        <Env href={route ? route.url : undefined} target="_blank">
            <Octicon icon={LinkExternal} className="ext" />
            <div>
                <LangLogo>
                    <i className={`nf ${lang ? lang.nerdfontClassName : 'nf-dev-docker'}`} />
                </LangLogo>
                <div>
                    <h4>
                        <StatusDot complete status={stoppedAt ? 'error' : 'success'} />
                        {name}
                    </h4>
                    <span>Created on {moment(startedAt || createdAt).format('YYYY-MM-DD [at] HH:mm A')}</span>
                    {stoppedAt && <span>stopped on {moment(stoppedAt).format('YYYY-MM-DD [at] HH:mm A')}</span>}
                    {stoppedAt && <span>Live for {moment.duration(moment(stoppedAt).diff(startedAt || createdAt)).humanize()}</span>}
                </div>
            </div>
            {route && <Route>{route.url}</Route>}
        </Env>
    )
}


const EnvironmentsContainer = styled.div`
    margin-bottom: 24px;

    padding: 16px 12px;
    border-radius: 4px;
    color: white;
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

    h3 {
        margin-top: -18px !important;
        margin-left: -12px !important;
        width: calc(100% + 24px) !important;

        a, a:hover {
            color: white;
        }
        svg {
            margin-right: 8px;
        }
    }

    ${Env} {
        margin-right: 18px;
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

const Environments = ({ owner, repoName, hasConfig }) => {
    const { loading, error, resources } = useResources({ owner, repoName })
    const [dbConnectionInstructions, setDbConnectionInstructions] = useState(false)

    if (loading) {
        return 'loading...'
    }

    if (error) {
        return error.message
    }

    return (
        <Router>
            <a className="ui button green" style={{ marginBottom: 22 }} href={`/${owner}/${repoName}/${hasConfig ? '_edit' : '_new'}/master/.ultima.yml`}>Edit Project Config</a>

            {resources.map(({ name, id, resources }) => {
                return (
                    <EnvironmentsContainer key={id}>
                        <h3 className="ui top attached header">
                            <a href={`/${owner}/${repoName}/src/branch/${name}`}>
                                <Octicon icon={GitBranch} size={21} />
                                {name}
                            </a>
                        </h3>
                        <h5>Resources</h5>
                        <EnvList>
                            {resources && resources.map(resource => <Environment setDbConnectionInstructions={setDbConnectionInstructions} key={resource.id} {...resource} />)}
                        </EnvList>
                        <h5>Recent Deployments</h5>
                        <DeploymentsContainer>
                            <ActionList owner={owner} repoName={repoName} branch={name} limit={3} onClick={(id) => {
                                window.location.href = window.location.pathname + `/activity/deployments#/${id}`
                            }} />
                        </DeploymentsContainer>
                    </EnvironmentsContainer>
                )
            })}

            <Modal
                isOpen={dbConnectionInstructions}
                onRequestClose={() => setDbConnectionInstructions(false)}
                style={{
                    content: {
                        top                   : '50%',
                        left                  : '50%',
                        right                 : 'auto',
                        bottom                : 'auto',
                        marginRight           : '-50%',
                        transform             : 'translate(-50%, -50%)',
                        background: '#25262f',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxSizing: 'border-box',
                        padding: 0,
                        overflow: 'hidden',
                        width: 420,
                    },
                    overlay: {
                        background: 'rgba(0,0,0,0.5)'
                    }
                }}
                contentLabel="Example Modal"
            >
                <h3 className="ui top attached header">Database Connection</h3>
                <div className="ui attached segment">
                    <p>Install the CLI if you haven't already</p>
                    <p>Open a terminal window</p>
                    <p>Run <code>ultima db</code></p>
                    <p>Choose <code>{dbConnectionInstructions}</code></p>
                    <p>Use the connection info provided to connect to your database</p>
                    {/* <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        flexDirection: 'column',
                    }}> */}
                        <button className="ui button green" onClick={() => setDbConnectionInstructions(false)}>OK</button>
                    {/* </div> */}
                </div>
            </Modal>
        </Router>
    )
}

export default Environments