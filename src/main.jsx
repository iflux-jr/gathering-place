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
        toastOptions={{
          duration: 4000,
          style: {
            background:   colors.ink.DEFAULT,
            color:        '#FFFFFF',
            fontFamily:   'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize:     '15px',
            fontWeight:   600,
            borderRadius: '999px',
            padding:      '10px 18px',
          },
          success: { iconTheme: { primary: colors.lime.DEFAULT, secondary: colors.ink.DEFAULT } },
          error:   { iconTheme: { primary: colors.flame[500], secondary: colors.ink.DEFAULT } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
