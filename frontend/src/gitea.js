import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloProvider } from '@apollo/client'
import {BrowserRouter, Switch, Route} from 'react-router-dom'
import Modal from 'react-modal'

import DeploymentNotification from './components/DeploymentNotification'
import GettingStarted from './components/GettingStarted'
import Deployments from './routes/Deployments'
import Logs from './routes/Logs'
import NewRepoRoute from './routes/NewRepo'
import Environments from './routes/Environments'
import CLIModal from './components/CLIModal'
import ConfigEditor from './components/ConfigEditor'
import client from './graphql'
import DashboardHome from './routes/DashboardHome'

import { getToken } from './utils/token'

document.querySelectorAll(`.item[href="${window.location.pathname}"]`).forEach(ele => {
    ele.classList.add('active')
})

if (!getToken()) {
    window.location.href = '/auth/github'
}

const [cliLink] = document.querySelectorAll('.cli-link')

if (cliLink) {
    const cliModalContainer = document.createElement('div')
    cliLink.insertAdjacentElement('afterend', cliModalContainer)
    ReactDOM.render(
        <React.StrictMode>
            <CLIModal triggerEle={cliLink} />
        </React.StrictMode>,
        cliModalContainer
    )
}
const gitea = () => {
    const url = window.location.pathname
        
    let [owner, repoName, _operation,_optBranch,branch = 'master'] = url.split('/').slice(1)
    
    if (_operation === '_edit') {
        branch = _optBranch
    }
    if (!branch) {
        branch = 'master'
    }

    const environmentsContainer = document.getElementById('environment-container')
    if (environmentsContainer) {
        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <Environments owner={owner} repoName={repoName} hasConfig={!!document.querySelector('a[title=".ultima.yml"]')} />
                </ApolloProvider>
            </React.StrictMode>,
            environmentsContainer
        )
        Modal.setAppElement('#environment-container')
    }

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
                        <GettingStarted cliLink={cliLink} />
                    </ApolloProvider>
                </React.StrictMode>,
                div
            )
        }

        const asdfg = document.querySelectorAll('.ui.mobile.reversed.stackable.grid')[0]
        if (asdfg) {
            const div = document.createElement('div')
            asdfg.insertAdjacentElement('beforeBegin', div)

            ReactDOM.render(
                <React.StrictMode>
                    <ApolloProvider client={client}>
                        <DashboardHome giteaHomepage={asdfg} />
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

    const configEditor = document.getElementById('ultima-config-editor')
    if (configEditor) {
        const { io } = configEditor.dataset
        const ioEle = document.getElementById(io)

        ReactDOM.render(
            <React.StrictMode>
                <ApolloProvider client={client}>
                    <ConfigEditor ioEle={ioEle} />
                </ApolloProvider>
            </React.StrictMode>,
            configEditor
        )
    }
}

export default gitea