import React from 'react'
import styled from 'styled-components/macro'
import { Link } from 'react-router-dom'
import { transparentize, darken } from 'polished'
import Octicon, { XIcon } from '@primer/octicons-react'

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
    :focus {
        outline: none;
    }
`

export const MultiListLabel = styled.label`
    display: block;
    font-weight: 600;
    font-size: 16px;
`

export const CircleButton = styled.button`
    background: ${({ theme: { backgroundColor }}) => backgroundColor};
    border: none;
    color: ${({ theme: { offWhite }}) => offWhite};
    border-radius: 100%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    :focus {
        outline: none;
    }
`

export const CloseButton = (props) => (
    <CircleButton {...props}>
        <Octicon icon={XIcon} size={14} />
    </CircleButton>
)

export const Hint = styled.span`
    color: #9E9E9E;
    display: block;
`

export const InputGroup = styled.div`
    label:not(${MultiListLabel}) {
        width: 200px;
        margin-right: 23px;
    }
    
    input, select {
        width: 223px;
    }
`

export const Divider = styled.hr`
    border-color: #565656;
`

const RadioContainer = styled.div`
    border-radius: 100%;
    border: 1px solid #B6B7BA;
    width: 14px;
    height: 14px;
    position: relative;
    display: inline-block;

    input {
        opacity: 0;
    }

    :after {
        position: absolute;
        width: 8px;
        height: 8px;
        top: 2px;
        left: 2px;
        background: #B6B7BA;
        z-index: 1;
        border-radius: 100%;
        content: '';
        opacity: ${({ checked }) => checked ? 1 : 0};
    }
`

export const RadioInput = (props) => (
    <RadioContainer checked={props.checked}>
        <input type="radio" {...props} />
    </RadioContainer>
)

export const Form = styled.form`
    color: ${({ theme: { offWhite } }) => offWhite};

    box-sizing: content-box;

    a {
        color: ${({ theme: { colorSecondary } }) => colorSecondary};
    }

    input, select, textarea {
        background: #181818;

        border: 1px solid ${({ theme: { colorPrimary } }) => transparentize(0.8)(colorPrimary)};
        box-sizing: border-box;
        border-radius: 4px;
        color: #878787;
        padding: 9px 12px;

        :focus, :active {
            border: 1px solid ${({ theme: { colorPrimary } }) => transparentize(0.4)(colorPrimary)};
            outline: none;
        }
    }

    input[type="radio"] {
        margin: 0;
    }

    option:hover {
        background: ${({ theme: { colorPrimary } }) => colorPrimary};
        color: ${({ theme: { offWhite } }) => offWhite};
    }

    label {
        font-family: Inter;
        font-style: normal;
        font-weight: 600;
        font-size: 14px;
        line-height: 17px;
        /* identical to box height */

        text-align: right;
        letter-spacing: 0.1px;

        color: #9E9E9E;
        display: inline-block;
        text-align: right;
    }

    ${InputGroup}:not(:first-of-type) {
        margin-top: 16px;
    }

    ${Divider} {
        margin-top: 16px;
        margin-bottom: 16px;
    }
`

export const FormDiv = styled(Form).attrs(() => ({ as: 'div' }))``
