import React from 'react'
import styled from 'styled-components/macro'

import RepoList from '../../components/RepoList'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { Grid } from '../../components/Layout'
import GettingStarted from '../../components/GettingStarted'
import { ActionList } from '../Deployments/Deployments'

const DashboardContainer = styled.div`
    h2 {
        font-size: 24px !important;
    }

    .grid {
        max-width: none !important;
    }
`

const DashboardBody = styled(Grid)`
    margin-top: 32px;
`

const Main = styled.div`
    flex: 2;
`

const Sidebar = styled.div`
    flex: 1;
`

const Divider = styled.div`
    width: 32px;
`

const DashboardHome = () => {
    return (
        <DashboardContainer>
            <Navbar />
            <DashboardBody>
                <Main>
                    <GettingStarted />
                    <ActionList withRepo style={{ marginTop: 32 }} />
                </Main>
                <Divider />
                <Sidebar className="six wide column">
                    <RepoList />
                </Sidebar>
            </DashboardBody>
            <Footer />
        </DashboardContainer>
    )
}

export default DashboardHome