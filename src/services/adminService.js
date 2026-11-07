// Admin dashboard data service
// Aggregates user activity across all games for the site admin view.
//
// Required one-time SQL (run once in Supabase SQL editor):
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
//
//   CREATE TABLE IF NOT EXISTS support_messages (
//     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     name text,
//     email text,
//     message text NOT NULL,
//     created_at timestamptz DEFAULT now(),
//     is_read boolean DEFAULT false
//   );
//   ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "Anyone can insert" ON support_messages FOR INSERT WITH CHECK (true);
//   CREATE POLICY "Admin can read" ON support_messages FOR SELECT USING (true);
//   CREATE POLICY "Admin can update" ON support_messages FOR UPDATE USING (true);

import { supabase } from '@/supabase'

// ─── SUPPORT MESSAGES ─────────────────────────────────────────────────────────

export async function submitSupportMessage({ name, email, message }) {
  const { error } = await supabase.from('support_messages').insert({
    name: name?.trim() || null,
    email: email?.trim() || null,
    message: message.trim(),
  })
  if (error) throw new Error(error.message)
}

export async function getSupportMessages() {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function markSupportMessageRead(id, isRead = true) {
  const { error } = await supabase
    .from('support_messages')
    .update({ is_read: isRead })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── USERS ACTIVITY ───────────────────────────────────────────────────────────

/**
 * Fetch ALL rows from a table, paging past PostgREST's 1000-row default cap.
 * Without this, large tables (e.g. wc_picks) silently truncate and the
 * dashboard under-counts picks for users whose rows fall beyond the first page.
 */
async function fetchAllRows(table, columns, orderCol = 'user_id') {
  const PAGE = 1000
  let from = 0
  const all = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + PAGE - 1)
    if (orderCol) query = query.order(orderCol, { ascending: true })
    const { data, error } = await query
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

export async function getAllUsersActivity() {
  const [
    profiles,
    f1Picks,
    f1Players,
    wcPicks,
    wcPlayoffPicks,
    wcPlayers,
  ] = await Promise.all([
    fetchAllRows('profiles', '*', 'created_at'),
    fetchAllRows('picks', 'user_id, race_id'),
    fetchAllRows('players', 'user_id, status, points'),
    fetchAllRows('wc_picks', 'user_id, match_id'),
    fetchAllRows('wc_playoff_picks', 'user_id, round, team_ids'),
    fetchAllRows('wc_players', 'user_id, total_points'),
  ])

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
  return (profiles || [])
    .map(p => ({
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
    // Newest sign-ups first (paging helper fetches ascending for stability)
    .sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0))
}
