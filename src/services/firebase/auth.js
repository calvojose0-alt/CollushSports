// Auth Service (Supabase)
// Wraps Supabase authentication with a demo mode fallback using localStorage.
// Exposes the same API surface as the original Firebase version so no other
// file in the app needs to change.
//
// Supabase profiles are stored in the `profiles` table (public schema).
// Schema:
//   id           uuid  (references auth.users, primary key)
//   email        text
//   display_name text
//   role         text  (default 'player')
//   is_alive     bool  (default true)
//   score        int   (default 0)
//   created_at   timestamptz

import { supabase, isSupabaseConfigured } from '@/supabase'
import { Capacitor } from '@capacitor/core'
import { SignInWithApple } from '@capacitor-community/apple-sign-in'

// ─── Apple Sign In ────────────────────────────────────────────────────────────

export async function signInWithApple() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured')

  // Native iOS — use Capacitor plugin
  if (Capacitor.isNativePlatform()) {
    const result = await SignInWithApple.authorize({
      clientId: 'com.collushsports.app',
      redirectURI: 'https://bjjwwsnxbtlxrmjxtyed.supabase.co/auth/v1/callback',
      scopes: 'email name',
    })
    const { identityToken } = result.response
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
    })
    if (error) throw new Error(error.message)
    const profile = await ensureProfile(data.user)
    return { user: normalizeUser(data.user, profile), profile }
  }

  // Web fallback — OAuth redirect
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw new Error(error.message)
}

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

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    console.warn('[Supabase] fetchProfile error:', error.message)
    return null
  }
  return data
}

/**
 * Ensure a profile row exists for the given user.
 * Guards against cases where registration partially failed (e.g. email rate limit)
 * and the profile insert was never completed.
 */
async function ensureProfile(supabaseUser) {
  const existing = await fetchProfile(supabaseUser.id)
  if (existing) return existing
  const fallbackProfile = {
    id: supabaseUser.id,
    email: supabaseUser.email,
    display_name:
      supabaseUser.user_metadata?.display_name ?? supabaseUser.email,
    role: 'player',
  }
  const { error } = await supabase.from('profiles').insert(fallbackProfile)
  if (error) console.warn('[Supabase] ensureProfile insert error:', error.message)
  return fallbackProfile
}

/**
 * Normalise a Supabase User object so the rest of the app can keep using
 * Firebase-style `user.uid` and `user.displayName`.
 */
function normalizeUser(supabaseUser, profile) {
  return {
    ...supabaseUser,
    uid: supabaseUser.id,                                          // Firebase compat
    displayName: profile?.display_name
      ?? supabaseUser.user_metadata?.display_name
      ?? supabaseUser.email,
  }
}

// ─── Auth Service API ────────────────────────────────────────────────────────

export async function registerUser({ email, password, displayName }) {
  if (isSupabaseConfigured && supabase) {
    // Clear any stale session before registering a new account
    await supabase.auth.signOut()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw new Error(error.message)

    const supabaseUser = data.user
    if (!supabaseUser) {
      // Email confirmation required — user won't be active until confirmed
      return { user: null, profile: null, emailConfirmationRequired: true }
    }

    const userProfile = {
      id: supabaseUser.id,
      email,
      display_name: displayName,
      role: 'player',
    }

    const { error: profileError } = await supabase.from('profiles').insert(userProfile)
    if (profileError) console.warn('[Supabase] Profile creation error:', profileError.message)

    return { user: normalizeUser(supabaseUser, userProfile), profile: userProfile }
  }

  // ── Demo mode ─────────────────────────────────────────────────────────────
  const users = getDemoUsers()
  if (users[email]) throw new Error('Email already registered')
  const uid = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const userProfile = {
    uid,
    email,
    displayName,
    role: 'player',
    createdAt: new Date().toISOString(),
    password, // demo only — never store plaintext passwords in production
  }
  users[email] = userProfile
  saveDemoUsers(users)
  const sessionUser = { uid, email, displayName, role: userProfile.role }
  saveDemoSession(sessionUser)
  return { user: sessionUser, profile: userProfile }
}

export async function signIn({ email, password }) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    const profile = await fetchProfile(data.user.id)
    return { user: normalizeUser(data.user, profile), profile }
  }

  // ── Demo mode ─────────────────────────────────────────────────────────────
  const users = getDemoUsers()
  const user = users[email]
  if (!user) throw new Error('No account found with that email')
  if (user.password !== password) throw new Error('Incorrect password')
  const sessionUser = { uid: user.uid, email, displayName: user.displayName, role: user.role }
  saveDemoSession(sessionUser)
  return { user: sessionUser, profile: user }
}

export async function signOut() {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) console.warn('[Supabase] Sign-out error:', error.message)
    return
  }
  localStorage.removeItem(DEMO_SESSION_KEY)
}

