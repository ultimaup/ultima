import React from 'react'
import { HashRouter as Router, Route, Switch } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client'
import client from './graphql'

import Environments from './routes/Environments'

const GithubApp = () => {
    const [_, owner, repoName] = window.location.pathname.split('/')
    return (
        <ApolloProvider client={client}>
            <Router>
                <Switch>
                    <Route path="/" component={() => {
                        return <Environments owner={owner} repoName={repoName} />
                    }} />
                </Switch>
            </Router>
        </ApolloProvider>
        
    )
}

export default GithubApp