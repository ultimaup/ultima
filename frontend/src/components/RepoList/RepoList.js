import React, { useState, useEffect } from 'react'
import styled, { css } from 'styled-components/macro'
import Octicon, { MarkGithubIcon, LockIcon, RepoIcon, HeartIcon, PlusIcon, SyncIcon } from '@primer/octicons-react'
import { Link } from 'react-router-dom'

import UltimaModal from '../UltimaModal'
import { Form } from '../Layout'

import useRepositories from '../../hooks/useRepositories'
import useLegacyRepositories from '../../hooks/useLegacyRepositories'

import { Button } from '../Layout'
import LoadingSpinner from '../Loading'

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

const SmallLogo = ({ size = 30, style }) => (
    <svg width={size} height={size} style={{ zoom: 0.5, marginRight: 0, ...style }}>
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
            <Octicon icon={isPrivate ? LockIcon : RepoIcon} />
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
    ${Button}, span {
        margin-top: 12px !important;
    }
`

const RepoListContainer = styled.div`
    margin-bottom: 24px;
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

const UltimaHeartContainer = styled.div`
    display: flex;
    align-items: center;

    svg:not(:first-child) {
        margin-left: 8px;
    }

    ${({ close }) => close && css`
        svg:not(:first-child) {
            margin-left: -4px;
        }
    `}
`

const UltimaHeartGH = ({ close, large }) => (
    <UltimaHeartContainer close={close}>
        <SmallLogo style={{ zoom: large ? 1.2 : 1 }} />
        {!close && <Octicon icon={HeartIcon} size={18} />}
        <Octicon icon={MarkGithubIcon} size={large ? 36 : 32} />
    </UltimaHeartContainer>
)

const RepoListModalContainer = styled(RepoListContainer)`
    display: flex;
    flex-direction: column;
    margin-top: 0;
    margin-bottom: 0;
    max-height: calc(75vh - 50px);

    form, input {
        width: 100%;
    }

    ${Header}, ${RepoLink} {
        padding-left: 0;
        padding-right: 0;
    }

    ${EmptyState} span {
        display: inline-block;
        margin-top: 18px !important;
        margin-bottom: 8px;
        font-size: 18px;
    }
`

const SearchList = styled.ul`
    flex: 1;
    overflow-y: scroll;
    margin-right: -5px;
    padding-right: 5px;
    padding-top: 0;
    padding-bottom: 0;

    ${RepoLink} {
        padding-top: 10px;
        padding-bottom: 10px;
    }

    ${StyledRLI}:first-child {
        ${RepoLink} {
            padding-top: 0;
        }
    }
`

const SmallLoading = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 16px;

    span {
        margin-top: 16px;
    }
`

const Loading = () => (
    <SmallLoading>
        <div style={{
            zoom: 0.6
        }}>
            <LoadingSpinner />
        </div>
        <span>Scanning GitHub Repositories</span>
    </SmallLoading>
)

const ResyncReposButton = styled.div`
    cursor: pointer;
    display: inline-block;
    margin-left: 8px;
    ${({ theme: { colorPrimary }}) => css`
        color: ${colorPrimary};
    `}
`

const GithubRepoList = () => {
    const [forceReload, setForceReload] = useState(false)
    const { repositories, loading } = useRepositories(forceReload)
    const [modalOpen, setModalOpen] = useState(false)
    const [onboardingModal, setOnboardingModal] = useState(false)
    const [step2, setStep2] = useState(false)
    const [alreadyPoppedModal, setAlreadyPoppedModal] = useState(false)
    const [search, setSearch] = useState('')
    const displayedRepos = repositories.filter(r => r.isUltima)

    useEffect(() => {
        if (!alreadyPoppedModal && repositories.length > 0 && repositories.filter(r => r.isUltima).length === 0) {
            setOnboardingModal(true)
            setModalOpen(true)
            setAlreadyPoppedModal(true)
        }
    },[repositories, alreadyPoppedModal, modalOpen])

    return (
        <>
            <RepoListContainer>
                <Header>
                    <div>
                        <Octicon icon={MarkGithubIcon} /> &nbsp;
                        GitHub Repositories
                        <ResyncReposButton onClick={() => {
                            setForceReload(true)
                        }}>
                            <Octicon icon={SyncIcon}/>
                        </ResyncReposButton>
                    </div>
                    <div>
                        <Action onClick={() => {
                            setModalOpen(true)
                        }}>
                            <Octicon icon={PlusIcon} />
                        </Action>
                    </div>
                </Header>

                <ul>
                    {loading ? <Loading /> : (
                        displayedRepos.map(repo => (<RepoListItem vcsHost="github.com" onAddRepo={id => {}} key={repo.id} id={repo.id} isUltima={repo.isUltima} isPrivate={repo.private} name={repo.full_name} />))
                    )}
                    {!loading && repositories.length !== 0 && displayedRepos.length === 0 && (
                        <EmptyState>
                            <UltimaHeartGH close />
                            <span>GitHub account linked successfully</span>
                            <Button onClick={() => {
                                setModalOpen(true)
                            }}>Add a repo to Ultima</Button>
                        </EmptyState>
                    )}
                    {!loading && repositories.length === 0 && (
                        <EmptyState>
                            <UltimaHeartGH />
                            <span>Ship your GitHub projects lightning fast with Ultima.</span>
                            <Button href={`/vcs/github`}>Link GitHub</Button>
                        </EmptyState>
                    )}
                </ul>
            </RepoListContainer>
            <UltimaModal bodyStyle={{ marginTop: 0 }} isOpen={modalOpen} onRequestClose={() => setModalOpen(false)} title="Add GitHub Repository">
                <RepoListModalContainer style={{ maxHeight: step2 ? undefined : 'none', marginBottom: step2 ? undefined : 0 }}>
                    {(onboardingModal && !step2) ? (
                        <EmptyState>
                            <UltimaHeartGH large close />
                            <span>GitHub account linked successfully</span>
                            <Button onClick={() => {
                                setStep2(true)
                            }}>Add a repo to Ultima</Button>
                        </EmptyState>
                    ) : (
                        <>
                            <Header>
                                <Form onSubmit={e => {
                                    e.preventDefault()
                                    return false
                                }}>
                                        <input placeholder="search..." autoFocus onChange={e => {
                                            setSearch(e.target.value)
                                        }} />
                                </Form>
                            </Header>
                            <SearchList>
                                {loading ? <Loading /> : (
                                    repositories.filter((r) => {
                                        return r.full_name.toLowerCase().split('/')[1].includes(search.toLowerCase())
                                    }).map(repo => (<RepoListItem vcsHost="github.com" onAddRepo={id => {}} key={repo.id} id={repo.id} isUltima={repo.isUltima} isPrivate={repo.private} name={repo.full_name} />))
                                )}
                            </SearchList>
                        </>
                    )}
                </RepoListModalContainer>
            </UltimaModal>
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