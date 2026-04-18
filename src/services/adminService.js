// Admin dashboard data service
// Aggregates user activity across all games for the site admin view.
//
// Required one-time SQL (run once in Supabase SQL editor):
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

import { supabase } from '@/supabase'

export async function getAllUsersActivity() {
  const [
    { data: profiles,       error: e1 },
    { data: f1Picks,        error: e2 },
    { data: f1Players,      error: e3 },
    { data: wcPicks,        error: e4 },
    { data: wcPlayoffPicks, error: e5 },
    { data: wcPlayers,      error: e6 },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('picks').select('user_id, race_id'),
    supabase.from('players').select('user_id, status, points'),
    supabase.from('wc_picks').select('user_id, match_id'),
    supabase.from('wc_playoff_picks').select('user_id, round, team_ids'),
    supabase.from('wc_players').select('user_id, total_points'),
  ])

  const err = e1 || e2 || e3 || e4 || e5 || e6
  if (err) throw new Error(err.message)

  // ── F1: distinct race count per user ──────────────────────────────────────
  const f1RacesByUser = {}
  ;(f1Picks || []).forEach(({ user_id, race_id }) => {
    if (!f1RacesByUser[user_id]) f1RacesByUser[user_id] = new Set()
    f1RacesByUser[user_id].add(race_id)
  })

  // ── F1: is this user in any F1 game? ──────────────────────────────────────
  const f1UserSet = new Set((f1Players || []).map(p => p.user_id))

  // ── WC: distinct group match pick count per user ──────────────────────────
  const wcGroupByUser = {}
  ;(wcPicks || []).forEach(({ user_id, match_id }) => {
    if (!wcGroupByUser[user_id]) wcGroupByUser[user_id] = new Set()
    wcGroupByUser[user_id].add(match_id)
  })

  // ── WC: playoff rounds saved per user ─────────────────────────────────────
  // Count rounds that have at least one team picked (exclude r32 — auto-filled)
  const SCORED_ROUNDS = new Set(['r16', 'qf', 'sf', 'winner'])
  const wcBracketByUser = {}
  ;(wcPlayoffPicks || []).forEach(({ user_id, round, team_ids }) => {
    if (!SCORED_ROUNDS.has(round)) return
    if (!team_ids || team_ids.length === 0) return
    wcBracketByUser[user_id] = (wcBracketByUser[user_id] || 0) + 1
  })

  // ── WC: is user in WC game? ───────────────────────────────────────────────
  const wcUserSet = new Set((wcPlayers || []).map(p => p.user_id))

  // ── Merge everything onto profiles ────────────────────────────────────────
  return (profiles || []).map(p => ({
    id:            p.id,
    displayName:   p.display_name || p.email,
    email:         p.email,
    joinedAt:      p.created_at,
    lastLoginAt:   p.last_login_at || null,   // null if column not yet added
    // Games
    playsF1:       f1UserSet.has(p.id),
    playsWC:       wcUserSet.has(p.id),
    // F1 picks
    f1RacesPicked: f1RacesByUser[p.id]?.size ?? 0,
    // WC picks
    wcGroupPicked:   wcGroupByUser[p.id]?.size ?? 0,
    wcBracketRounds: wcBracketByUser[p.id] ?? 0,
  }))
}
