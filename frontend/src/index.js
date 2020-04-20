import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import gitea from './gitea'

const fullpageContainer = document.getElementById('ultima-root')

if (fullpageContainer) {
  import('./App').then(({ default: App }) => {
    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      fullpageContainer
    )
  })
} else {
  gitea()
}
