import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

const fullpageContainer = document.getElementById('ultima-root')

if (fullpageContainer) {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    fullpageContainer
  );
}
