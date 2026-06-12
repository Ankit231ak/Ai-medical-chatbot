import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'

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
  // Keep this as a runtime throw so misconfiguration is caught early in dev.
  throw new Error(
    `Missing Firebase env vars: ${missing.join(', ')}. Fill them in your .env (see .env.example).`,
  )
}

export const firebaseApp = initializeApp(firebaseConfig as Required<typeof firebaseConfig>)
export const auth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()

