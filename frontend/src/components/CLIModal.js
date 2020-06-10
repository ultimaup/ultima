import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

import { TerminalContent } from '../routes/CLI/CLI'
import UltimaModal from './UltimaModal'

const TerminalContainer = styled.div`
    .button {
        display: block;
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