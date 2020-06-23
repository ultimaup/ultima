import React from 'react'
import ReactDOM from 'react-dom'

const fullpageContainer = document.getElementById('ultima-root2')

if (fullpageContainer) {
  import('./index.css')
  import('./App').then(({ default: App }) => {
    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      fullpageContainer
    )
  })
}


const githubContainer = document.getElementById('ultima-github-embed')
if (githubContainer) {
  import('./GithubApp').then(({ default: App }) => {
    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      githubContainer
    )
  })
}