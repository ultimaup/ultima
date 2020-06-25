import styled from 'styled-components'
import { Link } from 'react-router-dom'

export const Grid = styled.div`
    display: flex;
    margin: auto;
    width: 100%;
    max-width: 1127px;
    padding-left: 16px;
    padding-right: 16px;

    @media (max-width: 900px) {
        flex-direction: column-reverse;
    }
`

export const Button = styled.button.attrs(({ to, href }) => {
    let as = 'button'
    if (to) {
        as = Link
    }
    if (href) {
        as = 'a'
    }
    return {
        as,
    }
})`
    color: ${({ theme: { colorPrimary }}) => colorPrimary};
    cursor: pointer;
    background: #F7F7F7;
    box-shadow: inset 0px -1px 0px rgba(0, 0, 0, 0.25);
    border-radius: 3px;
    border: none;
    
    font-family: Inter;
    font-style: normal;
    font-weight: normal;
    font-size: 14px;
    line-height: 17px;
    /* identical to box height */

    text-align: center;
    letter-spacing: -0.025em;

    color: #181818;

    padding: 5px 8px;

    :hover {
        color: #181818;
    }
`