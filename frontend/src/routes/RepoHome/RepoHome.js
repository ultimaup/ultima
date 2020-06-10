import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { useParams } from 'react-router-dom'
import { ControlledEditor } from '@monaco-editor/react'
import Octicon, { Versions } from '@primer/octicons-react'

import { ControlledConfigEditor } from '../../components/ConfigEditor'

import useGetUltimaYml from '../../hooks/useGetUltimaYml'

const Container = styled.div`
    display: flex;
    position: relative;
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
const RepoHome = () => {
    const { owner, repo } = useParams()
    const [value, setValue] = useState('')
    const { loading, ultimaYml } = useGetUltimaYml({ owner, repoName: repo, branch: 'master' })

    useEffect(() => {
        if (!value && ultimaYml) {
            setValue(ultimaYml)
        }
    }, [ultimaYml])

    return (
        <div className="repository file list">
            <GiteaStyles />
            <div className="header-wrapper">
                <div className="ui container">
                    <div className="repo-header">
                        <div class="ui huge breadcrumb repo-title">
                            <a href="/joshbalfour">joshbalfour</a>
                            <div class="divider"> / </div>
                            <a href="/joshbalfour/testing17">testing17</a>
                        </div>
                    </div>
                </div>
                <div className="ui tabs container">
                    <div className="ui tabular stackable menu navbar">
                        <a className="active item">
                            <Octicon icon={Versions} />&nbsp;
                            Environments
                        </a>
                    </div>
                </div>
            </div>
            <div className="ui container">
                <Container>
                    <ConfigEditorContainer className="ui form">
                        <h3 className="ui top attached header" style={{
                            position: 'absolute',
                            width: '100%',
                            zIndex: 10,
                            top: 0,
                        }}>
                            Manage Project Config
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
        </div>
    )
}

export default RepoHome