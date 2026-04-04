// Firebase configuration
// To enable Firebase:
//   1. Copy .env.example → .env.local
//   2. Fill in your Firebase project credentials
//   3. Set VITE_APP_MODE=live in .env.local
//
// Get credentials from: Firebase Console → Project Settings → Your Apps → Web App

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Only initialize Firebase if credentials are present
const isFirebaseConfigured =
  firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here'

let app = null
let auth = null
let db = null

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    console.log('[Firebase] Connected successfully')
  } catch (err) {
    console.warn('[Firebase] Init failed, falling back to demo mode:', err.message)
  }
} else {
  console.log('[Firebase] No credentials found — running in demo mode (localStorage)')
}

export { auth, db, isFirebaseConfigured }
export default app
