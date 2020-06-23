import React, { useState } from 'react'

import NavBar from '../../components/Navbar'
import { Editor } from '../RepoHome/RepoHome'

const ConfigGenerator = () => {
    const [value, setValue] = useState()

    return (
        <div className="repository file list" style={{ paddingTop: 0 }}>
            <NavBar />
            <Editor title="Create Environment Config" value={value} setValue={setValue} />
        </div>
    )
}

export default ConfigGenerator