// @refresh reset
import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChange, signOut, updateDisplayName } from '@/services/firebase/auth'
import { updatePlayerDisplayName } from '@/services/firebase/firestore'
import { updateWCPlayerDisplayName } from '@/services/firebase/wc2026Service'
import { supabase, isSupabaseConfigured } from '@/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser, userProfile) => {
      setUser(firebaseUser)
      setProfile(userProfile)
      setLoading(false)
      // Track last login timestamp (requires: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz)
      if (firebaseUser?.uid && isSupabaseConfigured && supabase) {
        supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', firebaseUser.uid)
          .then(() => {}) // silent — column may not exist yet
      }
    })
    return unsubscribe
  }, [])

  const logout = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }

  /**
   * Update the user's display name everywhere it is stored:
   *   1. profiles table (auth service)
   *   2. players table (F1 Survivor leaderboard rows)
   *   3. wc_players table (World Cup leaderboard rows)
   *   4. Local AuthContext state (so the header and UI update immediately)
   */
  const updateProfile = async (newDisplayName) => {
    const uid = user?.uid
    if (!uid) throw new Error('No authenticated user')
    // Persist to all data stores in parallel
    await Promise.all([
      updateDisplayName(uid, newDisplayName),
      updatePlayerDisplayName(uid, newDisplayName),
      updateWCPlayerDisplayName(uid, newDisplayName),
    ])
    // Update in-memory state so the UI refreshes without a page reload
    setUser((prev) => prev ? { ...prev, displayName: newDisplayName } : prev)
    setProfile((prev) => prev ? { ...prev, display_name: newDisplayName, displayName: newDisplayName } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
