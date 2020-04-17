import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

console.log('assets injected')

const fullpageContainer = document.getElementById('root')

if (fullpageContainer) {
  ReactDOM.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
    document.getElementById('root')
  );
}
