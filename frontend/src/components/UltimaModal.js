import Modal from 'react-modal'
import React from 'react'
import styled, { useTheme } from 'styled-components'
import Octicon, { X } from '@primer/octicons-react'

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

const Close = styled.div`
    background: #D8D8D8;
    color: ${({ theme: { backgroundColor }}) => backgroundColor};
    border-radius: 100%;
    padding: 3px 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
`

const Body = styled.div`
    margin-top: 28px;
`

const UltimaModal = ({ isOpen, onRequestClose, title, children }) => {
    const { backgroundColor, colorPrimary, offWhite } = useTheme()

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
                <Close onClick={onRequestClose}>
                    <Octicon icon={X} size={12} />
                </Close>
            </Title>
            <Body>
                {children}
            </Body>
        </Modal>
    )
}

export default UltimaModal