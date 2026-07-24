// NFL Fantasy Manager League — Roster Service
// Builds a manager's starting roster (random draw or empty) and exposes
// roster reads + value calculation. Market-based acquisition (Phase 2+)
// will extend nfl_roster_slots the same way admin overrides do today.
import { requireSupabase } from './shared'

const POSITION_WEIGHT = { QB: 1.4, RB: 1.2, WR: 1.1, TE: 0.9, K: 0.4, DST: 0.5 }

// ── Row mappers ───────────────────────────────────────────────────────────

export function mapRosterSlot(row) {
  if (!row) return null
  return {
    id: row.id,
    leagueId: row.league_id,
    managerId: row.manager_id,
    playerId: row.player_id,
    acquisitionType: row.acquisition_type,
    purchasePrice: row.purchase_price,
    acquiredAt: row.acquired_at,
    player: row.nfl_players ? mapPlayer(row.nfl_players) : undefined,
  }
}

export function mapPlayer(row) {
  if (!row) return null
  return {
    id: row.id,
    displayName: row.display_name,
    position: row.position,
    nflTeam: row.nfl_team,
    byeWeek: row.bye_week,
    status: row.status,
    injuryStatus: row.injury_status,
    activeFlag: row.active_flag,
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────

export async function getRosterForManager(managerId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_roster_slots').select('*, nfl_players(*)').eq('manager_id', managerId)
  if (error) throw new Error(error.message)
  return (data || []).map(mapRosterSlot)
}

export async function getLeagueRoster(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_roster_slots').select('*, nfl_players(*)').eq('league_id', leagueId)
  if (error) throw new Error(error.message)
  return (data || []).map(mapRosterSlot)
}

export async function getLeaguePlayerValues(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_league_player_values').select('*').eq('league_id', leagueId)
  if (error) throw new Error(error.message)
  return data || []
}

/** Search the global player catalog (Commissioner "Players" screen). */
export async function searchPlayers({ query, position } = {}) {
  const supabase = requireSupabase()
  let q = supabase.from('nfl_players').select('*').order('display_name', { ascending: true }).limit(200)
  if (position) q = q.eq('position', position)
  if (query) q = q.ilike('display_name', `%${query}%`)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data || []).map(mapPlayer)
}

/** Admin correction of a player's catalog info (status/injury/bye/team) — no live API in Phase 1. */
export async function updatePlayer(playerId, updates) {
  const supabase = requireSupabase()
  const dbUpdates = { updated_at: new Date().toISOString() }
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.injuryStatus !== undefined) dbUpdates.injury_status = updates.injuryStatus
  if (updates.byeWeek !== undefined) dbUpdates.bye_week = updates.byeWeek
  if (updates.nflTeam !== undefined) dbUpdates.nfl_team = updates.nflTeam
  if (updates.activeFlag !== undefined) dbUpdates.active_flag = updates.activeFlag
  const { error } = await supabase.from('nfl_players').update(dbUpdates).eq('id', playerId)
  if (error) throw new Error(error.message)
}

export function computeRosterValue(rosterSlots, playerValuesByPlayerId) {
  return rosterSlots.reduce((sum, slot) => {
    const value = playerValuesByPlayerId?.[slot.playerId]?.market_value ?? slot.purchasePrice ?? 0
    return sum + value
  }, 0)
}

// ── Valuation (Phase 1 static estimate — no market yet) ──────────────────

function valuePlayers(players, totalBudget) {
  const weights = players.map((p) => POSITION_WEIGHT[p.position] ?? 1)
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1
  const spendTarget = totalBudget * (0.7 + Math.random() * 0.2) // spend 70-90% of budget
  const basePerWeight = spendTarget / totalWeight

  let prices = weights.map((w) => {
    const jitter = 0.85 + Math.random() * 0.3
    return Math.round((basePerWeight * w * jitter) / 100000) * 100000
  })

  const total = prices.reduce((s, v) => s + v, 0)
  if (total > totalBudget) {
    const scale = totalBudget / total
    prices = prices.map((v) => Math.round((v * scale) / 100000) * 100000)
  }
  return prices
}

function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Randomly draw a starting roster for one manager per the league's
 * roster_template, spend an estimated value per player out of budget,
 * and leave the remainder as balance. Skips players already owned in
 * the league (unique constraint on nfl_roster_slots would reject them
 * anyway, but pre-filtering avoids a wasted round trip).
 */
export async function buildRandomRoster({ league, member }) {
  const supabase = requireSupabase()

  const { data: ownedRows, error: ownedErr } = await supabase
    .from('nfl_roster_slots').select('player_id').eq('league_id', league.id)
  if (ownedErr) throw new Error(ownedErr.message)
  const ownedIds = new Set((ownedRows || []).map((r) => r.player_id))

  const picks = []
  for (const [position, count] of Object.entries(league.rosterTemplate)) {
    const { data: candidates, error } = await supabase
      .from('nfl_players').select('*').eq('position', position).eq('active_flag', true)
    if (error) throw new Error(error.message)
    const available = shuffle((candidates || []).filter((p) => !ownedIds.has(p.id)))
    if (available.length < count) {
      throw new Error(`Not enough available ${position} players to complete the random draw.`)
    }
    for (let i = 0; i < count; i++) {
      picks.push(available[i])
      ownedIds.add(available[i].id)
    }
  }

  const prices = valuePlayers(picks, league.budgetAmount)
  const totalSpent = prices.reduce((s, v) => s + v, 0)

  const rosterRows = picks.map((p, i) => ({
    league_id: league.id,
    manager_id: member.id,
    player_id: p.id,
    acquisition_type: 'random_draw',
    purchase_price: prices[i],
  }))
  const { error: rosterErr } = await supabase.from('nfl_roster_slots').insert(rosterRows)
  if (rosterErr) {
    if (rosterErr.code === '23505') throw new Error('A player in this draw was already claimed — please retry.')
    throw new Error(rosterErr.message)
  }

  const valueRows = picks.map((p, i) => ({
    league_id: league.id,
    player_id: p.id,
    market_value: prices[i],
    purchase_price: prices[i],
  }))
  const { error: valueErr } = await supabase.from('nfl_league_player_values').upsert(valueRows, { onConflict: 'league_id,player_id' })
  if (valueErr) throw new Error(valueErr.message)

  const txRows = picks.map((p, i) => ({
    league_id: league.id,
    transaction_type: 'roster_draw',
    to_manager_id: member.id,
    player_id: p.id,
    amount: prices[i],
    notes: 'Random draw — league start',
  }))
  const { error: txErr } = await supabase.from('nfl_transactions').insert(txRows)
  if (txErr) throw new Error(txErr.message)

  const newBalance = league.budgetAmount - totalSpent
  const { error: balErr } = await supabase
    .from('nfl_league_members').update({ balance: newBalance }).eq('id', member.id)
  if (balErr) throw new Error(balErr.message)

  return { picks, totalSpent, newBalance }
}

/**
 * "Empty roster" start mode — no players assigned, full budget kept.
 * Nothing to do here yet (balance is already set to budgetAmount at
 * join time); this exists as an explicit action so the UI has a single
 * "claim starting roster" entry point regardless of roster_mode.
 */
export async function initEmptyRoster() {
  return { picks: [], totalSpent: 0 }
}
