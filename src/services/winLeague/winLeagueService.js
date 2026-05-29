// Soccer Tournament Win League 2026 — Data Service
// Supabase (live) + localStorage (demo) with identical API surface
//
// ── SQL to run in Supabase SQL editor ────────────────────────────────────────
//
// CREATE TABLE wl_session (
//   id               text PRIMARY KEY DEFAULT 'wl2026',
//   status           text DEFAULT 'setup',
//   -- 'setup' | 'open' | 'drafting' | 'locked' | 'complete'
//   draft_order      text[] DEFAULT '{}',
//   current_pick     integer DEFAULT 0,
//   max_players      integer DEFAULT 10,
//   picks_per_player integer DEFAULT 3,
//   created_at       timestamptz DEFAULT now(),
//   updated_at       timestamptz DEFAULT now()
// );
// INSERT INTO wl_session (id) VALUES ('wl2026') ON CONFLICT DO NOTHING;
//
// CREATE TABLE wl_players (
//   id               text PRIMARY KEY,  -- 'wl2026_{user_id}'
//   user_id          text NOT NULL UNIQUE,
//   display_name     text,
//   total_points     integer DEFAULT 0,
//   match_points     integer DEFAULT 0,
//   advance_points   integer DEFAULT 0,
//   total_wins       integer DEFAULT 0,
//   joined_at        timestamptz DEFAULT now()
// );
//
// CREATE TABLE wl_picks (
//   id               text PRIMARY KEY,  -- 'wl2026_{team_id}'
//   user_id          text NOT NULL,
//   team_id          text NOT NULL UNIQUE,
//   pick_number      integer NOT NULL,
//   drafted_at       timestamptz DEFAULT now()
// );
//
// CREATE TABLE wl_advancement (
//   id               text PRIMARY KEY,  -- 'wl2026_{team_id}_{round}'
//   team_id          text NOT NULL,
//   round            text NOT NULL,
//   recorded_at      timestamptz DEFAULT now()
// );
//
// -- RLS policies (run after creating tables):
// ALTER TABLE wl_session    ENABLE ROW LEVEL SECURITY;
// ALTER TABLE wl_players    ENABLE ROW LEVEL SECURITY;
// ALTER TABLE wl_picks      ENABLE ROW LEVEL SECURITY;
// ALTER TABLE wl_advancement ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "Public read wl_session"    ON wl_session     FOR SELECT USING (true);
// CREATE POLICY "Public read wl_players"    ON wl_players     FOR SELECT USING (true);
// CREATE POLICY "Public read wl_picks"      ON wl_picks       FOR SELECT USING (true);
// CREATE POLICY "Public read wl_advancement" ON wl_advancement FOR SELECT USING (true);
// CREATE POLICY "Auth insert/update wl_players" ON wl_players FOR ALL USING (auth.uid()::text = user_id);
// CREATE POLICY "Auth insert wl_picks" ON wl_picks FOR ALL USING (auth.uid()::text = user_id);
// CREATE POLICY "Service role full access" ON wl_session      FOR ALL USING (true);
// CREATE POLICY "Service role advancement" ON wl_advancement  FOR ALL USING (true);
//
// ─────────────────────────────────────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '@/supabase'

const GAME_ID = 'wl2026'

// ── localStorage helpers (demo mode) ─────────────────────────────────────────

const LS = {
  get:    (key)        => JSON.parse(localStorage.getItem(`collush_wl_${key}`) || 'null'),
  set:    (key, val)   => localStorage.setItem(`collush_wl_${key}`, JSON.stringify(val)),
  getAll: (key)        => JSON.parse(localStorage.getItem(`collush_wl_${key}`) || '[]'),
  update: (key, id, updates) => {
    const arr = LS.getAll(key)
    const idx = arr.findIndex((x) => x.id === id)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...updates }
    else arr.push({ id, ...updates })
    localStorage.setItem(`collush_wl_${key}`, JSON.stringify(arr))
  },
  delete: (key, id) => {
    const arr = LS.getAll(key).filter((x) => x.id !== id)
    localStorage.setItem(`collush_wl_${key}`, JSON.stringify(arr))
  },
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapSession(row) {
  if (!row) return getDefaultSession()
  return {
    id:             row.id,
    status:         row.status          ?? 'setup',
    draftOrder:     row.draft_order     ?? [],
    currentPick:    row.current_pick    ?? 0,
    maxPlayers:     row.max_players     ?? 10,
    picksPerPlayer: row.picks_per_player ?? 3,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  }
}

