import React, { useState, useEffect } from 'react'
import styled from 'styled-components/macro'
import { useParams, Route, Switch, NavLink, Link, useLocation } from 'react-router-dom'
import { ControlledEditor } from '@monaco-editor/react'
import Octicon, { Versions, Rocket, Pulse, MarkGithub, LinkExternal, Repo, Lock } from '@primer/octicons-react'

import { ControlledConfigEditor } from '../../components/ConfigEditor'
import NavBar from '../../components/Navbar'
import Environments from '../Environments'
import Deployments from '../Deployments'

import { Grid } from '../../components/Layout'

import useGetUltimaYml from '../../hooks/useGetUltimaYml'
import useSetUltimaYml from '../../hooks/useSetUltimaYml'

import CommitChanges from './CommitChanges'
import Logs from '../Logs/Logs'
import useRepo from '../../hooks/useRepo'
import DeploymentNotification from '../../components/DeploymentNotification'
import Footer from '../../components/Footer'
import LoadingSpinner from '../../components/Loading'

const Container = styled.div`
    display: flex;
    position: relative;
    margin-top: 16px;

    p { 
        font-size: 100% !important;
    }
`

const ConfigEditorContainer = styled.div`
    flex: 1;
    position: initial !important;
`

const EditorContainer = styled.div`
    padding-top: 42px;
`

export const Editor = ({ title, value, setValue }) => (
    <div className="ui container">
        <Container>
            <ConfigEditorContainer className="ui form">
                <h3 className="ui top attached header" style={{
                    position: 'absolute',
                    width: '100%',
                    zIndex: 10,
                    top: 0,
                }}>
                    {title}
                </h3>

                <div className="ui attached segment" style={{ marginTop: 42, borderBottom: 'none' }}>
                    <ControlledConfigEditor value={value} setValue={setValue} />
                </div>
            </ConfigEditorContainer>
            <EditorContainer>
                <ControlledEditor
                    height="90vh"
                    language="yaml"
                    width="600px"
                    value={value}
                    theme="vs-dark"
                    onChange={(ev, value) => {
                        setValue(value)
                    }}
                />
            </EditorContainer>
        </Container>
    </div>
)

const EditConfig = ({ title= 'Manage Environment Config' }) => {
    const { owner, repoName, branch = 'master' } = useParams()
    const [value, setValue] = useState('')
    const { loading, ultimaYml } = useGetUltimaYml({ owner, repoName, branch })
    const { setUltimaYml } = useSetUltimaYml({ owner, repoName })

    useEffect(() => {
        if (!value && ultimaYml && ultimaYml.content) {
            setValue(ultimaYml.content)
        }
    }, [ultimaYml])

    return (
        <>
            <Editor title={title} value={value} setValue={setValue} />
            <div className="ui container form repository file editor">
                <CommitChanges 
                    branch={branch} 
                    fileContentsChanged={!!value} 
                    onSubmit={({ commitMessage, description, branchName }) => {
                        setUltimaYml({
                            commitMessage, 
                            commitDescription:description,
                            branch: branchName || branch,
                            value,
                            sha: ultimaYml.sha,
                        }).then(() => {
                            window.location.href = `/repo/${owner}/${repoName}/${branchName || branch}`
                        }).catch(e => {
                            console.error(e)
                        })
                    }}
                />
            </div>
        </>
    )
}

const Integrate = () => {
    const { owner, repoName } = useParams()
    const location = useLocation()
    const { repo, loading } = useRepo({ repoName, owner })
    const urlParams = new URLSearchParams(location.search)
    const vcsHost = urlParams.get('vcsHost')

    return (
        <div className="ui container">
            <Container>
                {loading ? <LoadingSpinner /> : (
                    repo ? (
                        <EditConfig title="Create Environment Config" />
                    ) : (
                        <>
                            <span>Use Ultima to ship your projects faster</span>
                            <a className="ui button green" href={`/vcs/${vcsHost.split('.com')[0]}`}>Link with {vcsHost.split('.com')[0]}</a>
                        </>
                    )
                )}
            </Container>
        </div>
    )
}

const Header = styled.div`
    background: #292929;
    margin-bottom: 23px;
`

const RepoName = styled.div`
    font-family: Inter;
    font-style: normal;
    font-size: 20px;
    line-height: 24px;
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;

    color: ${({ theme: { colorPrimary } }) => colorPrimary};

    span {
        color: #7B7C7F;
        margin-left: 8px;
        margin-right: 8px;
    }

    a:not(:last-child) {
        font-weight: 600;
    }

    svg {
        margin-right: 6px;
        opacity: 0.6;
    }
`

const HeaderGrid = styled(Grid)`
    flex-direction: column;

    ${RepoName} {
        margin-top: 24px;
        margin-bottom: 24px;
    }
`

const Tabs = styled.div`
    a {
        display: inline-block;
        position: relative;
        border-radius: 4px;
        padding: 16px 21px;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        color: ${({ theme: { colorPrimary } }) => colorPrimary};
    }

    a.active {
        font-weight: bold;
        background: #181818;
    }
`

const Body = styled.div`
    width: 100%;
`

const RepoHome = () => {
    const { owner, repoName } = useParams()
    const { repo } = useRepo({ repoName, owner })
    return (
        <>
            <NavBar />
            <Header>
                <HeaderGrid>
                    <RepoName>
                        <Octicon size={21} icon={(repo && repo.private) ? Lock : Repo} className="svg" />
                        <Link to="/">{owner}</Link>
                        <span>/</span>
                        <Link to={`/repo/${owner}/${repoName}`}>{repoName}</Link>
                    </RepoName>
                    <Tabs>
                        <NavLink className="item" activeClassName="active" to={`/repo/${owner}/${repoName}/`} exact>
                            <Octicon icon={Versions} />&nbsp;
                            Environments
                        </NavLink>
                        <NavLink className="item" activeClassName="active" to={`/repo/${owner}/${repoName}/deployments`}>
                            <Octicon icon={Rocket} />&nbsp;
                            Deployments
                            <DeploymentNotification repoName={repoName} owner={owner} />
                        </NavLink>
                        <NavLink className="item" activeClassName="active" to={`/repo/${owner}/${repoName}/logs`}>
                            <Octicon icon={Pulse} />&nbsp;
                            Logs
                        </NavLink>
                        {repo && repo.vcs === 'github' && (
                            <a className="item" target="_blank" href={`https://github.com/${owner}/${repoName}`}>
                                <Octicon icon={MarkGithub} />&nbsp;
                                View on GitHub
                            </a>
                        )}
                        {repo && repo.vcs === 'gitea' && (
                            <a className="item" target="_blank" href={`/${owner}/${repoName}`}>
                                <Octicon icon={LinkExternal} />&nbsp;
                                View in Legacy UI
                            </a>
                        )}
                    </Tabs>
                </HeaderGrid>
            </Header>
            <Grid>
                <Body>
                    <Switch>
                        <Route path="/repo/:owner/:repoName/deployments" component={Deployments}/>
                        <Route path="/repo/:owner/:repoName/logs" component={Logs}/>
                        <Route path="/repo/:owner/:repoName/:branch/config" component={EditConfig}/>
                        <Route path="/repo/:owner/:repoName/integrate" component={Integrate}/>
                        <Route path="/repo/:owner/:repoName/" component={() => <Environments owner={owner} repoName={repoName} />}/>
                    </Switch>
                </Body>
            </Grid>
            <Footer />
        </>
    )
}

export default RepoHome