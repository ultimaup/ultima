import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloProvider } from '@apollo/client'
import {BrowserRouter, Switch, Route} from 'react-router-dom'

import DeploymentInfo from './components/DeploymentInfo'
import Deployments from './routes/Deployments'
import Logs from './routes/Logs'

import './gitea.css'

import client from './graphql'

document.querySelectorAll(`.item[href="${window.location.pathname}"]`).forEach(ele => {
    ele.classList.add('active')
})

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

    const logsDeployments = document.getElementById('logsDeployments')

    if (logsDeployments) {
        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <BrowserRouter>
                        <Switch>
                            <Route path="/:owner/:repoName/activity/deployments" component={Deployments} />
                            <Route path="/:owner/:repoName/activity/logs" component={Logs} />
                        </Switch>
                    </BrowserRouter>
                </ApolloProvider>
            </React.StrictMode>,
            logsDeployments
        )
    }
}

export default gitea