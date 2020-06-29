import React, { useState } from 'react'

import NavBar from '../../components/Navbar'
import { Editor } from '../RepoHome/RepoHome'

import { Grid } from '../../components/Layout'

const ConfigGenerator = () => {
    const [value, setValue] = useState()

    return (
        <>
            <NavBar />
            <Grid>
                <Editor title="Create Environment Config" value={value} setValue={setValue} />
            </Grid>
        </>
    )
}

export default ConfigGenerator