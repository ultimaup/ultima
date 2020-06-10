import React from 'react'
import ReactDOM from 'react-dom'
import { HashRouter as Router, Route, useLocation } from 'react-router-dom'

import RepoList from '../../components/RepoList'
import RepoHome from '../RepoHome'

const asdf = document.querySelectorAll('.ui.container.ten.wide.column')[0]
let div
if (asdf) {
    const repoList = asdf.nextElementSibling
    div = document.createElement('div')
    repoList.children[0].insertAdjacentElement('beforeBegin', div)
}

const GiteaHomepage = ({ ele }) => {

    return ReactDOM.createPortal(<RepoList />, div)
}

const DashboardHome = ({ giteaHomepage }) => {
    return (
        <GiteaHomepage ele={giteaHomepage} />
    )
}

export default DashboardHome