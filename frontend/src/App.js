import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import FullPageLayout from './layouts/FullPage'

import Home from './routes/Home'
import Login from './routes/Login'
import SlackRedirect from './components/SlackRedirect'
import CLI from './routes/CLI'
import Legals from './routes/Legals'
import WaitlistAdmin from './routes/WaitlistAdmin'
import { ApolloProvider } from '@apollo/client'
import Security from './routes/Security'

import client from './graphql'

const SecurityRedirect = () => {
    window.location.href = '/assets/.well-known/security.txt'
}

const App = () => (
    <ApolloProvider client={client}>
        <FullPageLayout>
            <BrowserRouter>
                <Switch>
                    <Route path="/admin/waitlist" component={WaitlistAdmin} />
                    <Route path="/community" component={SlackRedirect} />
                    <Route path="/user/login" component={Login} />
                    <Route path="/cli" component={CLI} />
                    <Route path="/legals" component={Legals} />
                    <Route path="/security" component={Security} />
                    <Route path="/.well-known/security.txt" component={SecurityRedirect} />
                    <Route path="/" component={Home} />
                </Switch>
            </BrowserRouter>
        </FullPageLayout>
    </ApolloProvider>
)

export default App