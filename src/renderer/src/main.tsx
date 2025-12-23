import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './pages/App';
import './index.css';
import { ClientesProvider } from './state/ClientesContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <ClientesProvider>
        <App />
      </ClientesProvider>
    </HashRouter>
  </React.StrictMode>,
);
