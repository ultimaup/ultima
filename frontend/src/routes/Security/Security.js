import React from 'react'

import { Grid } from '../../components/Layout'
import NavBar from '../../components/Navbar'

const Security = () => (
    <>
        <NavBar />
        <Grid>
            <div style={{ color: 'white', paddingTop: 24 }}>
                <h1>Security</h1>
                <h2>Acknowledgements</h2>
                <p>Here are a list of people who have kindly reported vulnerabilities in our system, and helped us rectify them:</p>
                <ul>
                    <li><a href="/.well-known/security.txt">Your name here?</a></li>
                </ul>

            </div>
        </Grid>
    </>
)
export default Security