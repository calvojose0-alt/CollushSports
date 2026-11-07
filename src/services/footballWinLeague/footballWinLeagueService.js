// Pro Football Win League 2025–26 — Data Service
// Supabase (live) + localStorage (demo) with identical API surface.
// Mirrors winLeagueService.js. Advancement is replaced by a weekly RESULTS feed
// (fwl_results): each team gets one Win/Tie/Loss per NFL week, and the league
// reads from it — the same pattern by which the Soccer Win League reads its
// results from the World Cup game.
//
// ── SQL to run in the Supabase SQL editor (RLS intentionally left OFF) ─────────
//
// CREATE TABLE fwl_session (
//   id               text PRIMARY KEY DEFAULT 'fwl2026',
//   status           text DEFAULT 'setup',
//   -- 'setup' | 'open' | 'drafting' | 'locked' | 'complete'
//   draft_order      text[] DEFAULT '{}',
//   current_pick     integer DEFAULT 0,
//   max_players      integer DEFAULT 10,
//   picks_per_player integer DEFAULT 3,
//   created_at       timestamptz DEFAULT now(),
//   updated_at       timestamptz DEFAULT now()
// );
// INSERT INTO fwl_session (id) VALUES ('fwl2026') ON CONFLICT DO NOTHING;
//
// CREATE TABLE fwl_players (
//   id               text PRIMARY KEY,   -- 'fwl2026_{user_id}'
//   user_id          text NOT NULL UNIQUE,
//   display_name     text,
//   total_points     numeric DEFAULT 0,
//   match_points     numeric DEFAULT 0,
//   total_wins       integer DEFAULT 0,
//   joined_at        timestamptz DEFAULT now()
// );
//
// CREATE TABLE fwl_picks (
//   id               text PRIMARY KEY,   -- 'fwl2026_{team_id}'
//   user_id          text NOT NULL,
//   team_id          text NOT NULL UNIQUE,
//   pick_number      integer NOT NULL,
//   drafted_at       timestamptz DEFAULT now()
// );
//
// CREATE TABLE fwl_results (
//   id               text PRIMARY KEY,   -- 'fwl2026_{team_id}_{week}'
//   team_id          text NOT NULL,
//   week             integer NOT NULL,
//   outcome          text NOT NULL,      -- 'win' | 'tie' | 'loss'
//   recorded_at      timestamptz DEFAULT now()
// );
//
// ─────────────────────────────────────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '@/supabase'

const GAME_ID = 'fwl2026'

// ── localStorage helpers (demo mode) ─────────────────────────────────────────

const LS = {
  get:    (key)        => JSON.parse(localStorage.getItem(`collush_fwl_${key}`) || 'null'),
  set:    (key, val)   => localStorage.setItem(`collush_fwl_${key}`, JSON.stringify(val)),
  getAll: (key)        => JSON.parse(localStorage.getItem(`collush_fwl_${key}`) || '[]'),
  update: (key, id, updates) => {
    const arr = LS.getAll(key)
    const idx = arr.findIndex((x) => x.id === id)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...updates }
    else arr.push({ id, ...updates })
    localStorage.setItem(`collush_fwl_${key}`, JSON.stringify(arr))
  },
  delete: (key, id) => {
    const arr = LS.getAll(key).filter((x) => x.id !== id)
    localStorage.setItem(`collush_fwl_${key}`, JSON.stringify(arr))
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

function mapResult(row) {
  if (!row) return null
  return {
    id:         row.id,
    teamId:     row.team_id,
    week:       row.week,
    outcome:    row.outcome,
    recordedAt: row.recorded_at,
  }
}

// ── SESSION ───────────────────────────────────────────────────────────────────

export async function getSession() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('fwl_session').select('*').eq('id', GAME_ID).maybeSingle()
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
      .from('fwl_session')
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
      .channel(`fwl-session-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fwl_session' },
        async () => callback(await getSession()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getSession()), 2000)
  getSession().then(callback)
  return () => clearInterval(interval)
}

// ── PLAYERS ───────────────────────────────────────────────────────────────────

export async function joinFootballWinLeague({ userId, displayName }) {
  const playerId = `${GAME_ID}_${userId}`
  const data = {
    id: playerId, userId, displayName,
    totalPoints: 0, matchPoints: 0, totalWins: 0,
    joinedAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('fwl_players').upsert(
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

export async function getAllFWLPlayers() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('fwl_players').select('*').order('total_points', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(mapPlayer)
  }
  return LS.getAll('players')
    .filter((p) => p.id?.startsWith(GAME_ID))
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
}

export async function removeFWLPlayer(userId) {
  const playerId = `${GAME_ID}_${userId}`
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('fwl_players').delete().eq('id', playerId)
    if (error) throw new Error(error.message)
    return
  }
  LS.delete('players', playerId)
}

export function subscribeToFWLPlayers(callback) {
  if (isSupabaseConfigured && supabase) {
    getAllFWLPlayers().then(callback)
    const channel = supabase
      .channel(`fwl-players-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fwl_players' },
        async () => callback(await getAllFWLPlayers()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getAllFWLPlayers()), 2000)
  getAllFWLPlayers().then(callback)
  return () => clearInterval(interval)
}

