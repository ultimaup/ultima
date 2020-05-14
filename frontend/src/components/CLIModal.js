import Modal from 'react-modal'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

import { TerminalContent } from '../routes/CLI/CLI'

const TerminalContainer = styled.div`
    .button {
        display: block;
        margin-top: 12px;
    }
`

const CLIModal = ({ triggerEle }) => {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (triggerEle) {
            triggerEle.onclick = e => {
                e.preventDefault()
                setIsOpen(true)
                return false
            }
        }
    }, [triggerEle])

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={() => setIsOpen(false)}
            style={{
                content: {
                    top                   : '50%',
                    left                  : '50%',
                    right                 : 'auto',
                    bottom                : 'auto',
                    marginRight           : '-50%',
                    transform             : 'translate(-50%, -50%)',
                    background: '#25262f',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxSizing: 'border-box',
                    padding: 0,
                    overflow: 'hidden',
                    width: 540,
                },
                overlay: {
                    background: 'rgba(0,0,0,0.5)'
                }
            }}
            contentLabel="Example Modal"
        >
            <h3 className="ui top attached header">Ultima CLI</h3>
            <div className="ui attached segment">
                <p>Make sure you have <a href="https://nodejs.org/en/">nodejs</a> installed, then just run the following commands in your terminal to get started:</p>
                <TerminalContainer>
                    <TerminalContent />
                </TerminalContainer>
            </div>
        </Modal>
    )
}

export default CLIModal