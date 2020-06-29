import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { ThemeProvider } from 'styled-components'

import FullPageLayout from './layouts/FullPage'
import DevBucketRedirect from './routes/DevBucketRedirect'
import Home from './routes/Home'
import SlackRedirect from './components/SlackRedirect'
import { ApolloProvider } from '@apollo/client'
import { getToken } from './utils/token'
import client from './graphql'
import 'typeface-roboto'

const Login = React.lazy(() => import('./routes/Login'))
const Legals = React.lazy(() => import('./routes/Legals'))
const WaitlistAdmin = React.lazy(() => import('./routes/WaitlistAdmin'))
const Security = React.lazy(() => import('./routes/Security'))
const RepoHome = React.lazy(() => import('./routes/RepoHome'))
const DashboardHome = React.lazy(() => import('./routes/DashboardHome'))
const CLI = React.lazy(() => import('./routes/CLI'))
const ConfigGenerator = React.lazy(() => import('./routes/ConfigGenerator'))

const SecurityRedirect = () => {
    window.location.href = '/assets/.well-known/security.txt'
}

const Loading = () => (
    <>
        <div style={{
            background: '#383c4a',
            height: '100vh',
            width: '100%',
        }} />
    </>
)

const App = () => (
    <ThemeProvider theme={{
        colorPrimary: '#93c9f7',
        colorSecondary: '#4d87c4',
        colorTertiary: '#b8dafd',
        offWhite: '#edfbff',
        backgroundColor: '#181818',
    }}>
        <ApolloProvider client={client}>
            <FullPageLayout>
                <React.Suspense fallback={<Loading />}>
                    <BrowserRouter>
                        <Switch>
                            <Route path="/admin/waitlist" component={WaitlistAdmin} />
                            <Route path="/community" component={SlackRedirect} />
                            <Route path="/user/login/cli" component={CLI} />
                            <Route path="/user/login" component={Login} />
                            <Route path="/legals" component={Legals} />
                            <Route path="/security" component={Security} />
                            <Route path="/.well-known/security.txt" component={SecurityRedirect} />
                            <Route path="/dev-bucket/:bucketName" component={DevBucketRedirect} />
                            <Route path="/config-generator" component={ConfigGenerator} />
                            <Route path="/repo/:owner/:repoName/:branch?" component={RepoHome} />
                            <Route path="/embed/:owner/:repoName/:branch?" component={RepoHome} />
                            <Route path="/" component={() => {
                                return getToken() ? <DashboardHome/> : <Home />
                            }} />
                        </Switch>
                    </BrowserRouter>
                </React.Suspense>
            </FullPageLayout>
        </ApolloProvider>
    </ThemeProvider>
)

export default App