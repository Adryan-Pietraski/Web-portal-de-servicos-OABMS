import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Remova StrictMode temporariamente
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);

reportWebVitals();