import React, { useState } from 'react'
import styled from 'styled-components'
import Clipboard from 'react-clipboard.js'
import Octicon, { Check } from '@primer/octicons-react'

import { LoginBtn } from '../Login/Login'
import { getToken } from '../../utils/token'

const Terminal = styled.div`
    background: black;
    color: #008F11;
    font-family: monospace;
    border-radius: 3px;

    max-width: 600px;
    margin: auto;

    box-shadow: inset 0 1px 0 rgba(255,255,255,0), 0 22px 70px 4px rgba(0,0,0,0.56), 0 0 0 1px rgba(0, 0, 0, 0.0);
    code {
        overflow: hidden;
    }
`

const Container = styled.div`
    align-items: center;
    display: flex;
    flex-direction: column;
    padding-top: 70px;

    h2 {
        margin-bottom: 1em;
        margin-top: 1em;
        font-family: 'Steradian';
        font-size: 24px;
        font-weight: bold;
    }
    p {
        margin-bottom: 0.5em;
        text-align: center;
        font-family: 'Inter';
    }
`

const Body = styled.div`
    padding: 12px;
    line-height: 110%;
    position: relative;
    
    code {
        display: block;
        margin-bottom: 8px;
        :last-child {
            margin-bottom: 0;
        }
    }
    i {
        user-select: none;
        margin-right: 8px;
        color: #003B00;
    }

    button {
        position: absolute;
        right: -62px;
        top: 3em;
    }
`

const Chrome = styled.div`
    border-bottom: 0.5px solid #003B00;
    display: flex;
    flex-direction: row;
    padding: 8px 12px;

    div {
        width: 8px;
        height: 8px;
        border-radius: 100%;
        background: #003B00;

        margin-left: 8px;
        :first-child {
            margin-left: 0;
        }
    }
`

export const TerminalContent = () => {
    const [copySuccess, setCopySuccess] = useState(null)
    const token = getToken()
    const pkg = "@ultimaup/cli"

    return (
        <>
            <Terminal>
                <Chrome>
                    <div />
                    <div />
                    <div />
                </Chrome>
                <Body>
                    {!token && <LoginBtn />}
                    <code><i>$</i>npm i -g {pkg} {'&&'} \</code>
                    <code><i>$</i>ultima login {token}</code>
                </Body>
            </Terminal>
            <Clipboard className="ui button green" data-clipboard-text={`npm i -g ${pkg} && ultima login ${token}`} onSuccess={() => {
                setCopySuccess(true)
                setTimeout(() => {
                    setCopySuccess(false)
                }, 1000)
            }}>
                {copySuccess ? 'Copied' : 'Copy'}
            </Clipboard>
        </>
    )
}

const CLI = () => {
    return (
        <Container>
            <Octicon icon={Check} size={56} />
            <h2>Login Complete</h2>
            <p>Now head back to the CLI</p>
        </Container>
    )
}

export default CLI