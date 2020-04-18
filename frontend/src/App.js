import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import FullPageLayout from './layouts/FullPage'

import Home from './routes/Home'
import Login from './routes/Login'
import SlackRedirect from './components/SlackRedirect'

const App = () => (
    <FullPageLayout>
        <BrowserRouter>
            <Switch>
                <Route path="/community" component={SlackRedirect} />
                <Route path="/user/login" component={Login} />
                <Route path="/" component={Home} />
            </Switch>
        </BrowserRouter>
    </FullPageLayout>
)

export default App