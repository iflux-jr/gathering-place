// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion, MotionConfig } from 'motion/react';
import { Toaster } from 'react-hot-toast';
// Self-hosted brand fonts (latin subsets are picked by unicode-range)
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import App from './App';
import { Backdrop } from './components/layout/Backdrop';
import './styles/globals.css';
import { colors, fonts, shadow } from './theme/tokens.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* reducedMotion="user": with the device set to reduce motion, Motion drops transform
        animations and keeps short fades */}
    <MotionConfig reducedMotion="user">
      {/* Animation features (including shared-layout indicators) load in their own file */}
      <LazyMotion features={() => import('./components/motion/features').then(r => r.default)} strict>
      <BrowserRouter>
        <Backdrop />
        <App />
        <Toaster
          position="top-center"
          containerStyle={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
          toastOptions={{
            duration: 4000,
            style: {
              background:   'rgba(43,27,18,.92)',
              color:        '#FFFFFF',
              fontFamily:   fonts.body.join(','),
              fontSize:     '15px',
              fontWeight:   600,
              borderRadius: '18px',
              padding:      '12px 16px',
              boxShadow:    shadow.lg,
              backdropFilter: 'blur(12px)',
            },
            success: { iconTheme: { primary: '#5BC48A', secondary: colors.ink.DEFAULT } },
            error:   { iconTheme: { primary: '#FF8A7A', secondary: colors.ink.DEFAULT } },
          }}
        />
      </BrowserRouter>
      </LazyMotion>
    </MotionConfig>
  </React.StrictMode>
);