/**
 * Subscribe to auth state changes.
 * Callback receives (user, profile) — matches the original Firebase signature.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback) {
  if (isSupabaseConfigured && supabase) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Immediately unblock loading with basic user info so ProtectedRoute
        // never hangs waiting for a network call to complete.
        callback(normalizeUser(session.user, null), null)

        // Fetch/create profile in the background and update once ready
        ensureProfile(session.user)
          .then((profile) => callback(normalizeUser(session.user, profile), profile))
          .catch((err) => console.warn('[Supabase] Background profile error:', err.message))
      } else {
        callback(null, null)
      }
    })
    return () => subscription.unsubscribe()
  }

  // ── Demo mode ─────────────────────────────────────────────────────────────
  const session = getDemoSession()
  callback(session, session)
  return () => {} // no-op unsubscribe
}

export async function getUserProfile(uid) {
  if (isSupabaseConfigured && supabase) {
    return await fetchProfile(uid)
  }
  const users = getDemoUsers()
  return Object.values(users).find((u) => u.uid === uid) || null
}

/**
 * Update the display name for the given user.
 * Updates the Supabase `profiles` table (Supabase mode) or localStorage (demo mode).
 */
/**
 * Permanently delete the current user's account and all their data.
 * Calls a Supabase RPC function (SECURITY DEFINER) that removes the auth.users row.
 *
 * Required one-time SQL (run in Supabase SQL editor):
 *   CREATE OR REPLACE FUNCTION delete_own_account()
 *   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
 *   BEGIN
 *     DELETE FROM public.profiles WHERE id = auth.uid();
 *     DELETE FROM auth.users WHERE id = auth.uid();
 *   END;
 *   $$;
 */
export async function deleteAccount() {
  if (isSupabaseConfigured && supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')
    const uid = user.id

    // Delete all user data across every table in parallel
    await Promise.allSettled([
      supabase.from('picks').delete().eq('user_id', uid),
      supabase.from('players').delete().eq('user_id', uid),
      supabase.from('wc_picks').delete().eq('user_id', uid),
      supabase.from('wc_playoff_picks').delete().eq('user_id', uid),
      supabase.from('wc_players').delete().eq('user_id', uid),
      supabase.from('group_members').delete().eq('user_id', uid),
      supabase.from('support_messages').delete().eq('email', user.email),
      supabase.from('profiles').delete().eq('id', uid),
    ])

    // Call RPC to delete the auth.users row
    const { error: rpcError } = await supabase.rpc('delete_own_account')
    if (rpcError) {
      console.warn('[deleteAccount] RPC not available, signing out only:', rpcError.message)
    }

    await supabase.auth.signOut()
    return
  }

  // Demo mode
  const session = getDemoSession()
  if (session) {
    const users = getDemoUsers()
    const entry = Object.values(users).find((u) => u.uid === session.uid)
    if (entry) {
      delete users[entry.email]
      saveDemoUsers(users)
    }
    localStorage.removeItem(DEMO_SESSION_KEY)
  }
}

// ─── Password Reset ──────────────────────────────────────────────────────────

/**
 * Send a password-reset email via Supabase.
 * The email contains a link that redirects to the app's /reset-password route.
 * redirectTo must be registered in Supabase Dashboard → Authentication → URL Configuration.
 */
export async function sendPasswordReset(email) {
  if (isSupabaseConfigured && supabase) {
    // For native iOS the deep-link scheme is collushsports://reset-password
    // For web/browser the fallback is the current origin
    const redirectTo = typeof window !== 'undefined' && window.location
      ? `${window.location.origin}/#/reset-password`
      : 'collushsports://reset-password'

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw new Error(error.message)
    return
  }
  // Demo mode — just pretend the email was sent
}

/**
 * Update the current user's password.
 * Only works when the user has a valid recovery session
 * (i.e. they followed the reset link from their email).
 */
export async function updatePassword(newPassword) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
    return
  }
  // Demo mode — update stored password
  const session = getDemoSession()
  if (session) {
    const users = getDemoUsers()
    const entry = Object.values(users).find((u) => u.uid === session.uid)
    if (entry) {
      entry.password = newPassword
      users[entry.email] = entry
      saveDemoUsers(users)
    }
  }
}

export async function updateDisplayName(userId, newDisplayName) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: newDisplayName })
      .eq('id', userId)
    if (error) throw new Error(error.message)
    return
  }

  // ── Demo mode ──────────────────────────────────────────────────────────────
  const users = getDemoUsers()
  const entry = Object.values(users).find((u) => u.uid === userId)
  if (entry) {
    entry.displayName = newDisplayName
    users[entry.email] = entry
    saveDemoUsers(users)
  }
  const session = getDemoSession()
  if (session?.uid === userId) {
    saveDemoSession({ ...session, displayName: newDisplayName })
  }
}
