// src/firebase/config.js
// Firebase initialization — reads credentials from environment variables

import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// App Check proves requests come from this site, which keeps bots off the public sign-up form.
// Turned on when a reCAPTCHA v3 site key is configured; enforcement is switched on in the
// Firebase console once the dashboard shows real traffic passing (see README).
const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (recaptchaKey && import.meta.env.VITE_USE_EMULATORS !== 'true') {
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(recaptchaKey), isTokenAutoRefreshEnabled: true });
}

// Export auth and firestore instances
export const auth = getAuth(app);
// Keep a copy of what each device has read in IndexedDB, so a teacher with patchy signal
// can still open the register and mark it; writes made offline are sent on reconnect.
// Browsers without IndexedDB (some private modes) fall back to memory automatically.
export const db   = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Local development against the Firebase emulators (npm run emulators); never set in production builds
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export default app;