// ── PICKS (draft) ─────────────────────────────────────────────────────────────

export async function draftTeam({ userId, teamId, pickNumber }) {
  const pickId = `${GAME_ID}_${teamId}`
  const data = { id: pickId, userId, teamId, pickNumber, draftedAt: new Date().toISOString() }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('fwl_picks').insert({
      id: pickId, user_id: userId, team_id: teamId, pick_number: pickNumber,
    })
    if (error) {
      if (error.code === '23505') throw new Error('This team has already been drafted.')
      throw new Error(error.message)
    }
    return data
  }

  const existing = LS.getAll('picks').find((p) => p.teamId === teamId)
  if (existing) throw new Error('This team has already been drafted.')
  LS.update('picks', pickId, data)
  return data
}

export async function getAllFWLPicks() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('fwl_picks').select('*').order('pick_number', { ascending: true })
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
    const { error } = await supabase.from('fwl_picks').delete().eq('id', pickId)
    if (error) throw new Error(error.message)
    return
  }
  LS.delete('picks', pickId)
}

export function subscribeToFWLPicks(callback) {
  if (isSupabaseConfigured && supabase) {
    getAllFWLPicks().then(callback)
    const channel = supabase
      .channel(`fwl-picks-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fwl_picks' },
        async () => callback(await getAllFWLPicks()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getAllFWLPicks()), 2000)
  getAllFWLPicks().then(callback)
  return () => clearInterval(interval)
}

// ── RESULTS (weekly W/T/L feed) ───────────────────────────────────────────────

export async function recordResult({ teamId, week, outcome }) {
  const resultId = `${GAME_ID}_${teamId}_${week}`
  const data = { id: resultId, teamId, week, outcome, recordedAt: new Date().toISOString() }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('fwl_results').upsert(
      { id: resultId, team_id: teamId, week, outcome },
      { onConflict: 'id' }
    )
    if (error) throw new Error(error.message)
    return data
  }
  LS.update('results', resultId, data)
  return data
}

export async function removeResult({ teamId, week }) {
  const resultId = `${GAME_ID}_${teamId}_${week}`
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('fwl_results').delete().eq('id', resultId)
    if (error) throw new Error(error.message)
    return
  }
  LS.delete('results', resultId)
}

export async function getAllResults() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('fwl_results').select('*')
    if (error) throw new Error(error.message)
    return (data || []).map(mapResult)
  }
  return LS.getAll('results').filter((r) => r.id?.startsWith(GAME_ID))
}

export function subscribeToResults(callback) {
  if (isSupabaseConfigured && supabase) {
    getAllResults().then(callback)
    const channel = supabase
      .channel(`fwl-results-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fwl_results' },
        async () => callback(await getAllResults()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getAllResults()), 3000)
  getAllResults().then(callback)
  return () => clearInterval(interval)
}
