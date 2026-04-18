// Data Service (Supabase)
// All game data operations — games, players, picks, race results, groups.
// Falls back to localStorage in demo mode.
//
// DB columns use snake_case (PostgreSQL convention). Row mappers convert to
// camelCase at the boundary so no other file in the app needs to change.

import { supabase, isSupabaseConfigured } from '@/supabase'

// ─── localStorage helpers (demo mode) ───────────────────────────────────────

const LS = {
  get:    (key)        => JSON.parse(localStorage.getItem(`collush_${key}`) || 'null'),
  set:    (key, val)   => localStorage.setItem(`collush_${key}`, JSON.stringify(val)),
  getAll: (key)        => JSON.parse(localStorage.getItem(`collush_${key}`) || '[]'),
  push:   (key, item)  => {
    const arr = LS.getAll(key)
    arr.push(item)
    localStorage.setItem(`collush_${key}`, JSON.stringify(arr))
  },
  update: (key, id, updates) => {
    const arr = LS.getAll(key)
    const idx = arr.findIndex((x) => x.id === id)
    if (idx >= 0) arr[idx] = { ...arr[idx], ...updates }
    localStorage.setItem(`collush_${key}`, JSON.stringify(arr))
  },
}

// ─── Row mappers (DB snake_case → JS camelCase) ──────────────────────────────

function mapGame(row) {
  if (!row) return null
  const { created_by, current_race_index, created_at, ...rest } = row
  return { ...rest, createdBy: created_by, currentRaceIndex: current_race_index, createdAt: created_at }
}

function mapPlayer(row) {
  if (!row) return null
  const { game_id, user_id, display_name, joined_at, last_race_id,
          eliminated_at, win_reason, race_outcomes, ...rest } = row
  return {
    ...rest,
    gameId:      game_id,
    userId:      user_id,
    displayName: display_name,
    joinedAt:    joined_at,
    lastRaceId:  last_race_id,
    eliminatedAt: eliminated_at,
    winReason:   win_reason,
    // Expand race_outcomes JSONB → raceResult_<raceId> fields (mirrors Firestore dynamic keys)
    ...(race_outcomes
      ? Object.fromEntries(Object.entries(race_outcomes).map(([k, v]) => [`raceResult_${k}`, v]))
      : {}),
  }
}

function mapPick(row) {
  if (!row) return null
  const { game_id, user_id, race_id, column_a, column_b,
          result_a, result_b, point_earned, submitted_at, ...rest } = row
  return {
    ...rest,
    gameId:      game_id,
    userId:      user_id,
    raceId:      race_id,
    columnA:     column_a,
    columnB:     column_b,
    resultA:     result_a,
    resultB:     result_b,
    pointEarned: point_earned,
    submittedAt: submitted_at,
  }
}

function mapRaceResult(row) {
  if (!row) return null
  const { game_id, race_id, processed_at, ...rest } = row
  return { ...rest, gameId: game_id, raceId: race_id, processedAt: processed_at }
}

function mapGroup(row) {
  if (!row) return null
  const { game_id, created_by, invite_code, created_at, group_members, ...rest } = row
  return {
    ...rest,
    gameId:     game_id,
    createdBy:  created_by,
    inviteCode: invite_code,
    createdAt:  created_at,
    members:    (group_members || []).map((m) => m.user_id),
  }
}

// ─── GAMES ───────────────────────────────────────────────────────────────────

export async function createGame({ gameId, season, name, createdBy }) {
  const data = {
    id: gameId, season, name, createdBy,
    status: 'active', currentRaceIndex: 0,
    createdAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('games').upsert(
      { id: gameId, season, name, status: 'active', current_race_index: 0 },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (error) throw new Error(error.message)
    return data
  }
  LS.push('games', data)
  return data
}

export async function getGame(gameId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (error) return null
    return mapGame(data)
  }
  return LS.getAll('games').find((g) => g.id === gameId) || null
}

// ─── PLAYERS ─────────────────────────────────────────────────────────────────

