import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloProvider } from '@apollo/client'
import {BrowserRouter, Switch, Route} from 'react-router-dom'

import Navbar from './components/Navbar'
import DeploymentInfo from './components/DeploymentInfo'
import Deployments from './routes/Deployments'
import Logs from './routes/Logs'

import './gitea.css'

import client from './graphql'

document.querySelectorAll(`.item[href="${window.location.pathname}"]`).forEach(ele => {
    ele.classList.add('active')
})

const gitea = () => {
    const navbar = document.getElementById('ultima-navbar')

    if (navbar) {
        ReactDOM.render(
            <React.StrictMode>
                <Navbar />
            </React.StrictMode>,
            navbar
        )
    }

    const deploymentInfoContainer = document.getElementById('ultima-deployment-info')

    if (deploymentInfoContainer) {
        const url = window.location.pathname
        
        let [___,owner, repoName, _,__,branch = 'master'] = url.split('/')
        if (_ === '_edit') {
            branch = __
        }
        if (!branch) {
            branch = 'master'
        }

        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <DeploymentInfo owner={owner} repoName={repoName} branch={branch} />
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
                            <Route path="/:owner/:repoName/activity/deployments/:actionId?" component={Deployments} />
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