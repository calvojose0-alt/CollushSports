// World Cup 2026 – Data Service (Supabase + localStorage demo fallback)
//
// Required Supabase tables (run this SQL in Supabase SQL editor):
// ─────────────────────────────────────────────────────────────────
// CREATE TABLE wc_players (
//   id           text PRIMARY KEY,   -- 'wc2026_{userId}'
//   user_id      text NOT NULL,
//   display_name text,
//   total_points integer DEFAULT 0,
//   exact_hits   integer DEFAULT 0,
//   outcome_hits integer DEFAULT 0,
//   playoff_points integer DEFAULT 0,
//   total_goals_guess integer,        -- tiebreaker 3: user's predicted total goals
//   group_stage_leader boolean DEFAULT false,
//   joined_at    timestamptz DEFAULT now()
// );
// CREATE TABLE wc_picks (
//   id              text PRIMARY KEY,  -- 'wc2026_{userId}_{matchId}'
//   user_id         text NOT NULL,
//   match_id        text NOT NULL,
//   home_score      integer,
//   away_score      integer,
//   points_earned   integer,           -- null = not yet scored
//   is_exact        boolean,
//   is_correct_outcome boolean,
//   submitted_at    timestamptz DEFAULT now()
// );
// CREATE TABLE wc_playoff_picks (
//   id           text PRIMARY KEY,    -- 'wc2026_{userId}_{round}'
//   user_id      text NOT NULL,
//   round        text NOT NULL,       -- 'r32'|'r16'|'qf'|'sf'|'winner'
//   team_ids     text[] DEFAULT '{}', -- teams predicted to reach this round
//   submitted_at timestamptz DEFAULT now()
// );
// CREATE TABLE wc_match_results (
//   match_id     text PRIMARY KEY,
//   home_score   integer,
//   away_score   integer,
//   home_team    text,                 -- for knockout matches
//   away_team    text,
//   status       text DEFAULT 'pending',  -- 'pending'|'final'
//   processed_at timestamptz
// );
// CREATE TABLE wc_tournament_totals (
//   id           text PRIMARY KEY DEFAULT 'wc2026',
//   actual_total_goals integer,       -- admin sets at end for tiebreaker
//   group_stage_finalized boolean DEFAULT false,
//   tournament_finished   boolean DEFAULT false
// );
// -- Groups reuse existing groups + group_members tables with game_id = 'wc2026'
// ─────────────────────────────────────────────────────────────────

import { supabase, isSupabaseConfigured } from '@/supabase'
import { SCORING } from '@/data/wc2026Teams'

// Pure helper: score a pick against a known result.
// Kept here (not in wc2026Engine) to avoid a circular import.
function computePickScore(pickHome, pickAway, resultHome, resultAway) {
  const outcome = (h, a) => h === a ? 'draw' : h > a ? 'home' : 'away'
  const isExact           = pickHome === resultHome && pickAway === resultAway
  const isCorrectOutcome  = outcome(pickHome, pickAway) === outcome(resultHome, resultAway)
  const pointsEarned      = isExact
    ? SCORING.GROUP_EXACT_SCORE
    : isCorrectOutcome ? SCORING.GROUP_CORRECT_OUTCOME : 0
  return { pointsEarned, isExact, isCorrectOutcome }
}

const WC_GAME_ID = 'wc2026'

// ── localStorage helpers (demo mode) ─────────────────────────────────────────

const LS = {
  get:    (key)        => JSON.parse(localStorage.getItem(`collush_wc_${key}`) || 'null'),
  set:    (key, val)   => localStorage.setItem(`collush_wc_${key}`, JSON.stringify(val)),
  getAll: (key)        => JSON.parse(localStorage.getItem(`collush_wc_${key}`) || '[]'),
  push:   (key, item)  => {
    const arr = LS.getAll(key)
    arr.push(item)
    localStorage.setItem(`collush_wc_${key}`, JSON.stringify(arr))
  },
  update: (key, id, updates) => {
    const arr = LS.getAll(key)
    const idx = arr.findIndex((x) => x.id === id)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...updates }
    else arr.push({ id, ...updates })
    localStorage.setItem(`collush_wc_${key}`, JSON.stringify(arr))
  },
  delete: (key, id) => {
    const arr = LS.getAll(key).filter((x) => x.id !== id)
    localStorage.setItem(`collush_wc_${key}`, JSON.stringify(arr))
  },
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapPlayer(row) {
  if (!row) return null
  return {
    id:                row.id,
    userId:            row.user_id,
    displayName:       row.display_name,
    totalPoints:       row.total_points       ?? 0,
    exactHits:         row.exact_hits         ?? 0,
    outcomeHits:       row.outcome_hits       ?? 0,
    playoffPoints:     row.playoff_points     ?? 0,
    totalGoalsGuess:   row.total_goals_guess  ?? null,
    groupStageLeader:  row.group_stage_leader ?? false,
    joinedAt:          row.joined_at,
  }
}

