import { initializeApp } from 'firebase/app'
import { GithubAuthProvider, GoogleAuthProvider, getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k)

if (missing.length) {
  console.warn(
    `Missing Firebase env vars: ${missing.join(', ')}. Login will likely fail.`,
  )
}

console.log('Firebase initializing...')
let firebaseApp;
let auth;
let googleProvider;
let githubProvider;

try {
  firebaseApp = initializeApp(firebaseConfig as Required<typeof firebaseConfig>)
  auth = getAuth(firebaseApp)
  googleProvider = new GoogleAuthProvider()
  githubProvider = new GithubAuthProvider()
  console.log('Firebase initialized successfully.')
} catch (e) {
  console.error('Firebase initialization failed:', e)
}

export { firebaseApp, auth, googleProvider, githubProvider }

