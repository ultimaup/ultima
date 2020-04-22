import styled, { css } from 'styled-components'

export const Badge = styled.div`
    display: inline-block;
    box-sizing: border-box;
    border-radius: 2px;
    font-family: Inter;
    font-style: normal;
    font-weight: 500;
    font-size: 12px;
    line-height: 15px;
    text-transform: uppercase;
    /* identical to box height */

    letter-spacing: 0.15em;

    text-align: center;
    padding: 2px 6px;

    color: white;
    background: rgba(255,255,255,0.1);
    border: 1px solid white;

    ${({ variant }) => {
        switch (variant) {
            case 'success': {
                return css`
                    color: #2AA827;
                    background: #292929;
                    border: 1px solid #2AA827;
                `
            }
            case 'warning': {
                return css`
                    color: #FF8C47;
                    background: #301607;
                    border: 1px solid #FF8C47;
                `
            }
            case 'danger': {
                return css`
                    color: #E01E5A;
                    background: #300613;
                    border: 1px solid #E01E5A;
                `
            }
        }
    }}
`

export const LiveBadge = styled(Badge)`
    color: #2AA827;
    background: #292929;
    border: 1px solid #2AA827;
`