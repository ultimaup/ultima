import React, { useState } from 'react'
import styled from 'styled-components'
import Octicon, { MarkGithub, Lock, Repo } from '@primer/octicons-react'

import useRepositories from '../../hooks/useRepositories'
import useLegacyRepositories from '../../hooks/useLegacyRepositories'
import useGithubAppName from '../../hooks/useGithubAppName'

const StyledRLI = styled.li`
    svg {
        color: #888;
        margin-right: 4px;
    }
    a {
        display: flex !important;
        align-items: center;
    }
`

const Badge = styled.span`
    display: inline-block;
    padding: 2px 6px;
    border: 0.5px solid #87ab63;
    border-radius: 4px;
    font-weight: bold;

    :hover {
        background: rgba(135, 171, 99, 0.2);
    }
`

const SmallLogo = () => (
    <svg width={30} height={30} style={{ zoom: 0.5, marginRight: 0 }}>
        <g filter="url(#filter0_i)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.6891 1.89917C9.85214 0.689499 12.3456 0 15 0C23.2843 0 30 6.71573 30 15C30 23.2843 23.2843 30 15 30C6.71573 30 0 23.2843 0 15C0 11.8307 0.98293 8.89089 2.66058 6.46891C3.28041 7.12908 4.1611 7.54143 5.13811 7.54143C7.01465 7.54143 8.5359 6.02019 8.5359 4.14364C8.5359 3.28337 8.21619 2.49777 7.6891 1.89917ZM6.46408 15C6.46408 10.2857 10.2857 6.46408 15 6.46408C19.7142 6.46408 23.5359 10.2857 23.5359 15C23.5359 19.7142 19.7142 23.5359 15 23.5359C10.2857 23.5359 6.46408 19.7142 6.46408 15Z" fill="#F9F9F9"></path>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.68912 1.89918C5.68414 3.02045 3.96302 4.58865 2.6606 6.46893C2.08989 5.8611 1.74033 5.04319 1.74033 4.14364C1.74033 2.26709 3.26157 0.74585 5.13812 0.74585C6.15439 0.74585 7.06646 1.19202 7.68912 1.89918Z" fill="#F9F9F9"></path>
        </g>    
    </svg>
)

const SmallLogoContainer = styled.div`
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: flex-end;
`

const RepoListItem = ({ id, isPrivate, name, onAddRepo, isUltima }) => (
    <StyledRLI className={isPrivate ? 'private' : null}>
        <a href={`/repo/${name}`}>
            <Octicon icon={isPrivate ? Lock : Repo} />
            &nbsp;
            <strong className="text truncate item-name">{name}</strong>
            <SmallLogoContainer>
                {isUltima ? <SmallLogo /> : <Badge onClick={() => onAddRepo(id)}>Add</Badge>}
            </SmallLogoContainer>
        </a>
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
`

const GithubRepoList = () => {
    const { loading, repositories } = useRepositories()
    const { githubAppName } = useGithubAppName()
    const [onlyUltima, setOnlyUltima] = useState(true)
    const displayedRepos = repositories ? repositories.filter(r => onlyUltima ? r.isUltima : true) : []

    return (
        <>
            <RepoListContainer className="ui tab active list dashboard-repos">
                <h4 className="ui top attached header">
                    <Octicon icon={MarkGithub} /> &nbsp;
                    GitHub Repositories 
                    <span className="ui grey label">{repositories ? repositories.filter(r => r.isUltima).length : ''}</span> 
                    <div className="ui right">
                        <a onClick={() => {
                            setOnlyUltima(!onlyUltima)
                        }} data-content="New Repository" data-variation="tiny inverted" data-position="left center" className="poping up">
                            {!loading && repositories.length !== 0 && displayedRepos.length === 0 && (
                                <>
                                    Add a GitHub Repo&nbsp;
                                </>
                            )}
                            <i className="plus icon" style={{
                                transform: onlyUltima ? undefined : 'rotate(45deg)',
                            }}></i> 
                            <span className="sr-only">New Repository</span>
                        </a>
                    </div>
                </h4>

                <div className="ui attached table segment">
                    <ul className="repo-owner-name-list">
                        {loading ? <li>Loading...</li> : (
                            displayedRepos.map(repo => (<RepoListItem onAddRepo={id => {}} key={repo.id} id={repo.id} isUltima={repo.isUltima} isPrivate={repo.private} name={repo.full_name} />))
                        )}
                        {!loading && repositories.length === 0 && (
                            <EmptyState>
                                <span>Use Ultima to ship your GitHub projects faster</span>
                                <a className="ui button green" href={`https://github.com/apps/${githubAppName}/installations/new`}>Link with GitHub</a>
                            </EmptyState>
                        )}
                    </ul>
                </div>
            </RepoListContainer>
        </>
    )
}

const UltimaRepoList = () => {
    const { loading, repositories } = useLegacyRepositories()
    const displayedRepos = repositories ? repositories : []

    return displayedRepos.length ? (
        <>
            <RepoListContainer className="ui tab active list dashboard-repos">
                <h4 className="ui top attached header">
                    Legacy Repositories 
                    <span className="ui grey label">{repositories ? repositories.length : ''}</span> 
                </h4>

                <div className="ui attached table segment">
                    <ul className="repo-owner-name-list">
                        {loading ? <li>Loading...</li> : (
                            displayedRepos.map(repo => (<RepoListItem isLegacy key={repo.id} id={repo.id} isUltima isPrivate={repo.private} name={repo.full_name} />))
                        )}
                    </ul>
                </div>
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