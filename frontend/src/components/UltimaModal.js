import Modal from 'react-modal'
import React from 'react'
import styled, { useTheme } from 'styled-components/macro'

import { CloseButton } from './Layout'

const Title = styled.h3`
    font-family: Inter;
    font-style: normal;
    font-weight: 600;
    font-size: 16px;
    line-height: 19px;
    letter-spacing: 0.1px;

    display: flex;
    justify-content: space-between;
`

const Body = styled.div`
    margin-top: 28px;
`

const UltimaModal = ({ isOpen, onRequestClose, title, bodyStyle, children }) => {
    const { offWhite } = useTheme()

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            style={{
                content: {
                    top                   : '50%',
                    left                  : '50%',
                    right                 : 'auto',
                    bottom                : 'auto',
                    marginRight           : '-50%',
                    transform             : 'translate(-50%, -50%)',
                    background: '#292929',
                    border: 'none',
                    boxSizing: 'border-box',
                    boxShadow: '0px 0px 50px rgba(0, 0, 0, 0.25)',
                    padding: '22px 20px',
                    overflow: 'hidden',
                    width: 498,
                    maxHeight: '75vh',
                    color: offWhite,
                },
                overlay: {
                    background: 'rgba(0,0,0,0.43)'
                }
            }}
            contentLabel="Example Modal"
        >
            <Title>
                {title}
                <CloseButton onClick={onRequestClose} />
            </Title>
            <Body style={bodyStyle}>
                {children}
            </Body>
        </Modal>
    )
}

export default UltimaModal