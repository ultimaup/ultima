import React, { useState, useEffect } from 'react'
import styled from 'styled-components/macro'
import { useParams, Route, Switch, NavLink, Link, useLocation } from 'react-router-dom'
import { ControlledEditor } from '@monaco-editor/react'
import Octicon, { Versions, Rocket, Pulse, MarkGithub, LinkExternal, Repo, Lock } from '@primer/octicons-react'

import { ControlledConfigEditor } from '../../components/ConfigEditor'
import NavBar from '../../components/Navbar'
import Environments from '../Environments'
import Deployments from '../Deployments'

import { Grid, Button } from '../../components/Layout'
import { Header } from '../../components/RepoList/RepoList'

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
    flex-direction: column;
    position: relative;
    width: 100%;
    margin-top: 16px;
    border: 1px solid #292929;

    p { 
        font-size: 100% !important;
    }
`

const ConfigEditorContainer = styled.div`
    flex: 1;
    position: initial !important;
`

const EditorContainer = styled.div`
    background-color: #1e1e1e;
`

const Columns = styled.div`
    display: flex;
    flex-direction: row;
`

export const Editor = ({ title, value, setValue }) => (
    <Container>
        <Header>
            {title}
        </Header>
        <Columns>
            <ConfigEditorContainer>
                <ControlledConfigEditor value={value} setValue={setValue} />
            </ConfigEditorContainer>
            <EditorContainer>
                <ControlledEditor
                    height="100%"
                    language="yaml"
                    width="500px"
                    value={value}
                    theme="vs-dark"
                    onChange={(ev, value) => {
                        setValue(value)
                    }}
                />
            </EditorContainer>
        </Columns>
        
    </Container>
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
            <CommitChanges 
                branch={branch} 
                fileContentsChanged={!!value} 
                style={{
                    marginTop: 16,
                }}
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
        <Grid>
            <Container>
                {loading ? <LoadingSpinner /> : (
                    repo ? (
                        <EditConfig title="Create Environment Config" />
                    ) : (
                        <>
                            <span>Use Ultima to ship your projects faster</span>
                            <Button href={`/vcs/${vcsHost.split('.com')[0]}`}>Link with {vcsHost.split('.com')[0]}</Button>
                        </>
                    )
                )}
            </Container>
        </Grid>
    )
}

const RepoHeader = styled.div`
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
    margin-bottom: 16px;
`

const RepoHome = () => {
    const { owner, repoName } = useParams()
    const { repo } = useRepo({ repoName, owner })
    return (
        <>
            <NavBar />
            <RepoHeader>
                <HeaderGrid>
                    <RepoName>
                        <Octicon size={21} icon={(repo && repo.private) ? Lock : Repo} />
                        <Link to="/">{owner}</Link>
                        <span>/</span>
                        <Link to={`/repo/${owner}/${repoName}`}>{repoName}</Link>
                    </RepoName>
                    <Tabs>
                        <NavLink activeClassName="active" to={`/repo/${owner}/${repoName}/`} exact>
                            <Octicon icon={Versions} />&nbsp;
                            Environments
                        </NavLink>
                        <NavLink activeClassName="active" to={`/repo/${owner}/${repoName}/deployments`}>
                            <Octicon icon={Rocket} />&nbsp;
                            Deployments
                            <DeploymentNotification repoName={repoName} owner={owner} />
                        </NavLink>
                        <NavLink activeClassName="active" to={`/repo/${owner}/${repoName}/logs`}>
                            <Octicon icon={Pulse} />&nbsp;
                            Logs
                        </NavLink>
                        {repo && repo.vcs === 'github' && (
                            <a target="_blank" href={`https://github.com/${owner}/${repoName}`}>
                                <Octicon icon={MarkGithub} />&nbsp;
                                View on GitHub
                            </a>
                        )}
                        {repo && repo.vcs === 'gitea' && (
                            <a target="_blank" href={`/${owner}/${repoName}`}>
                                <Octicon icon={LinkExternal} />&nbsp;
                                View in Legacy UI
                            </a>
                        )}
                    </Tabs>
                </HeaderGrid>
            </RepoHeader>
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