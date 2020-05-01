import React, { useState } from 'react'
import styled from 'styled-components'
import Clipboard from 'react-clipboard.js'

import { LoginBtn } from '../Login/Login'

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
    }
    p {
        margin-bottom: 0.5em;
        text-align: center;
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

const CLI = () => {
    const [copySuccess, setCopySuccess] = useState(null)
    const token = localStorage.getItem('token')
    const pkg = "@ultimaup/cli"

    if (!token) {
        window.location.href = '/user/login?redirect_to=/cli'
    }

    return (
        <Container>
            <h2>Ultima CLI</h2>
            <p>Make sure you have <a href="https://nodejs.org/en/">nodejs</a> installed <br />then just run the following commands in your terminal to get started:</p>
            <Terminal>
                <Chrome>
                    <div />
                    <div />
                    <div />
                </Chrome>
                <Body>
                    {!token && <LoginBtn />}
                    <code><i>$</i>npm i -g {pkg}</code>
                    <code><i>$</i>ultima login {token}</code>
                    <Clipboard data-clipboard-text={`ultima login ${token}`} onSuccess={() => {
                        setCopySuccess(true)
                        setTimeout(() => {
                            setCopySuccess(false)
                        }, 1000)
                    }}>
                        {copySuccess ? 'Copied' : 'Copy'}
                    </Clipboard>
                    <code><i>$</i>ultima dev</code>
                </Body>
            </Terminal>
            <a href="/" style={{ marginTop: 32 }}>
               {'<--'} Back to Ultima
            </a>
        </Container>
    )
}

export default CLI