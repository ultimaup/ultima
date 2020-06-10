import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import Octicon, { Terminal, Plus } from '@primer/octicons-react'

import { ControlledCLIModal } from './CLIModal'

import { ReactComponent as Logo } from './LogoWithText.svg'
import jwtDecode from 'jwt-decode'

const Container = styled.div`
    width: 100%;
    height: 52px;background: #2e323e;
    border-bottom: 1px solid #313131;
`

const Grid = styled.div`
    max-width: 1127px;
    width: 100%;
    margin: auto;
    display: flex;
    height: 100%;
    align-items: center;
`

const Right = styled.div`
    flex: 1;
    justify-content: flex-end;
    display: flex;
    align-items: center;

    a:not(.cli-link) {
        color: #9e9e9e!important;
    }

    a:not(:last-child) {
        margin-right: 12px;
    }

`

const Dropdown = styled.div`
    max-height: 0;
    transition: max-height 0.15s ease-out;
    overflow: hidden;
    ${({ isActive }) => css`
        max-height: 500px;
        transition: max-height 0.25s ease-in;
    `}
`

const UserMenu = () => {
    const [isActive, setIsActive] = useState(false)

    
}

const Navbar = () => {
    const [cliModalOpen, setCliModalOpen] = useState(false)

    return (
        <>
            <Container>
                <Grid>
                    <div className="item brand">
                        <a href="/" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginLeft: -12,
                        }}>
                            <div style={{
                                width: 'auto',
                                transform: 'scale(0.8)',
                                marginTop: 4,
                            }}>
                                <Logo />
                            </div>
                            <span className="badge" style={{ marginLeft: 1 }}>alpha</span>
                        </a>
                    </div>
                    <Right>
                        <a className="cli-link" onClick={() => setCliModalOpen(true)}>
                            <Octicon icon={Terminal} width={24} />
                        </a>
                        <a href="/repo/create">
                            <Octicon icon={Plus} width={12} />
                        </a>
                        <UserMenu />
                    </Right>
                </Grid>
            </Container>
            <ControlledCLIModal isOpen={cliModalOpen} setIsOpen={setCliModalOpen} />
        </>
    )
}

export default Navbar