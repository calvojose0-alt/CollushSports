// Firebase Auth Service
// Wraps Firebase authentication with a demo mode fallback using localStorage

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '@/firebase'

// ─── Demo Mode Auth (localStorage) ─────────────────────────────────────────

const DEMO_USERS_KEY = 'collush_users'
const DEMO_SESSION_KEY = 'collush_session'

function getDemoUsers() {
  return JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '{}')
}
function saveDemoUsers(users) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users))
}
function getDemoSession() {
  return JSON.parse(localStorage.getItem(DEMO_SESSION_KEY) || 'null')
}
function saveDemoSession(user) {
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user))
}

// ─── Auth Service API ────────────────────────────────────────────────────────

export async function registerUser({ email, password, displayName }) {
  if (isFirebaseConfigured && auth) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName })
    const userProfile = {
      uid: credential.user.uid,
      email,
      displayName,
      role: 'player',
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'users', credential.user.uid), userProfile)
    return { user: credential.user, profile: userProfile }
  }

  // Demo mode
  const users = getDemoUsers()
  if (users[email]) throw new Error('Email already registered')
  const uid = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const userProfile = {
    uid,
    email,
    displayName,
    role: 'player',
    createdAt: new Date().toISOString(),
    password, // demo only — never do this in production
  }
  users[email] = userProfile
  saveDemoUsers(users)
  const sessionUser = { uid, email, displayName, role: userProfile.role }
  saveDemoSession(sessionUser)
  return { user: sessionUser, profile: userProfile }
}

export async function signIn({ email, password }) {
  if (isFirebaseConfigured && auth) {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, 'users', credential.user.uid))
    const profile = snap.exists() ? snap.data() : {}
    return { user: credential.user, profile }
  }

  // Demo mode
  const users = getDemoUsers()
  const user = users[email]
  if (!user) throw new Error('No account found with that email')
  if (user.password !== password) throw new Error('Incorrect password')
  const sessionUser = { uid: user.uid, email, displayName: user.displayName, role: user.role }
  saveDemoSession(sessionUser)
  return { user: sessionUser, profile: user }
}

export async function signOut() {
  if (isFirebaseConfigured && auth) {
    await firebaseSignOut(auth)
    return
  }
  localStorage.removeItem(DEMO_SESSION_KEY)
}

export function onAuthStateChange(callback) {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        getDoc(doc(db, 'users', user.uid)).then((snap) => {
          callback(user, snap.exists() ? snap.data() : {})
        })
      } else {
        callback(null, null)
      }
    })
  }

  // Demo mode — check localStorage
  const session = getDemoSession()
  callback(session, session)
  return () => {} // no-op unsubscribe
}

export async function getUserProfile(uid) {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? snap.data() : null
  }
  const users = getDemoUsers()
  return Object.values(users).find((u) => u.uid === uid) || null
}
