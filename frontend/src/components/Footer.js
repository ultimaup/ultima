import React from 'react'
import styled from 'styled-components/macro'
import { Link } from 'react-router-dom'

import { Grid } from './Layout'

const SFooter = styled.footer`
    height: 40px;
    margin-top: 32px;
    border-top: none;
    color: ${({ theme: { offWhite } }) => offWhite};
`

const Links = styled.div`
    a:not(:last-child) {
        margin-right: 12px;
    }
`

const FGrid = styled(Grid)`
    justify-content: space-between;
    max-width: none;
    border-top: 1px solid #292929;
    padding-top: 16px;
    padding-bottom: 16px;
`

const Footer = () => (
    <SFooter>
        <FGrid>
            <div>
                &copy; Ultima Technology Ltd 2020
            </div>
            <Links>
                <a target="_blank" rel="noopener noreferrer" href="mailto:josh@onultima.com">Contact Us</a>
                <a target="_blank" rel="noopener noreferrer" href="https://status.onultima.com">Service Status</a>
                <Link to="/legals/terms">Terms and Conditions</Link>
                <Link to="/legals/privacy">Privacy Policy</Link>
                <Link to="/legals/aup">Acceptable Use Policy &amp; DMCA</Link>
            </Links>
        </FGrid>
    </SFooter>
)

export default Footer