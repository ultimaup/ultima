import React, { useState } from 'react'
import styled, { css } from 'styled-components'

import { getToken } from '../../utils/token'
import jwtDecode from 'jwt-decode'
import Octicon, { GitCommit, GitBranch } from '@primer/octicons-react'

const ProfilePic = styled.div`
    width: 48px;
    height: 3em !important;
    background-size: cover;
    border-radius: 3px;
    ${({ src }) => css`background-image: url('${src}');`}
`

const Container = styled.form`
    margin-top: 12px;
`

const CommitChanges = ({ fileContentsChanged, onSubmit, branch, placeholder }) => {
    const user = jwtDecode(getToken())
    const [newBranch, setNewBranch] = useState(false)

    const [commitMessage, setCommitMessage] = useState('')
    const [description, setDescription] = useState('')
    const [branchName, setBranchName] = useState(`${user.username}-patch-1`)
    const placeholderCommitMessage = placeholder || "Update '.ultima.yml'"

    return (
        <Container className="commit-form-wrapper" onSubmit={e => {
            e.preventDefault()

            onSubmit({
                commitMessage: commitMessage || placeholderCommitMessage,
                description,
                branchName: newBranch ? branchName : undefined,
            })

            return false
        }}>
            <ProfilePic src={user.imageUrl} className="commit-avatar" />
            <div className="commit-form">
                <h3>Commit Changes</h3>
                <div className="field">
                    <input name="commit_summary" placeholder={placeholderCommitMessage} value={commitMessage} onChange={e => setCommitMessage(e.target.value)} />
                </div>
                <div className="field">
                    <textarea name="commit_message" placeholder="Add an optional extended description…" rows="5" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div className="quick-pull-choice js-quick-pull-choice">
                    <div className="field">
                        <div className={`ui radio checkbox ${newBranch ? '' : 'checked'}`} onClick={() => setNewBranch(false)}>
                            <input type="radio" class="js-quick-pull-choice-option hidden" name="commit_choice" checked={!newBranch} tabindex="0" />
                            <label>
                                <Octicon icon={GitCommit} width={16} />&nbsp;
                                Commit directly to the <strong className="branch-name">{branch}</strong> branch. 
                            </label>
                        </div>
                    </div>
                    <div className="field">
                        <div className={`ui radio checkbox ${newBranch ? 'checked' : ''}`} onClick={() => setNewBranch(true)}>
                            <input type="radio" class="js-quick-pull-choice-option hidden" name="commit_choice" checked={newBranch} tabindex="1" />
                            <label>
                                <Octicon icon={GitBranch} width={14} />&nbsp;
                                Create a <strong>new branch</strong> for this commit and start a pull request.
                            </label>
                        </div>
                    </div>
                    {newBranch && (
                        <div className="quick-pull-branch-name">
                            <div className="new-branch-name-input field ">
                                <div style={{ position: 'absolute', top: 10, left: 12 }}>
                                    <Octicon icon={GitBranch} width={10} />
                                </div>
                                <input type="text" name="new_branch_name" value={branchName} className="input-contrast mr-2 js-quick-pull-new-branch-name" placeholder="New branch name…" required="" onChange={e => setBranchName(e.target.value)}></input>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <button id="commit-button" type="submit" class="ui green button" disabled={!fileContentsChanged}>Commit Changes</button>
            <a class="ui button red" href="/">Cancel</a>
        </Container>
    )
}

export default CommitChanges