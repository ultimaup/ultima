import React, { useState } from 'react'
import styled, { css } from 'styled-components/macro'
import jwtDecode from 'jwt-decode'
import Octicon, { GitCommit, GitBranch } from '@primer/octicons-react'

import { getToken } from '../../utils/token'
import { Button, Form, RadioInput } from '../../components/Layout'

const ProfilePic = styled.div`
    width: 48px;
    height: 3em !important;
    background-size: cover;
    border-radius: 3px;
    ${({ src }) => css`background-image: url('${src}');`}
`

const Container = styled(Form)`
    display: flex;
    flex-direction: row;
    margin-left: 32px;

    ${ProfilePic} {
        margin-right: 21px;
    }

    input:not([type="radio"]), textarea {
        width: 100%;
    }

    input {
        margin-bottom: 10px;
    }

    h3 {
        font-size: 18px;
        margin-bottom: 15px;
    }
`

const SpeechBubble = styled.div`
    border-radius: 6px;
    padding: 16px;
    border: 1px solid #292929;
    position: relative;

    margin-bottom: 8px;

    :after, :before {
        position: absolute;
        top: 11px;
        right: 100%;
        left: -16px;
        display: block;
        width: 0;
        height: 0;
        pointer-events: none;
        content: " ";
        border-color: transparent;
        border-style: solid solid outset;
    }

    :before {
        border-width: 8px;
        border-right-color: #292929;
    }
    :after {
        margin-top: 1px;
        margin-left: 2px;
        border-width: 7px;
        border-right-color: ${({ theme: { backgroundColor }}) => backgroundColor};
    }

    svg {
        margin-left: 8px;
        margin-right: 8px;
    }
`

const SpeechBubbleContainer = styled.div`
    flex: 1;

    button {
        margin-right: 8px;
    }
`

const CommitChanges = ({ fileContentsChanged, onSubmit, branch, placeholder, style }) => {
    const user = jwtDecode(getToken())
    const [newBranch, setNewBranch] = useState(false)

    const [commitMessage, setCommitMessage] = useState('')
    const [description, setDescription] = useState('')
    const [branchName, setBranchName] = useState(`${user.username}-patch-1`)
    const placeholderCommitMessage = placeholder || "Update '.ultima.yml'"

    return (
        <Container style={style} onSubmit={e => {
            e.preventDefault()

            onSubmit({
                commitMessage: commitMessage || placeholderCommitMessage,
                description,
                branchName: newBranch ? branchName : undefined,
            })

            return false
        }}>
            <ProfilePic src={user.imageUrl} />
            <SpeechBubbleContainer>
                <SpeechBubble>
                    <h3>Commit Changes</h3>
                    <div>
                        <input placeholder={placeholderCommitMessage} value={commitMessage} onChange={e => setCommitMessage(e.target.value)} />
                    </div>
                    <div>
                        <textarea name="commit_message" placeholder="Add an optional extended description…" rows="5" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div>
                        <div style={{ marginTop: 8 }}  onClick={() => setNewBranch(false)}>
                            <RadioInput type="radio" checked={!newBranch} tabindex="0" />
                            <label>
                                <Octicon icon={GitCommit} width={16} />
                                Commit directly to the <strong>{branch}</strong> branch. 
                            </label>
                        </div>
                        <div style={{ marginTop: 8 }} onClick={() => setNewBranch(true)}>
                            <RadioInput type="radio" checked={newBranch} tabindex="1" />
                            <label>
                                <Octicon icon={GitBranch} width={14} />
                                Create a <strong>new branch</strong> for this commit and start a pull request.
                            </label>
                        </div>
                        {newBranch && (
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 16, left: 2 }}>
                                    <Octicon icon={GitBranch} width={10} />
                                </div>
                                <input style={{ paddingLeft: 26, marginTop: 8 }} value={branchName} placeholder="New branch name…" required onChange={e => setBranchName(e.target.value)}></input>
                            </div>
                        )}
                    </div>
                </SpeechBubble>

                <Button disabled={!fileContentsChanged}>Commit Changes</Button>
                <a href="/">Cancel</a>
            </SpeechBubbleContainer>
        </Container>
    )
}

export default CommitChanges