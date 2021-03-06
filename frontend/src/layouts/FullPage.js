import React from 'react'
import { createGlobalStyle } from 'styled-components'

import { ResetGlobal } from '../resetcss'

const GlobalStyles = createGlobalStyle`
    @font-face {
        font-family: 'Steradian';
        src: url('${require('../fonts/Steradian-Rg.woff2')}') format('woff2'),
            url('${require('../fonts/Steradian-Rg.woff')}') format('woff');
        font-weight: normal;
        font-style: normal;
    }

    @font-face {
        font-family: 'Steradian';
        src: url('${require('../fonts/Steradian-Bd.woff2')}') format('woff2'),
            url('${require('../fonts/Steradian-Bd.woff')}') format('woff');
        font-weight: bold;
        font-style: normal;
    }

    @font-face {
        font-family: 'Steradian';
        src: url('${require('../fonts/Steradian-Lt.woff2')}') format('woff2'),
            url('${require('../fonts/Steradian-Lt.woff')}') format('woff');
        font-weight: 300;
        font-style: normal;
    }

    body {
        background: ${({ theme: { backgroundColor } }) => backgroundColor} !important;
        font-family: Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
    }

    * {
        box-sizing: border-box;   
    }

    a {
        text-decoration: none;
    }

    body {
        font-size: 14px;
        line-height: 1.4285em;
    }
`

const FullPage = ({ children }) => (
    <>
        <ResetGlobal />
        <GlobalStyles />
        {children}
    </>
)

export default FullPage