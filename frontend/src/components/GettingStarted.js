import React from 'react'
import styled from 'styled-components'

import Octicon, { Rocket, Heart, Terminal } from '@primer/octicons-react'

const Welcome = styled.div`
    width: 100%;
    /* height: 150px; */
    background: #353945;
    border-radius: 8px;
    border: 1px solid #404552;
    padding: 8px;
    text-align: center;

    h2 {
        color: #F9F9F9;
        margin-top: 12px;
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

            padding: 8px 0;
            padding-bottom: 6px;

            span {
                margin-top: 12px;
            }
        }
    }
`

const GettingStarted = ({ cliLink }) => {
    return (
        <Welcome>
            <h2>Welcome to the Ultima Alpha</h2>
            <p>In case you get stuck, here are some useful links</p>
            <ul>
                <li>
                    
                    <a target="_blank" href="https://www.notion.so/Alpha-1-ab9d40e30e11442c86810992306da713">
                        <Octicon icon={Rocket} size={32} />
                        <span>Ultima Getting Started</span>
                    </a>
                </li>
                <li>
                    <a onClick={() => cliLink.click()}><Octicon icon={Terminal} size={32}/><span>CLI Login</span></a>
                </li>
                <li>
                    
                    <a target="_blank" href="/community"><Octicon icon={Heart} size={32} />
                    <span>Live Support</span></a>
                </li>
            </ul>
        </Welcome>
    )
}

export default GettingStarted