import React, { useState } from 'react'
import styled from 'styled-components/macro'
import Clipboard from 'react-clipboard.js'
import Octicon, { CheckIcon } from '@primer/octicons-react'

import { Button } from '../../components/Layout'

const Terminal = styled.div`
    background: ${({ theme: { backgroundColor }}) => backgroundColor};
    font-family: monospace;
    border-radius: 3px;

    max-width: 600px;
    width: 100%;
    margin: auto;
    color: ${({ theme: { colorPrimary }}) => colorPrimary};

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
        color: ${({ theme: { colorSecondary }}) => colorSecondary};
    }

    button {
        position: absolute;
        right: -62px;
        top: 3em;
    }
`

const Chrome = styled.div`
    border-bottom: 0.5px solid ${({ theme: { colorSecondary }}) => colorSecondary};
    display: flex;
    flex-direction: row;
    padding: 8px 12px;

    div {
        width: 8px;
        height: 8px;
        border-radius: 100%;
        background: ${({ theme: { colorSecondary }}) => colorSecondary};

        margin-left: 8px;
        :first-child {
            margin-left: 0;
        }
    }
`

export const TerminalContent = () => {
    const [copySuccess, setCopySuccess] = useState(null)
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
                    <code><i>$</i>npm i -g {pkg} {'&&'} \</code>
                    <code><i>$</i>ultima login</code>
                </Body>
            </Terminal>
            <Clipboard component={Button} data-clipboard-text={`npm i -g ${pkg} && ultima login`} onSuccess={() => {
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
            <Octicon icon={CheckIcon} size={56} />
            <h2>Login Complete</h2>
            <p>Now head back to the CLI</p>
        </Container>
    )
}

export default CLI