function getDefaultSession() {
  return {
    id: GAME_ID,
    status: 'setup',
    draftOrder: [],
    currentPick: 0,
    maxPlayers: 10,
    picksPerPlayer: 3,
  }
}

function mapPlayer(row) {
  if (!row) return null
  return {
    id:            row.id,
    userId:        row.user_id,
    displayName:   row.display_name  ?? '',
    totalPoints:   row.total_points  ?? 0,
    matchPoints:   row.match_points  ?? 0,
    advancePoints: row.advance_points ?? 0,
    totalWins:     row.total_wins    ?? 0,
    joinedAt:      row.joined_at,
  }
}

function mapPick(row) {
  if (!row) return null
  return {
    id:          row.id,
    userId:      row.user_id,
    teamId:      row.team_id,
    pickNumber:  row.pick_number ?? 0,
    draftedAt:   row.drafted_at,
  }
}

function mapAdvancement(row) {
  if (!row) return null
  return {
    id:         row.id,
    teamId:     row.team_id,
    round:      row.round,
    recordedAt: row.recorded_at,
  }
}

// ── SESSION ───────────────────────────────────────────────────────────────────

export async function getSession() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wl_session').select('*').eq('id', GAME_ID).maybeSingle()
    if (error || !data) return getDefaultSession()
    return mapSession(data)
  }
  return LS.get('session') || getDefaultSession()
}

export async function updateSession(updates) {
  const dbUpdates = {}
  if (updates.status         !== undefined) dbUpdates.status          = updates.status
  if (updates.draftOrder     !== undefined) dbUpdates.draft_order     = updates.draftOrder
  if (updates.currentPick    !== undefined) dbUpdates.current_pick    = updates.currentPick
  if (updates.maxPlayers     !== undefined) dbUpdates.max_players     = updates.maxPlayers
  if (updates.picksPerPlayer !== undefined) dbUpdates.picks_per_player = updates.picksPerPlayer
  dbUpdates.updated_at = new Date().toISOString()

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('wl_session')
      .upsert({ id: GAME_ID, ...dbUpdates })
    if (error) throw new Error(error.message)
    return
  }
  const current = LS.get('session') || getDefaultSession()
  LS.set('session', { ...current, ...updates })
}

