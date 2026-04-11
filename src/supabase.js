// Supabase client configuration
// To enable Supabase:
//   1. Copy .env.example → .env.local
//   2. Fill in your Supabase project URL and anon key
//   3. Set VITE_APP_MODE=live in .env.local
//
// Get credentials from: Supabase Dashboard → Project Settings → API

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured =
  !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_url_here')

let supabase = null

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('[Supabase] Connected successfully')
  } catch (err) {
    console.warn('[Supabase] Init failed, falling back to demo mode:', err.message)
  }
} else {
  console.log('[Supabase] No credentials found — running in demo mode (localStorage)')
}

export { supabase }
export default supabase
