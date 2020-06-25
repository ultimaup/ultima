import React, { useState, useEffect } from 'react'
import styled from 'styled-components/macro'

import { TerminalContent } from '../routes/CLI/CLI'
import UltimaModal from './UltimaModal'
import { Button } from './Layout'

const TerminalContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    ${Button} {
        margin-top: 12px;
    }
`

export const ControlledCLIModal = ({ isOpen, setIsOpen }) => {
    return (
        <UltimaModal
            isOpen={isOpen}
            onRequestClose={() => setIsOpen(false)}
            title="Ultima CLI"
        >
            <p>Make sure you have <a href="https://nodejs.org/en/">nodejs</a> installed, then just run the following commands in your terminal to get started:</p>
            <TerminalContainer>
                <TerminalContent />
            </TerminalContainer>
        </UltimaModal>
    )
}

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

    return <ControlledCLIModal isOpen={isOpen} setIsOpen={setIsOpen} />
}

export default CLIModal