function mapPick(row) {
  if (!row) return null
  return {
    id:                row.id,
    userId:            row.user_id,
    matchId:           row.match_id,
    homeScore:         row.home_score         ?? null,
    awayScore:         row.away_score         ?? null,
    pointsEarned:      row.points_earned      ?? null,
    isExact:           row.is_exact           ?? null,
    isCorrectOutcome:  row.is_correct_outcome ?? null,
    submittedAt:       row.submitted_at,
  }
}

function mapPlayoffPick(row) {
  if (!row) return null
  return {
    id:          row.id,
    userId:      row.user_id,
    round:       row.round,
    teamIds:     row.team_ids ?? [],
    submittedAt: row.submitted_at,
  }
}

function mapResult(row) {
  if (!row) return null
  return {
    matchId:     row.match_id,
    homeScore:   row.home_score  ?? null,
    awayScore:   row.away_score  ?? null,
    homeTeam:    row.home_team   ?? null,
    awayTeam:    row.away_team   ?? null,
    status:      row.status      ?? 'pending',
    processedAt: row.processed_at,
  }
}

// ── PLAYERS ───────────────────────────────────────────────────────────────────

export async function joinWCGame({ userId, displayName }) {
  const playerId = `${WC_GAME_ID}_${userId}`
  const data = {
    id: playerId, userId, displayName,
    totalPoints: 0, exactHits: 0, outcomeHits: 0, playoffPoints: 0,
    totalGoalsGuess: null, groupStageLeader: false,
    joinedAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wc_players').upsert(
      { id: playerId, user_id: userId, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (error) throw new Error(error.message)
    return data
  }
  const existing = LS.getAll('players').find((p) => p.id === playerId)
  if (!existing) LS.push('players', data)
  return existing || data
}

export async function getWCPlayer(userId) {
  const playerId = `${WC_GAME_ID}_${userId}`
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('wc_players').select('*').eq('id', playerId).maybeSingle()
    if (error) return null
    return mapPlayer(data)
  }
  return LS.getAll('players').find((p) => p.id === playerId) || null
}

export async function getAllWCPlayers() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('wc_players').select('*').order('total_points', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map(mapPlayer)
  }
  return LS.getAll('players')
    .filter((p) => p.id?.startsWith(WC_GAME_ID))
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
}

/**
 * Update the display_name on the wc_players row for this user.
 * Called when a user changes their screen name so the World Cup leaderboard
 * reflects the new name immediately.
 */
export async function updateWCPlayerDisplayName(userId, newDisplayName) {
  const playerId = `${WC_GAME_ID}_${userId}`
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('wc_players')
      .update({ display_name: newDisplayName })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return
  }
  // Demo mode
  LS.update('players', playerId, { displayName: newDisplayName })
}

export async function updateWCPlayer(userId, updates) {
  const playerId = `${WC_GAME_ID}_${userId}`
  if (isSupabaseConfigured && supabase) {
    const dbUpdates = {}
    if (updates.totalPoints       !== undefined) dbUpdates.total_points        = updates.totalPoints
    if (updates.exactHits         !== undefined) dbUpdates.exact_hits          = updates.exactHits
    if (updates.outcomeHits       !== undefined) dbUpdates.outcome_hits        = updates.outcomeHits
    if (updates.playoffPoints     !== undefined) dbUpdates.playoff_points      = updates.playoffPoints
    if (updates.totalGoalsGuess   !== undefined) dbUpdates.total_goals_guess   = updates.totalGoalsGuess
    if (updates.groupStageLeader  !== undefined) dbUpdates.group_stage_leader  = updates.groupStageLeader
    const { error } = await supabase.from('wc_players').update(dbUpdates).eq('id', playerId)
    if (error) throw new Error(error.message)
    return
  }
  LS.update('players', playerId, updates)
}

