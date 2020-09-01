import React from 'react'
import styled from 'styled-components/macro'
import jwtDecode from 'jwt-decode'

import RepoList from '../../components/RepoList'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { Grid } from '../../components/Layout'
import GettingStarted from '../../components/GettingStarted'
import { ActionList } from '../Deployments/Deployments'
import Tiers from '../../components/Billing'

import { getToken } from '../../utils/token'

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

    ${Tiers} {
        margin-top: 24px;
    }
`

const Sidebar = styled.div`
    flex: 1;
`

const Divider = styled.div`
    width: 32px;
`

const DashboardHome = () => {
    const token = getToken()
    const { tier } = jwtDecode(token)

    return (
        <DashboardContainer>
            <Navbar />
            <DashboardBody>
                <Main>
                    <GettingStarted />
                    {!tier && <Tiers />}
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