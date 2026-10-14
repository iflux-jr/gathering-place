// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';
import { colors } from './theme/tokens.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        containerStyle={{ top: 'calc(env(safe-area-inset-top) + 72px)' }}
        toastOptions={{
          duration: 4000,
          style: {
            background:   colors.ink.DEFAULT,
            color:        '#FFFFFF',
            fontFamily:   'DM Sans, system-ui, sans-serif',
            fontSize:     '15px',
            fontWeight:   500,
            borderRadius: '999px',
            padding:      '10px 18px',
          },
          success: { iconTheme: { primary: colors.ok.solid, secondary: colors.ink.DEFAULT } },
          error:   { iconTheme: { primary: '#F04438', secondary: colors.ink.DEFAULT } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
