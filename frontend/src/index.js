import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'

const fullpageContainer = document.getElementById('ultima-root2')

if (fullpageContainer) {
  import('./App').then(({ default: App }) => {
    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      fullpageContainer
    )
  })
}
