import React from 'react'
import ReactDOM from 'react-dom'

const fullpageContainer = document.getElementById('ultima-root2')

if (fullpageContainer) {
  import('./index.css').then(() => {})
  import('./App').then(({ default: App }) => {
    ReactDOM.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
      fullpageContainer
    )
  })
}