export function subscribeToSession(callback) {
  if (isSupabaseConfigured && supabase) {
    getSession().then(callback)
    const channel = supabase
      .channel(`wl-session-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wl_session' },
        async () => callback(await getSession()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getSession()), 2000)
  getSession().then(callback)
  return () => clearInterval(interval)
}

// ── PLAYERS ───────────────────────────────────────────────────────────────────

export async function joinWinLeague({ userId, displayName }) {
  const playerId = `${GAME_ID}_${userId}`
  const data = {
    id: playerId, userId, displayName,
    totalPoints: 0, matchPoints: 0, advancePoints: 0, totalWins: 0,
    joinedAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wl_players').upsert(
      { id: playerId, user_id: userId, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (error) throw new Error(error.message)
    return data
  }
  const existing = LS.getAll('players').find((p) => p.id === playerId)
  if (!existing) LS.update('players', playerId, data)
  return existing || data
}

export async function getWLPlayer(userId) {
  const playerId = `${GAME_ID}_${userId}`
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wl_players').select('*').eq('id', playerId).maybeSingle()
    if (error) return null
    return mapPlayer(data)
  }
  return LS.getAll('players').find((p) => p.id === playerId) || null
}

export async function getAllWLPlayers() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wl_players').select('*').order('total_points', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(mapPlayer)
  }
  return LS.getAll('players')
    .filter((p) => p.id?.startsWith(GAME_ID))
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
}

export async function updateWLPlayer(userId, updates) {
  const playerId = `${GAME_ID}_${userId}`
  if (isSupabaseConfigured && supabase) {
    const dbUpdates = {}
    if (updates.totalPoints   !== undefined) dbUpdates.total_points   = updates.totalPoints
    if (updates.matchPoints   !== undefined) dbUpdates.match_points   = updates.matchPoints
    if (updates.advancePoints !== undefined) dbUpdates.advance_points = updates.advancePoints
    if (updates.totalWins     !== undefined) dbUpdates.total_wins     = updates.totalWins
    if (updates.displayName   !== undefined) dbUpdates.display_name   = updates.displayName
    const { error } = await supabase.from('wl_players').update(dbUpdates).eq('id', playerId)
    if (error) throw new Error(error.message)
    return
  }
  LS.update('players', playerId, updates)
}

export async function removeWLPlayer(userId) {
  const playerId = `${GAME_ID}_${userId}`
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wl_players').delete().eq('id', playerId)
    if (error) throw new Error(error.message)
    return
  }
  LS.delete('players', playerId)
}

export function subscribeToWLPlayers(callback) {
  if (isSupabaseConfigured && supabase) {
    getAllWLPlayers().then(callback)
    const channel = supabase
      .channel(`wl-players-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wl_players' },
        async () => callback(await getAllWLPlayers()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getAllWLPlayers()), 2000)
  getAllWLPlayers().then(callback)
  return () => clearInterval(interval)
}

// ── PICKS (draft) ─────────────────────────────────────────────────────────────

export async function draftTeam({ userId, teamId, pickNumber }) {
  const pickId = `${GAME_ID}_${teamId}`
  const data = { id: pickId, userId, teamId, pickNumber, draftedAt: new Date().toISOString() }

  if (isSupabaseConfigured && supabase) {
    // Use insert (not upsert) to enforce the UNIQUE constraint on team_id
    const { error } = await supabase.from('wl_picks').insert({
      id: pickId, user_id: userId, team_id: teamId, pick_number: pickNumber,
    })
    if (error) {
      if (error.code === '23505') throw new Error('This team has already been drafted.')
      throw new Error(error.message)
    }
    return data
  }

  // Demo mode — manual duplicate check
  const existing = LS.getAll('picks').find((p) => p.teamId === teamId)
  if (existing) throw new Error('This team has already been drafted.')
  LS.update('picks', pickId, data)
  return data
}

export async function getAllWLPicks() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wl_picks').select('*').order('pick_number', { ascending: true })
    if (error) throw new Error(error.message)
    return (data || []).map(mapPick)
  }
  return LS.getAll('picks')
    .filter((p) => p.id?.startsWith(GAME_ID))
    .sort((a, b) => (a.pickNumber ?? 0) - (b.pickNumber ?? 0))
}

export async function undraftTeam(teamId) {
  const pickId = `${GAME_ID}_${teamId}`
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wl_picks').delete().eq('id', pickId)
    if (error) throw new Error(error.message)
    return
  }
  LS.delete('picks', pickId)
}

export function subscribeToWLPicks(callback) {
  if (isSupabaseConfigured && supabase) {
    getAllWLPicks().then(callback)
    const channel = supabase
      .channel(`wl-picks-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wl_picks' },
        async () => callback(await getAllWLPicks()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getAllWLPicks()), 2000)
  getAllWLPicks().then(callback)
  return () => clearInterval(interval)
}

// ── ADVANCEMENT ───────────────────────────────────────────────────────────────

export async function recordAdvancement({ teamId, round }) {
  const advId = `${GAME_ID}_${teamId}_${round}`
  const data = { id: advId, teamId, round, recordedAt: new Date().toISOString() }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wl_advancement').upsert(
      { id: advId, team_id: teamId, round },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (error) throw new Error(error.message)
    return data
  }
  LS.update('advancements', advId, data)
  return data
}

export async function removeAdvancement({ teamId, round }) {
  const advId = `${GAME_ID}_${teamId}_${round}`
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wl_advancement').delete().eq('id', advId)
    if (error) throw new Error(error.message)
    return
  }
  LS.delete('advancements', advId)
}

export async function getAllAdvancements() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('wl_advancement').select('*')
    if (error) throw new Error(error.message)
    return (data || []).map(mapAdvancement)
  }
  return LS.getAll('advancements').filter((a) => a.id?.startsWith(GAME_ID))
}

export function subscribeToAdvancements(callback) {
  if (isSupabaseConfigured && supabase) {
    getAllAdvancements().then(callback)
    const channel = supabase
      .channel(`wl-adv-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wl_advancement' },
        async () => callback(await getAllAdvancements()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getAllAdvancements()), 3000)
  getAllAdvancements().then(callback)
  return () => clearInterval(interval)
}
