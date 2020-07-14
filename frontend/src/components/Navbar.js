import React, { useState } from 'react'
import styled, { css } from 'styled-components/macro'
import Octicon, { LogoGithubIcon, TriangleDownIcon, PersonIcon, SignOutIcon } from '@primer/octicons-react'
import { Link } from 'react-router-dom'

import { ControlledCLIModal } from './CLIModal'
import { Grid } from './Layout'

import { ReactComponent as Logo } from './LogoWithText.svg'
import jwtDecode from 'jwt-decode'
import { getToken, clearToken } from '../utils/token'

const Container = styled.div`
    width: 100%;
    height: 52px;
    border-bottom: 1px solid #292929;

    font-family: Inter;
    font-style: normal;
    font-weight: 600;
    font-size: 14px;
    line-height: 17px;
    /* identical to box height */

    letter-spacing: -0.035em;
`

const NavGrid = styled(Grid)`
    align-items: center;
    height: 100%;
`

const Right = styled.div`
    flex: 1;
    justify-content: flex-end;
    display: flex;
    align-items: center;

    a:not(:last-child) {
        margin-right: 36px;
    }
`
const NavLink = styled.a`
    font-family: Inter;
    font-style: normal;
    font-weight: 600;
    font-size: 14px;
    line-height: 17px;
    /* identical to box height */

    letter-spacing: -0.035em;

    color: ${({ theme: { offWhite } }) => offWhite}F;

    opacity: 0.9;
    :hover {
        color: #fff;
        opacity: 1;
    }

    ${({ primary, theme: { colorPrimary } }) => primary && css`
        color: ${colorPrimary};
        :hover {
            color: ${colorPrimary}
        }
    `}
`

const NavLinkLink = styled(NavLink).attrs({ as: Link })``

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
    background: ${({ theme: { backgroundColor } }) => backgroundColor};
    border: 1px solid #565656;
    margin-top: 8px;
    z-index: 999;

    display: flex;
    flex-direction: column;

    a {
        font-size: 1em!important;
        padding: .78571429em 1.14285714em!important;

        :hover {
            color: ${({ theme: { offWhite } }) => offWhite} !important;
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

    ${NavLink} {
        opacity: 0.8;
        :hover {
            opacity: 1;
        }
    }
`

const Avatar = styled.div`
    width: 28px;
    height: 28px;
    border: 1px solid ${({ theme: { offWhite } }) => offWhite}F;
    box-sizing: border-box;
    background-size: cover;
    border-radius: 3px;
    ${({ src }) => css`background-image: url('${src}');`}
`

const UserMenuContainer = styled.div`
    position: relative;
    display: flex;
    color: ${({ theme: { offWhite } }) => offWhite};
    align-items: center;
    cursor: pointer;
    ${Avatar} {
        margin-right: 12px;
    }
`

const UserName = styled.span`
    color: ${({ theme: { offWhite } }) => offWhite};
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
    if (!token) {
        return <NavLink href="/auth/github">Sign in</NavLink>
    }
    return <UserMenuContainer onClick={() => setIsActive(!isActive)}>
        <Avatar src={user.imageUrl} />
        <div>
            <Octicon icon={TriangleDownIcon} />
            <Dropdown isActive={isActive}>
                <UserName>Signed in as {user.username}</UserName>
                <Divider />
                <NavLinkLink to={`/`}>
                    <Octicon width={12} icon={PersonIcon} />
                    Profile
                </NavLinkLink>
                <Divider />
                <NavLink onClick={() => {
                    clearToken()
                    window.location.href = "/auth/logout"
                }}>
                    <Octicon width={12} icon={SignOutIcon} /> Sign Out
                </NavLink>
            </Dropdown>
        </div>
    </UserMenuContainer>
}

const Badge = styled.div`
    background: #363636;
    border: 1px solid #565656;
    box-sizing: border-box;
    border-radius: 2px;
    text-transform: uppercase;
    font-family: Inter;
    font-style: normal;
    font-weight: 600;
    font-size: 12px;
    line-height: 15px;
    /* identical to box height */

    padding: 2px 6px;
    color: ${({ theme: { offWhite } }) => offWhite}F;
`

const Brand = styled.div`
    a {
        color: ${({ theme : { offWhite } }) => offWhite};
        display: flex;
        align-items: center;

        div {
            width: auto;
            transform: scale(0.8);
            margin-left: -8px;
        }
        
        :hover {
            color: ${({ theme : { offWhite } }) => offWhite};
        }
    }
`

const Navbar = () => {
    const [cliModalOpen, setCliModalOpen] = useState(false)

    return (
        <>
            <Container>
                <NavGrid>
                    <Brand>
                        <Link to="/">
                            <div>
                                <Logo />
                            </div>
                            <Badge>alpha</Badge>
                        </Link>
                    </Brand>
                    <Right>
                        <a target="_blank" rel="noopener noreferrer" href="https://github.com/ultimaup/ultima">
                            <Octicon icon={LogoGithubIcon} />
                        </a>
                        <NavLink href="/docs">
                            Docs
                        </NavLink>
                        <NavLink primary title="CLI Login" onClick={() => setCliModalOpen(true)}>
                            Install CLI
                        </NavLink>
                        <UserMenu />
                    </Right>
                </NavGrid>
            </Container>
            <ControlledCLIModal isOpen={cliModalOpen} setIsOpen={setCliModalOpen} />
        </>
    )
}

export default Navbar