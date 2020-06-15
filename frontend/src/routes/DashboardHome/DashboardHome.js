import React from 'react'
import styled from 'styled-components'

import RepoList from '../../components/RepoList'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
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

const DashboardHome = () => {
    return (
        <DashboardContainer>
            <Navbar />
            <div className="dashboard feeds">
                <div className="ui container">
                    <div className="ui mobile reversed stackable grid">
                        <div className="ui container ten wide column">
                            <GettingStarted />
                            <ActionList style={{ marginTop: 32 }} />
                        </div>
                        <div className="six wide column">
                            <RepoList />
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </DashboardContainer>
    )
}

export default DashboardHome