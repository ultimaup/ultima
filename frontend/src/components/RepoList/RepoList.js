import React, { useState } from 'react'
import styled, { css } from 'styled-components/macro'
import Octicon, { MarkGithub, Lock, Repo, Plus } from '@primer/octicons-react'
import { Link } from 'react-router-dom'

import useRepositories from '../../hooks/useRepositories'
import useLegacyRepositories from '../../hooks/useLegacyRepositories'

import { Button } from '../Layout'

const Badge = styled.span`
    display: inline-block;
    padding: 2px 6px;
    border: 0.5px solid #87ab63;
    border-radius: 4px;
    font-weight: bold;

    :hover {
        background: rgba(135, 171, 99, 0.2);
    }

    ${({ color }) => color === 'grey' && css`
        font-size: 0.8em;
        margin-top: -.29165em;
        padding: 4px 8px;
        font-weight: 700;
        line-height: 1;
        border: none;
        background: rgba(255,255,255,0.1);
    
        :hover {
            background: rgba(255,255,255,0.1);
        }
    `}
`

const SmallLogo = () => (
    <svg width={30} height={30} style={{ zoom: 0.5, marginRight: 0 }}>
        <g filter="url(#filter0_i)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.6891 1.89917C9.85214 0.689499 12.3456 0 15 0C23.2843 0 30 6.71573 30 15C30 23.2843 23.2843 30 15 30C6.71573 30 0 23.2843 0 15C0 11.8307 0.98293 8.89089 2.66058 6.46891C3.28041 7.12908 4.1611 7.54143 5.13811 7.54143C7.01465 7.54143 8.5359 6.02019 8.5359 4.14364C8.5359 3.28337 8.21619 2.49777 7.6891 1.89917ZM6.46408 15C6.46408 10.2857 10.2857 6.46408 15 6.46408C19.7142 6.46408 23.5359 10.2857 23.5359 15C23.5359 19.7142 19.7142 23.5359 15 23.5359C10.2857 23.5359 6.46408 19.7142 6.46408 15Z" fill="currentColor"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.68912 1.89918C5.68414 3.02045 3.96302 4.58865 2.6606 6.46893C2.08989 5.8611 1.74033 5.04319 1.74033 4.14364C1.74033 2.26709 3.26157 0.74585 5.13812 0.74585C6.15439 0.74585 7.06646 1.19202 7.68912 1.89918Z" fill="currentColor"></path>
        </g>    
    </svg>
)

const SmallLogoContainer = styled.div`
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: flex-end;
`

const Name = styled.span`
    font-style: normal;
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    /* identical to box height */

    letter-spacing: -0.025em;
`

const StyledRLI = styled.li`
    svg {
        opacity: 0.65;
        margin-right: 4px;
    }
    a {
        display: flex !important;
        align-items: center;
    }
`

const RepoLink = styled(Link)`
    display: flex;
    padding: 9px 14px;
    color: ${({ theme: { colorSecondary } }) => colorSecondary};

    ${Name} {
        margin-left: 6px;
    }
`

const RepoListItem = ({ id, isPrivate, name, onAddRepo, isUltima, vcsHost }) => (
    <StyledRLI>
        <RepoLink to={isUltima ? `/repo/${name}` : `/repo/${name}/integrate?vcsHost=${vcsHost}`}>
            <Octicon icon={isPrivate ? Lock : Repo} />
            <Name>{name}</Name>
            <SmallLogoContainer>
                {isUltima ?  null : <Button onClick={() => onAddRepo(id)}>Add</Button>}
            </SmallLogoContainer>
        </RepoLink>
    </StyledRLI>
)

const EmptyState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 12px;
    a {
        margin-top: 12px !important;
    }
`

const RepoListContainer = styled.div`
    margin-bottom: 24px !important;
    border: 1px solid #292929;

    ul {
        padding-top: 4px;
        padding-bottom: 4px;
    }
`

export const Header = styled.h4`
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    border-radius: 3px;
    padding: 12px 16px;
    margin-bottom: 0;

    font-style: normal;
    font-weight: bold;
    font-size: 15px;
    line-height: 18px;

    color: #A6A6A6;

    background: #292929;
    color: ${({ theme: { offWhite } }) => offWhite};

    ${Badge} {
        margin-left: 7px;
    }
`

const Action = styled.a`
    color: ${({ theme: { colorPrimary } }) => colorPrimary};
`

const GithubRepoList = () => {
    const { loading, repositories } = useRepositories()
    const [onlyUltima, setOnlyUltima] = useState(true)
    const displayedRepos = repositories ? repositories.filter(r => onlyUltima ? r.isUltima : true) : []

    return (
        <>
            <RepoListContainer>
                <Header>
                    <div>
                        <Octicon icon={MarkGithub} /> &nbsp;
                        GitHub Repositories 
                        <Badge color="grey">{repositories ? repositories.filter(r => r.isUltima).length : ''}</Badge> 
                    </div>
                    <div>
                        <Action onClick={() => {
                            setOnlyUltima(!onlyUltima)
                        }}>
                            {!loading && repositories.length !== 0 && displayedRepos.length === 0 && (
                                <>
                                    Add a GitHub Repo&nbsp;
                                </>
                            )}
                            <div style={{
                                transform: onlyUltima ? undefined : 'rotate(45deg)',
                            }}>
                                <Octicon icon={Plus} />
                            </div>
                        </Action>
                    </div>
                </Header>

                <ul>
                    {loading ? <li>Loading...</li> : (
                        displayedRepos.map(repo => (<RepoListItem vcsHost="github.com" onAddRepo={id => {}} key={repo.id} id={repo.id} isUltima={repo.isUltima} isPrivate={repo.private} name={repo.full_name} />))
                    )}
                    {!loading && repositories.length === 0 && (
                        <EmptyState>
                            <span>Use Ultima to ship your GitHub projects faster</span>
                            <a className="ui button green" href={`/vcs/github`}>Link with GitHub</a>
                        </EmptyState>
                    )}
                </ul>
            </RepoListContainer>
        </>
    )
}

const UltimaRepoList = () => {
    const { loading, repositories } = useLegacyRepositories()
    const displayedRepos = repositories ? repositories : []

    return displayedRepos.length ? (
        <>
            <RepoListContainer>
                <Header>
                    <div>
                        Legacy Repositories 
                        <Badge color="grey">{repositories ? repositories.length : ''}</Badge>
                    </div>
                </Header>

                <ul>
                    {loading ? <li>Loading...</li> : (
                        displayedRepos.map(repo => (<RepoListItem isLegacy key={repo.id} id={repo.id} isUltima isPrivate={repo.private} name={repo.full_name} />))
                    )}
                </ul>
            </RepoListContainer>
        </>
    ) : null
}

const RepoList = () => (
    <>
        <GithubRepoList />
        <UltimaRepoList />
    </>
)

export default RepoList