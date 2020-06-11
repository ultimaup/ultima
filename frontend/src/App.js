import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import FullPageLayout from './layouts/FullPage'
import DevBucketRedirect from './routes/DevBucketRedirect'

import Home from './routes/Home'
import SlackRedirect from './components/SlackRedirect'
import { ApolloProvider } from '@apollo/client'

import client from './graphql'

const Login = React.lazy(() => import('./routes/Login'))
const Legals = React.lazy(() => import('./routes/Legals'))
const WaitlistAdmin = React.lazy(() => import('./routes/WaitlistAdmin'))
const Security = React.lazy(() => import('./routes/Security'))
const RepoHome = React.lazy(() => import('./routes/RepoHome'))


const SecurityRedirect = () => {
    window.location.href = '/assets/.well-known/security.txt'
}

const App = () => (
    <ApolloProvider client={client}>
        <FullPageLayout>
            <React.Suspense fallback={<span>Loading...</span>}>
                <BrowserRouter>
                    <Switch>
                        <Route path="/admin/waitlist" component={WaitlistAdmin} />
                        <Route path="/community" component={SlackRedirect} />
                        <Route path="/user/login" component={Login} />
                        <Route path="/legals" component={Legals} />
                        <Route path="/security" component={Security} />
                        <Route path="/.well-known/security.txt" component={SecurityRedirect} />
                        <Route path="/dev-bucket/:bucketName" component={DevBucketRedirect} />
                        <Route path="/repo/:owner/:repoName/:branch?" component={RepoHome} />
                        <Route path="/" component={Home} />
                    </Switch>
                </BrowserRouter>
            </React.Suspense>
        </FullPageLayout>
    </ApolloProvider>
)

export default App