import React from 'react'

import { ResetGlobal } from '../resetcss'

const FullPage = ({ children }) => (
    <>
        <ResetGlobal />
        {children}
    </>
)

export default FullPage