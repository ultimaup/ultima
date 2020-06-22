import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import Octicon, { Terminal, Plus, TriangleDown, Person, SignOut } from '@primer/octicons-react'
import { Link } from 'react-router-dom'

import { ControlledCLIModal } from './CLIModal'
import GiteaStyles from './GiteaStyles'

import { ReactComponent as Logo } from './LogoWithText.svg'
import jwtDecode from 'jwt-decode'
import { getToken, clearToken } from '../utils/token'

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
        margin-right: 36px;
    }
`

const Divider = styled.div`
    border-top: 1px solid rgba(34,36,38,.1);
    height: 0;
    margin: .25em 0;
`

const Dropdown = styled.div`
    max-height: 0;
    width: 185px;
    transition: opacity, max-height 0.15s ease-out;
    overflow: hidden;
    position: absolute;
    right: 0;
    opacity: 0;
    pointer-events: none;
    border: 1px solid #434444;
    background: #2c303a;
    margin-top: 8px;
    z-index: 999;

    display: flex;
    flex-direction: column;

    a {
        font-size: 1em!important;
        padding: .78571429em 1.14285714em!important;

        :hover {
            color: white !important;
        }

        svg {
            margin-right: .75em;
        }
    }

    ${({ isActive }) => isActive && css`
        max-height: 500px;
        transition: opacity, max-height 0.25s ease-in;
        pointer-events: auto;
        opacity: 1;
    `}
`

const Avatar = styled.div`
    width: 24px;
    height: 24px;
    border-radius: 3px;
    background-size: cover;
    ${({ src }) => css`background-image: url('${src}');`}
`

const UserMenuContainer = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
    ${Avatar} {
        margin-right: 12px;
    }
`

const UserName = styled.span`
    color: white;
    text-transform: uppercase;
    color: #dbdbdb;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: .8em;
    font-weight: bold;
    margin: 1rem 0 .75rem;
    text-align: center;
    font-weight: 700;
    text-transform: uppercase;
`

const UserMenu = () => {
    const [isActive, setIsActive] = useState(false)
    const token = getToken()
    const user = token ? jwtDecode(token) : {}
    return <UserMenuContainer onClick={() => setIsActive(!isActive)}>
        <Avatar src={user.imageUrl} />
        <div>
            <Octicon icon={TriangleDown} />
            <Dropdown isActive={isActive}>
                <UserName>Signed in as {user.username}</UserName>
                <Divider />
                <a href={`/${user.username}`}>
                    <Octicon width={12} icon={Person} />
                    Profile
                </a>
                <Divider />
                <a onClick={() => {
                    clearToken()
                    window.location.href = "/auth/logout"
                }}>
                    <Octicon width={12} icon={SignOut} /> Sign Out
                </a>
            </Dropdown>
        </div>
    </UserMenuContainer>
}

const Navbar = () => {
    const [cliModalOpen, setCliModalOpen] = useState(false)

    return (
        <>
            <GiteaStyles />
            <Container>
                <Grid>
                    <div className="item brand">
                        <Link to="/" style={{
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
                        </Link>
                    </div>
                    <Right>
                        <a title="CLI Login" className="cli-link" onClick={() => setCliModalOpen(true)}>
                            <Octicon icon={Terminal} width={24} />
                        </a>
                        <Link title="Create new Repository" to="/repo/create">
                            <Octicon icon={Plus} width={12} />
                        </Link>
                        <UserMenu />
                    </Right>
                </Grid>
            </Container>
            <ControlledCLIModal isOpen={cliModalOpen} setIsOpen={setCliModalOpen} />
        </>
    )
}

export default Navbar