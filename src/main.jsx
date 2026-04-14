// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background:  '#5A3825',
            color:       '#F2E9DE',
            fontFamily:  'DM Sans, sans-serif',
            fontSize:    '14px',
            borderRadius: '10px',
            padding:     '12px 16px',
          },
          success: {
            iconTheme: { primary: '#E57A06', secondary: '#F2E9DE' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#F2E9DE' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
