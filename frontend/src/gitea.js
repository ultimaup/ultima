import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloProvider } from '@apollo/client'

import NewRepoRoute from './routes/NewRepo'
import client from './graphql'

import { getToken } from './utils/token'

document.querySelectorAll(`.item[href="${window.location.pathname}"]`).forEach(ele => {
    ele.classList.add('active')
})


const gitea = () => {
    if (!getToken()) {
        window.location.href = '/auth/github'
    }
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
}

export default gitea