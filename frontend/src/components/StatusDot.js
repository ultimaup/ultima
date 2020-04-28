import styled, { css } from 'styled-components'

const StatusDot = styled.div`
    background: #2AA827;
    width: 8px;
    height: 8px;
    border-radius: 100%;

    opacity: 1;
    ${({ complete }) => !complete && css`
        @keyframes flickerAnimation { /* flame pulses */
            0%   { opacity:1; }
            50%  { opacity:0; }
            100% { opacity:1; }
        }

        animation: flickerAnimation 1s infinite;
    `}
    ${({ status }) => {
        if (status === 'error') {
            return css`
                background: #E01E5A;
            `
        }

        return ''
    }}
`

export default StatusDot