export function subscribeToWCPlayers(callback) {
  if (isSupabaseConfigured && supabase) {
    getAllWCPlayers().then(callback)
    const channel = supabase
      .channel(`wc-players-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wc_players' },
        async () => callback(await getAllWCPlayers()))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }
  const interval = setInterval(async () => callback(await getAllWCPlayers()), 3000)
  getAllWCPlayers().then(callback)
  return () => clearInterval(interval)
}

// ── GROUP STAGE PICKS ─────────────────────────────────────────────────────────

export async function saveGroupPick({ userId, matchId, homeScore, awayScore }) {
  const pickId = `${WC_GAME_ID}_${userId}_${matchId}`
  const data = {
    id: pickId, userId, matchId,
    homeScore, awayScore,
    pointsEarned: null, isExact: null, isCorrectOutcome: null,
    submittedAt: new Date().toISOString(),
  }

  if (isSupabaseConfigured && supabase) {
    // Upsert only the score columns — deliberately exclude points_earned / is_exact /
    // is_correct_outcome so that existing scoring is never overwritten when a user
    // re-saves a pick after the admin has already scored the match.
    const { error } = await supabase.from('wc_picks').upsert({
      id: pickId, user_id: userId, match_id: matchId,
      home_score: homeScore, away_score: awayScore,
    })
    if (error) throw new Error(error.message)

    // If a final result already exists for this match, score the pick immediately
    // so users who save after the admin never see "Scoring pending".
    const { data: result } = await supabase
      .from('wc_match_results')
      .select('home_score, away_score')
      .eq('match_id', matchId)
      .eq('status', 'final')
      .maybeSingle()

    if (result) {
      const scored = computePickScore(homeScore, awayScore, result.home_score, result.away_score)
      await supabase.from('wc_picks').update({
        points_earned:       scored.pointsEarned,
        is_exact:            scored.isExact,
        is_correct_outcome:  scored.isCorrectOutcome,
      }).eq('id', pickId)
      Object.assign(data, scored)
    }

    return data
  }

  // ── Demo mode ────────────────────────────────────────────────────────────────
  // Preserve any existing scoring when re-saving a pick.
  const existing = LS.getAll('picks').find((p) => p.id === pickId)
  if (existing?.pointsEarned !== null && existing?.pointsEarned !== undefined) {
    data.pointsEarned      = existing.pointsEarned
    data.isExact           = existing.isExact
    data.isCorrectOutcome  = existing.isCorrectOutcome
  }
  // Auto-score if a result exists in demo storage.
  const demoResult = LS.getAll('match_results').find(
    (r) => r.matchId === matchId && r.status === 'final'
  )
  if (demoResult) {
    const scored = computePickScore(homeScore, awayScore, demoResult.homeScore, demoResult.awayScore)
    Object.assign(data, scored)
  }
  LS.update('picks', pickId, data)
  return data
}

export async function getPicksForUser(userId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wc_picks').select('*').eq('user_id', userId)
    if (error) throw new Error(error.message)
    return (data || []).map(mapPick)
  }
  return LS.getAll('picks').filter((p) => p.userId === userId && p.id?.startsWith(WC_GAME_ID))
}

export async function getPicksForMatch(matchId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wc_picks').select('*').eq('match_id', matchId)
    if (error) throw new Error(error.message)
    return (data || []).map(mapPick)
  }
  return LS.getAll('picks').filter((p) => p.matchId === matchId)
}

export async function getAllWCPicks() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('wc_picks').select('*')
    if (error) throw new Error(error.message)
    return (data || []).map(mapPick)
  }
  return LS.getAll('picks').filter((p) => p.id?.startsWith(WC_GAME_ID))
}

export async function updatePickScoring(pickId, { pointsEarned, isExact, isCorrectOutcome }) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wc_picks').update({
      points_earned: pointsEarned,
      is_exact: isExact,
      is_correct_outcome: isCorrectOutcome,
    }).eq('id', pickId)
    if (error) throw new Error(error.message)
    return
  }
  LS.update('picks', pickId, { pointsEarned, isExact, isCorrectOutcome })
}

// ── PLAYOFF PICKS ─────────────────────────────────────────────────────────────

export async function savePlayoffPick({ userId, round, teamIds }) {
  const pickId = `${WC_GAME_ID}_${userId}_${round}`
  const data = { id: pickId, userId, round, teamIds, submittedAt: new Date().toISOString() }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wc_playoff_picks').upsert({
      id: pickId, user_id: userId, round, team_ids: teamIds,
    })
    if (error) throw new Error(error.message)
    return data
  }
  LS.update('playoff_picks', pickId, data)
  return data
}

export async function getPlayoffPicksForUser(userId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wc_playoff_picks').select('*').eq('user_id', userId)
    if (error) throw new Error(error.message)
    return (data || []).map(mapPlayoffPick)
  }
  return LS.getAll('playoff_picks').filter((p) => p.userId === userId)
}

export async function getAllPlayoffPicks() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('wc_playoff_picks').select('*')
    if (error) throw new Error(error.message)
    return (data || []).map(mapPlayoffPick)
  }
  return LS.getAll('playoff_picks')
}

// ── MATCH RESULTS (admin) ─────────────────────────────────────────────────────

export async function saveMatchResult({ matchId, homeScore, awayScore, homeTeam, awayTeam }) {
  const data = {
    matchId, homeScore, awayScore,
    homeTeam: homeTeam || null, awayTeam: awayTeam || null,
    status: 'final', processedAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wc_match_results').upsert({
      match_id: matchId, home_score: homeScore, away_score: awayScore,
      home_team: homeTeam || null, away_team: awayTeam || null,
      status: 'final', processed_at: data.processedAt,
    })
    if (error) throw new Error(error.message)
    return data
  }
  LS.update('match_results', matchId, data)
  return data
}

export async function getMatchResult(matchId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wc_match_results').select('*').eq('match_id', matchId).maybeSingle()
    if (error) return null
    return mapResult(data)
  }
  return LS.getAll('match_results').find((r) => r.matchId === matchId) || null
}

export async function getAllMatchResults() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('wc_match_results').select('*')
    if (error) throw new Error(error.message)
    return (data || []).map(mapResult)
  }
  return LS.getAll('match_results')
}

export async function deleteMatchResult(matchId) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('wc_match_results').delete().eq('match_id', matchId)
    if (error) throw new Error(error.message)
    return
  }
  LS.delete('match_results', matchId)
}

// ── TOURNAMENT METADATA ───────────────────────────────────────────────────────

export async function getTournamentMeta() {
  const defaults = { id: WC_GAME_ID, actualTotalGoals: null, groupStageFinalized: false, tournamentFinished: false }
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('wc_tournament_totals').select('*').eq('id', WC_GAME_ID).maybeSingle()
    if (error || !data) return defaults
    return {
      id: data.id,
      actualTotalGoals:    data.actual_total_goals    ?? null,
      groupStageFinalized: data.group_stage_finalized ?? false,
      tournamentFinished:  data.tournament_finished   ?? false,
    }
  }
  return LS.get('tournament_meta') || defaults
}

export async function updateTournamentMeta(updates) {
  if (isSupabaseConfigured && supabase) {
    const dbUpdates = {}
    if (updates.actualTotalGoals    !== undefined) dbUpdates.actual_total_goals    = updates.actualTotalGoals
    if (updates.groupStageFinalized !== undefined) dbUpdates.group_stage_finalized = updates.groupStageFinalized
    if (updates.tournamentFinished  !== undefined) dbUpdates.tournament_finished   = updates.tournamentFinished
    const { error } = await supabase.from('wc_tournament_totals')
      .upsert({ id: WC_GAME_ID, ...dbUpdates })
    if (error) throw new Error(error.message)
    return
  }
  const current = LS.get('tournament_meta') || {}
  LS.set('tournament_meta', { ...current, ...updates })
}

// ── GROUPS (reuse existing groups + group_members tables) ─────────────────────
import { createGroup as _createGroup, joinGroupByCode as _joinGroupByCode } from './firestore'
export const createGroup    = _createGroup
export const joinGroupByCode = _joinGroupByCode

export async function getWCGroupsForUser(userId) {
  if (isSupabaseConfigured && supabase) {
    const { data: memberships, error: memErr } = await supabase
      .from('group_members').select('group_id').eq('user_id', userId)
    if (memErr) throw new Error(memErr.message)
    if (!memberships?.length) return []
    const groupIds = memberships.map((m) => m.group_id)
    const { data: groups, error: grpErr } = await supabase
      .from('groups')
      .select('*, group_members(user_id)')
      .in('id', groupIds)
      .eq('game_id', WC_GAME_ID)
    if (grpErr) throw new Error(grpErr.message)
    return (groups || []).map((g) => ({
      id:         g.id,
      name:       g.name,
      createdBy:  g.created_by,
      gameId:     g.game_id,
      inviteCode: g.invite_code,
      createdAt:  g.created_at,
      members:    (g.group_members || []).map((m) => m.user_id),
    }))
  }
  // Demo mode
  const allGroups = JSON.parse(localStorage.getItem('collush_groups') || '[]')
  return allGroups.filter((g) => g.gameId === WC_GAME_ID && g.members?.includes(userId))
}
