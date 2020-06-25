import React, { useState } from 'react'
import styled from 'styled-components/macro'
import { transparentize } from 'polished'

import Octicon, { Rocket, Heart, Terminal } from '@primer/octicons-react'
import { ControlledCLIModal } from './CLIModal'

const Welcome = styled.div`
    width: 100%;
    /* height: 150px; */
    border-radius: 7px;
    border: 1px solid #292929;
    padding: 18px;
    text-align: center;
    color: ${({ theme: { offWhite } }) => transparentize(0.4)(offWhite)};

    h2 {
        color: ${({ theme: { offWhite } }) => offWhite};
        margin-top: 12px;
        font-family: Roboto;
        font-style: normal;
        font-weight: bold;
        font-size: 24px;
        line-height: 28px;
        text-align: center;
    }

    ul {
        display: flex;
        justify-content: space-between;
        list-style: none;
        padding: 0;
        margin: 0;

        li, li a {
            text-align: center;
            padding: 0;
            margin: 0;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;

            color: ${({ theme : { colorPrimary } }) => colorPrimary};

            padding: 8px 0;
            padding-bottom: 6px;

            span {
                margin-top: 12px;
            }
        }
    }
`

const GettingStarted = () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <Welcome>
                <h2>Welcome to the Ultima Alpha</h2>
                <p>In case you get stuck, here are some useful links</p>
                <ul>
                    <li>
                        
                        <a target="_blank" rel="noopener noreferrer" href="/docs">
                            <Octicon icon={Rocket} size={32} />
                            <span>Ultima Getting Started</span>
                        </a>
                    </li>
                    <li>
                        <a onClick={() => setIsOpen(true)}><Octicon icon={Terminal} size={32}/><span>CLI Login</span></a>
                    </li>
                    <li>
                        
                        <a target="_blank" href="/community"><Octicon icon={Heart} size={32} />
                        <span>Live Support</span></a>
                    </li>
                </ul>
            </Welcome>
            <ControlledCLIModal isOpen={isOpen} setIsOpen={setIsOpen} />
        </>
    )
}

export default GettingStarted