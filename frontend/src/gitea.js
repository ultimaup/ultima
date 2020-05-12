import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloProvider } from '@apollo/client'
import {BrowserRouter, Switch, Route} from 'react-router-dom'
import Modal from 'react-modal'

import Navbar from './components/Navbar'
import DeploymentInfo from './components/DeploymentInfo'
import DeploymentNotification from './components/DeploymentNotification'
import GettingStarted from './components/GettingStarted'
import Deployments from './routes/Deployments'
import Logs from './routes/Logs'
import NewRepoRoute from './routes/NewRepo'
import Environments from './routes/Environments'

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
    
    const url = window.location.pathname
        
    let [___,owner, repoName, _,__,branch = 'master'] = url.split('/')
    
    if (_ === '_edit') {
        branch = __
    }
    if (!branch) {
        branch = 'master'
    }

    const environmentsContainer = document.getElementById('environment-container')
    if (environmentsContainer) {
        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <Environments owner={owner} repoName={repoName} />
                </ApolloProvider>
            </React.StrictMode>,
            environmentsContainer
        )
        Modal.setAppElement('#environment-container')
    }

    const deploymentInfoContainer = document.getElementById('ultima-deployment-info')

    if (deploymentInfoContainer) {
        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <DeploymentInfo owner={owner} repoName={repoName} branch={branch} />
                </ApolloProvider>
            </React.StrictMode>,
            deploymentInfoContainer
        )

        const [notificationContainer] = document.querySelectorAll(`.item[href="/${owner}/${repoName}/activity/deployments"]`)
        
        if (notificationContainer) {
            const div = document.createElement('div')
            notificationContainer.appendChild(div)
            ReactDOM.render(
                <React.StrictMode>
                    <ApolloProvider client={client}>
                        <DeploymentNotification owner={owner} repoName={repoName} />
                    </ApolloProvider>
                </React.StrictMode>,
                div
            )
        }
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

    if (window.location.pathname === '/') {
        const asdf = document.querySelectorAll('.ui.container.ten.wide.column')[0]
        if (asdf) {
            const div = document.createElement('div')
            asdf.children[0].insertAdjacentElement('beforeBegin', div)
            // asdf.children[0].remove()
            ReactDOM.render(
                <React.StrictMode>
                    <ApolloProvider client={client}>
                        <GettingStarted />
                    </ApolloProvider>
                </React.StrictMode>,
                div
            )
        }
    }

    const newRepo = document.getElementById('new-repo-container')
    if (newRepo) {
        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <NewRepoRoute />
                </ApolloProvider>
            </React.StrictMode>,
            newRepo
        )
    }
}

export default gitea