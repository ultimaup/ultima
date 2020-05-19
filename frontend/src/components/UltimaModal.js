import Modal from 'react-modal'
import React from 'react'

const UltimaModal = ({ isOpen, onRequestClose, title, children }) => (
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
        <h3 className="ui top attached header">{title}</h3>
        <div className="ui attached segment">
            {children}
        </div>
    </Modal>
)

export default UltimaModal