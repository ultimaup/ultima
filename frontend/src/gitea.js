import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloProvider } from '@apollo/client'

import DeploymentInfo from './components/DeploymentInfo'

import './gitea.css'

import client from './graphql'

const gitea = () => {
    const deploymentInfoContainer = document.getElementById('ultima-deployment-info')

    if (deploymentInfoContainer) {
        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <DeploymentInfo />
                </ApolloProvider>
            </React.StrictMode>,
            deploymentInfoContainer
        )
    }
}

export default gitea