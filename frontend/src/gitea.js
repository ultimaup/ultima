import React from 'react'
import ReactDOM from 'react-dom'
import { ApolloProvider } from '@apollo/client'

import NewRepoRoute from './routes/NewRepo'
import client from './graphql'

import { getToken } from './utils/token'

if (!getToken()) {
    window.location.href = '/auth/github'
}

const gitea = () => {
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