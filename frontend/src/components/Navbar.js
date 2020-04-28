import React from 'react'
import styled from 'styled-components'

import { ReactComponent as Logo } from '../routes/Home/logo-circle-white.svg'

const Container = styled.div`
    width: 100%;
    height: 68px;
`

const Grid = styled.div`
    max-width: 1127px;
    width: 100%;
    margin: auto;
    display: flex;
    height: 100%;
    align-items: center;
`

const Navbar = () => (
    <Container>
        <Grid>
            <Logo />
            
        </Grid>
    </Container>
)

export default Navbar