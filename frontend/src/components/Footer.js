import React from 'react'
import styled from 'styled-components'

const SFooter = styled.footer`
    height: 40px;
    border-top: none;
`

const Footer = () => (
    <SFooter>
        <div class="ui container">
            <div class="ui left">
                &copy; Ultima Technology Ltd 2020
            </div>
            <div class="ui right links">
                <a target="_blank" rel="noopener noreferrer" href="mailto:josh@onultima.com">Contact Us</a>
                <a target="_blank" rel="noopener noreferrer" href="https://status.onultima.com">Service Status</a>
                <a target="_blank" rel="noopener noreferrer" href="/legals/terms">Terms and Conditions</a>
                <a target="_blank" rel="noopener noreferrer" href="/legals/privacy">Privacy Policy</a>
                <a target="_blank" rel="noopener noreferrer" href="/legals/aup">Acceptable Use Policy &amp; DMCA</a>
            </div>
        </div>
    </SFooter>
)

export default Footer