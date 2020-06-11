import React from 'react'
import ReactDOM from 'react-dom'
import RepoList from '../../components/RepoList'

const asdf = document.querySelectorAll('.ui.container.ten.wide.column')[0]
let div
if (asdf) {
    const repoList = asdf.nextElementSibling
    div = document.createElement('div')
    repoList.children[0].insertAdjacentElement('beforeBegin', div)
}

const GiteaHomepage = ({ ele }) => {
    return ReactDOM.createPortal(<RepoList />, ele)
}

const DashboardHome = ({ giteaHomepage }) => {
    return (
        <GiteaHomepage ele={giteaHomepage} />
    )
}

export default DashboardHome