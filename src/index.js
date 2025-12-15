import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

import './legacy/initial.js';

window.legacyApp.initialize();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);