export async function joinGame({ gameId, userId, displayName }) {
  const playerId = `${gameId}_${userId}`
  const data = {
    id: playerId, gameId, userId, displayName,
    status: 'alive', points: 0,
    joinedAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('players').upsert(
      { id: playerId, game_id: gameId, user_id: userId, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    if (error) throw new Error(error.message)
    return data
  }
  const existing = LS.getAll('players').find((p) => p.id === playerId)
  if (!existing) LS.push('players', data)
  return existing || data
}

export async function getPlayers(gameId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('players').select('*').eq('game_id', gameId)
    if (error) throw new Error(error.message)
    return (data || []).map(mapPlayer)
  }
  return LS.getAll('players').filter((p) => p.gameId === gameId)
}

export async function updatePlayerStatus(playerId, updates) {
  if (isSupabaseConfigured && supabase) {
    const dbUpdates = {}
    const raceOutcomeUpdates = {}

    for (const [key, val] of Object.entries(updates)) {
      if      (key.startsWith('raceResult_')) raceOutcomeUpdates[key.replace('raceResult_', '')] = val
      else if (key === 'points')       dbUpdates.points        = val
      else if (key === 'status')       dbUpdates.status        = val
      else if (key === 'lastRaceId')   dbUpdates.last_race_id  = val
      else if (key === 'tiebreaker')   dbUpdates.tiebreaker    = val
      else if (key === 'eliminatedAt') dbUpdates.eliminated_at = val
      else if (key === 'winReason')    dbUpdates.win_reason    = val
    }

    // Merge dynamic raceResult_* values into the race_outcomes JSONB column
    if (Object.keys(raceOutcomeUpdates).length > 0) {
      const { data: current } = await supabase
        .from('players').select('race_outcomes').eq('id', playerId).single()
      dbUpdates.race_outcomes = { ...(current?.race_outcomes || {}), ...raceOutcomeUpdates }
    }

    const { error } = await supabase.from('players').update(dbUpdates).eq('id', playerId)
    if (error) throw new Error(error.message)
    return
  }
  LS.update('players', playerId, updates)
}

export function subscribeToPlayers(gameId, callback) {
  if (isSupabaseConfigured && supabase) {
    // Immediately push current state
    getPlayers(gameId).then(callback)

    // Use a unique channel name per subscription so multiple callers of
    // useF1Game() (e.g. Layout + Page) don't collide on the same channel.
    const channelName = `players-${gameId}-${Math.random().toString(36).slice(2, 8)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        async () => callback(await getPlayers(gameId))
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }
  // Demo: poll every 2 s
  const interval = setInterval(async () => callback(await getPlayers(gameId)), 2000)
  getPlayers(gameId).then(callback)
  return () => clearInterval(interval)
}

// ─── PICKS ───────────────────────────────────────────────────────────────────

export async function submitPick({ gameId, userId, raceId, columnA, columnB }) {
  const pickId = `${gameId}_${userId}_${raceId}`
  const data = {
    id: pickId, gameId, userId, raceId, columnA, columnB,
    resultA: null, resultB: null, survived: null,
    pointEarned: false, submittedAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('picks').upsert({
      id: pickId, game_id: gameId, user_id: userId, race_id: raceId,
      column_a: columnA, column_b: columnB,
      result_a: null, result_b: null, survived: null, point_earned: false,
    })
    if (error) throw new Error(error.message)
    return data
  }
  const existing = LS.getAll('picks').find((p) => p.id === pickId)
  if (existing) {
    LS.update('picks', pickId, { columnA, columnB, submittedAt: data.submittedAt })
    return { ...existing, columnA, columnB }
  }
  LS.push('picks', data)
  return data
}

export async function getPick(gameId, userId, raceId) {
  const pickId = `${gameId}_${userId}_${raceId}`
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('picks').select('*').eq('id', pickId).single()
    if (error) return null
    return mapPick(data)
  }
  return LS.getAll('picks').find((p) => p.id === pickId) || null
}

export async function getPicksForRace(gameId, raceId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('picks').select('*')
      .eq('game_id', gameId).eq('race_id', raceId)
    if (error) throw new Error(error.message)
    return (data || []).map(mapPick)
  }
  return LS.getAll('picks').filter((p) => p.gameId === gameId && p.raceId === raceId)
}

export async function getPicksForPlayer(gameId, userId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('picks').select('*')
      .eq('game_id', gameId).eq('user_id', userId)
      .order('submitted_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data || []).map(mapPick)
  }
  return LS.getAll('picks')
    .filter((p) => p.gameId === gameId && p.userId === userId)
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
}

export async function getPicksForGame(gameId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('picks').select('*').eq('game_id', gameId)
    if (error) throw new Error(error.message)
    return (data || []).map(mapPick)
  }
  return LS.getAll('picks').filter((p) => p.gameId === gameId)
}

export async function updatePick(pickId, updates) {
  if (isSupabaseConfigured && supabase) {
    const dbUpdates = {}
    if (updates.resultA    !== undefined) dbUpdates.result_a     = updates.resultA
    if (updates.resultB    !== undefined) dbUpdates.result_b     = updates.resultB
    if (updates.survived   !== undefined) dbUpdates.survived     = updates.survived
    if (updates.pointEarned !== undefined) dbUpdates.point_earned = updates.pointEarned
    const { error } = await supabase.from('picks').update(dbUpdates).eq('id', pickId)
    if (error) throw new Error(error.message)
    return
  }
  LS.update('picks', pickId, updates)
}

// ─── RACE RESULTS ────────────────────────────────────────────────────────────

export async function saveRaceResult({ gameId, raceId, results }) {
  const resultId = `${gameId}_${raceId}`
  const data = {
    id: resultId, gameId, raceId, results,
    processedAt: new Date().toISOString(), locked: true,
  }
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('race_results').upsert({
      id: resultId, game_id: gameId, race_id: raceId, results, locked: true,
    })
    if (error) throw new Error(error.message)
    return data
  }
  const existing = LS.getAll('raceResults').find((r) => r.id === resultId)
  if (existing) { LS.update('raceResults', resultId, data); return data }
  LS.push('raceResults', data)
  return data
}

export async function getRaceResult(gameId, raceId) {
  const resultId = `${gameId}_${raceId}`
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('race_results').select('*').eq('id', resultId).single()
    if (error) return null
    return mapRaceResult(data)
  }
  return LS.getAll('raceResults').find((r) => r.id === resultId) || null
}

/**
 * Undo all pick evaluations and player state changes for a given race.
 * Called before deleting results OR before re-processing with new results.
 * Safe to call even if the race was never processed (no-op).
 */
export async function resetRaceProcessing(gameId, raceId) {
  if (!isSupabaseConfigured || !supabase) return // localStorage mode: no-op

  // 1. Fetch picks that were actually evaluated (result_a is not null)
  const { data: rawPicks } = await supabase
    .from('picks')
    .select('id, user_id, point_earned, result_a')
    .eq('game_id', gameId)
    .eq('race_id', raceId)

  const processedPicks = (rawPicks || []).filter((p) => p.result_a !== null)

  // 2. For each processed pick, undo the player-level changes
  await Promise.all(
    processedPicks.map(async (pick) => {
      const playerId = `${gameId}_${pick.user_id}`
      const { data: row } = await supabase
        .from('players').select('*').eq('id', playerId).single()
      if (!row) return

      // Remove this race from race_outcomes JSONB
      const newOutcomes = { ...(row.race_outcomes || {}) }
      delete newOutcomes[raceId]

      // Was the player eliminated or made winner specifically by this race's processing?
      const wasEliminatedHere = row.eliminated_at === raceId
      const becameWinnerHere  = row.status === 'winner' && row.last_race_id === raceId

      return supabase.from('players').update({
        // Restore status to alive if this race eliminated or crowned them
        status:       (wasEliminatedHere || becameWinnerHere) ? 'alive' : row.status,
        eliminated_at: wasEliminatedHere ? null : row.eliminated_at,
        win_reason:    becameWinnerHere   ? null : row.win_reason,
        // Subtract the bonus point this race may have granted
        points: Math.max(0, (row.points || 0) - (pick.point_earned ? 1 : 0)),
        // Clear the last_race_id if it was set by this race
        last_race_id: row.last_race_id === raceId ? null : row.last_race_id,
        // Clear tiebreaker flag set by this race
        tiebreaker: row.last_race_id === raceId ? false : row.tiebreaker,
        race_outcomes: newOutcomes,
      }).eq('id', playerId)
    })
  )

  // 3. Null out pick evaluation fields for this race
  await supabase
    .from('picks')
    .update({ result_a: null, result_b: null, survived: null, point_earned: null })
    .eq('game_id', gameId)
    .eq('race_id', raceId)
}

export async function deleteRaceResult(gameId, raceId) {
  // First undo all player + pick changes caused by processing this race
  await resetRaceProcessing(gameId, raceId)

  const resultId = `${gameId}_${raceId}`
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('race_results').delete().eq('id', resultId)
    if (error) throw new Error(error.message)
    return
  }
  const arr = LS.getAll('raceResults').filter((r) => r.id !== resultId)
  localStorage.setItem('collush_raceResults', JSON.stringify(arr))
}

export async function getAllRaceResults(gameId) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('race_results').select('*').eq('game_id', gameId)
    if (error) throw new Error(error.message)
    return (data || []).map(mapRaceResult)
  }
  return LS.getAll('raceResults').filter((r) => r.gameId === gameId)
}

// ─── GROUPS ──────────────────────────────────────────────────────────────────

export async function createGroup({ name, createdBy, gameId, inviteCode }) {
  const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const data = {
    id: groupId, name, createdBy, gameId, inviteCode,
    members: [createdBy], createdAt: new Date().toISOString(),
  }
  if (isSupabaseConfigured && supabase) {
    // Ensure the game record exists so the FK constraint is satisfied
    await supabase.from('games').upsert(
      { id: gameId, season: '2026', name: gameId, status: 'active', current_race_index: 0 },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    const { error: groupError } = await supabase.from('groups').insert({
      id: groupId, name,
      created_by: createdBy,
      game_id: gameId,
      invite_code: inviteCode,
    })
    if (groupError) throw new Error(groupError.message)

    const { error: memberError } = await supabase
      .from('group_members').insert({ group_id: groupId, user_id: createdBy })
    if (memberError) throw new Error(memberError.message)

    return data
  }
  LS.push('groups', data)
  return data
}

export async function joinGroupByCode(inviteCode, userId) {
  if (isSupabaseConfigured && supabase) {
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*, group_members(user_id)')
      .eq('invite_code', inviteCode)
    if (error) throw new Error(error.message)
    if (!groups || groups.length === 0) throw new Error('Invalid invite code')

    const group = groups[0]
    const members = (group.group_members || []).map((m) => m.user_id)

    if (!members.includes(userId)) {
      const { error: memberError } = await supabase
        .from('group_members').insert({ group_id: group.id, user_id: userId })
      if (memberError) throw new Error(memberError.message)
      members.push(userId)
    }

    return mapGroup({ ...group, group_members: members.map((uid) => ({ user_id: uid })) })
  }
  const groups = LS.getAll('groups')
  const group = groups.find((g) => g.inviteCode === inviteCode)
  if (!group) throw new Error('Invalid invite code')
  if (!group.members.includes(userId)) {
    group.members.push(userId)
    LS.update('groups', group.id, { members: group.members })
  }
  return group
}

/**
 * Update the display_name on every player row that belongs to this user.
 * Called when a user changes their screen name so the F1 Survivor leaderboard
 * reflects the new name immediately.
 */
export async function updatePlayerDisplayName(userId, newDisplayName) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('players')
      .update({ display_name: newDisplayName })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return
  }
  // Demo mode: update every player entry for this user across all games
  const players = LS.getAll('players')
  players.forEach((p) => {
    if (p.userId === userId) p.displayName = newDisplayName
  })
  localStorage.setItem('collush_players', JSON.stringify(players))
}

export async function getGroupsForUser(userId) {
  if (isSupabaseConfigured && supabase) {
    const { data: memberships, error: memError } = await supabase
      .from('group_members').select('group_id').eq('user_id', userId)
    if (memError) throw new Error(memError.message)
    if (!memberships || memberships.length === 0) return []

    const groupIds = memberships.map((m) => m.group_id)
    const { data: groups, error: groupError } = await supabase
      .from('groups')
      .select('*, group_members(user_id)')
      .in('id', groupIds)
    if (groupError) throw new Error(groupError.message)

    return (groups || []).map(mapGroup)
  }
  return LS.getAll('groups').filter((g) => g.members?.includes(userId))
}

// Fetch a single group by invite code + creator display name (used by join link page)
export async function getGroupByCode(inviteCode) {
  if (isSupabaseConfigured && supabase) {
    const { data: groups, error } = await supabase
      .from('groups')
      .select('*, group_members(user_id)')
      .eq('invite_code', inviteCode)
    if (error) throw new Error(error.message)
    if (!groups || groups.length === 0) throw new Error('Invalid invite code')
    const group = mapGroup(groups[0])
    // Fetch creator display name from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', group.createdBy)
      .single()
    return { ...group, creatorName: profile?.display_name || profile?.email || 'Unknown' }
  }
  const all = LS.getAll('groups')
  const group = all.find((g) => g.inviteCode === inviteCode)
  if (!group) throw new Error('Invalid invite code')
  return { ...group, creatorName: 'Unknown' }
}

// Remove a member from a group (creator-only action)
export async function removeGroupMember(groupId, userId) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return true
  }
  const all = LS.getAll('groups')
  const group = all.find((g) => g.id === groupId)
  if (group) {
    LS.update('groups', groupId, { members: group.members.filter((id) => id !== userId) })
  }
  return true
}
