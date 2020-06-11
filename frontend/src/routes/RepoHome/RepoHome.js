import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useParams, Route, Switch, NavLink } from 'react-router-dom'
import { ControlledEditor } from '@monaco-editor/react'
import Octicon, { Versions, Rocket, Pulse, MarkGithub, Code } from '@primer/octicons-react'

import { ControlledConfigEditor } from '../../components/ConfigEditor'
import NavBar from '../../components/Navbar'
import Environments from '../Environments'
import Deployments from '../Deployments'

import useGetUltimaYml from '../../hooks/useGetUltimaYml'
import useSetUltimaYml from '../../hooks/useSetUltimaYml'

import CommitChanges from './CommitChanges'
import Logs from '../Logs/Logs'

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

const GiteaStyles = () => (
    <>
        <link rel="stylesheet" href="/vendor/assets/font-awesome/css/font-awesome.min.css"/>
        <link rel="preload" as="font" href="/fomantic/themes/default/assets/fonts/icons.woff2" type="font/woff2" crossorigin="anonymous"/>
        <link rel="preload" as="font" href="/fomantic/themes/default/assets/fonts/outline-icons.woff2" type="font/woff2" crossorigin="anonymous"/>



        <link rel="stylesheet" href="/fomantic/semantic.min.css?v=9245442d00d25735b3aa4bc8621e29f9" />
        <link rel="stylesheet" href="/css/index.css?v=9245442d00d25735b3aa4bc8621e29f9"></link>
        <link rel="stylesheet" href="/css/theme-arc-green.css?v=9245442d00d25735b3aa4bc8621e29f9"></link>

        <link rel="stylesheet" href="/assets/gitea.css" />
    </>
)

// repository file list
const EditConfig = () => {
    const { owner, repoName, branch = 'master' } = useParams()
    const [value, setValue] = useState('')
    const { loading, ultimaYml } = useGetUltimaYml({ owner, repoName, branch })
    const { setUltimaYml } = useSetUltimaYml({ owner, repoName })

    console.log('ultimaYml', ultimaYml)

    useEffect(() => {
        if (!value && ultimaYml && ultimaYml.content) {
            setValue(ultimaYml.content)
        }
    }, [ultimaYml])

    return (
        <>
            
            <div className="ui container">
                <Container>
                    <ConfigEditorContainer className="ui form">
                        <h3 className="ui top attached header" style={{
                            position: 'absolute',
                            width: '100%',
                            zIndex: 10,
                            top: 0,
                        }}>
                            Manage Environment Config
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

const RepoHome = () => {
    const { owner, repoName, branch = 'master' } = useParams()

    return (
        <>
            <GiteaStyles />
            <div className="repository file list" style={{ paddingTop: 0 }}>
                <NavBar />
                <div className="header-wrapper" style={{ marginTop: 0, marginBottom: 0 }}>
                    <div className="ui container" >
                        <div className="repo-header"style={{ marginTop: 8, marginBottom: 12 }}>
                            <div class="ui huge breadcrumb repo-title">
                                <a href={`/repo/${owner}`}>{owner}</a>
                                <div class="divider"> / </div>
                                <a href={`/repo/${owner}/${repoName}`}>{repoName}</a>
                            </div>
                        </div>
                    </div>
                    <div className="ui tabs container">
                        <div className="ui tabular stackable menu navbar">
                            <NavLink className="item" activeClassName="active" to={`/repo/${owner}/${repoName}/`} exact>
                                <Octicon icon={Versions} />&nbsp;
                                Environments
                            </NavLink>
                            <NavLink className="item" activeClassName="active" to={`/repo/${owner}/${repoName}/deployments`}>
                                <Octicon icon={Rocket} />&nbsp;
                                Deployments
                            </NavLink>
                            <NavLink className="item" activeClassName="active" to={`/repo/${owner}/${repoName}/logs`}>
                                <Octicon icon={Pulse} />&nbsp;
                                Logs
                            </NavLink>
                            <NavLink className="item" activeClassName="active" to={`/repo/${owner}/${repoName}/logs`}>
                                <Octicon icon={MarkGithub} />&nbsp;
                                Code
                            </NavLink>
                        </div>
                    </div>
                </div>
                <div className="ui container" style={{ marginTop: 12 }}>
                    <Switch>
                        <Route path="/repo/:owner/:repoName/deployments" component={Deployments}/>
                        <Route path="/repo/:owner/:repoName/logs" component={Logs}/>
                        <Route path="/repo/:owner/:repoName/:branch/config" component={EditConfig}/>
                        <Route path="/repo/:owner/:repoName/" component={() => <Environments owner={owner} repoName={repoName} />}/>
                    </Switch>
                </div>
            </div>
        </>
    )
}

export default RepoHome