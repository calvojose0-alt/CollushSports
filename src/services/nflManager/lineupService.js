// NFL Fantasy Manager League — Lineup Service
// Weekly lineup creation, slot assignment/validation, locking, and
// mid-week substitution. Phase 1 has no live game-start feed, so
// "locked" is a commissioner-triggered event (matches the app's
// existing admin-button pattern) rather than an automatic kickoff timer.
import { requireSupabase } from './shared'
import { validateSlotEligibility } from '@/services/gameEngine/nflScoringEngine'

export function mapWeeklyLineup(row) {
  if (!row) return null
  return {
    id: row.id,
    leagueId: row.league_id,
    managerId: row.manager_id,
    nflWeek: row.nfl_week,
    lineupStatus: row.lineup_status,
    lockedAt: row.locked_at,
    emptySlotPenalty: Number(row.empty_slot_penalty || 0),
    noScoreReason: row.no_score_reason,
    totalPoints: Number(row.total_points || 0),
  }
}

export function mapLineupSlot(row) {
  if (!row) return null
  return {
    id: row.id,
    weeklyLineupId: row.weekly_lineup_id,
    slotType: row.slot_type,
    playerId: row.player_id,
    slotPoints: Number(row.slot_points || 0),
    isEmpty: row.is_empty,
    wasSubstituted: row.was_substituted,
    calculationBreakdown: row.calculation_breakdown,
  }
}

async function getSlots(weeklyLineupId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_lineup_slots').select('*').eq('weekly_lineup_id', weeklyLineupId)
  if (error) throw new Error(error.message)
  return (data || []).map(mapLineupSlot)
}

/** Fetch a manager's lineup for a week, or null if never created. */
export async function getWeeklyLineup(leagueId, managerId, nflWeek) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_weekly_lineups').select('*')
    .eq('league_id', leagueId).eq('manager_id', managerId).eq('nfl_week', nflWeek)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const slots = await getSlots(data.id)
  return { ...mapWeeklyLineup(data), slots }
}

/** Fetch a manager's lineup for a week, creating an all-empty one from the league's lineup_template if needed. */
export async function getOrCreateWeeklyLineup({ league, managerId, nflWeek }) {
  const existing = await getWeeklyLineup(league.id, managerId, nflWeek)
  if (existing) return existing

  const supabase = requireSupabase()
  const { data: created, error } = await supabase.from('nfl_weekly_lineups').insert({
    league_id: league.id, manager_id: managerId, nfl_week: nflWeek,
  }).select().single()
  if (error) {
    if (error.code === '23505') return getWeeklyLineup(league.id, managerId, nflWeek)
    throw new Error(error.message)
  }

  const slotRows = league.lineupTemplate.map((slotType, i) => ({
    weekly_lineup_id: created.id,
    slot_type: `${slotType}${countSameBefore(league.lineupTemplate, i) || ''}`,
  }))
  const { error: slotsErr } = await supabase.from('nfl_lineup_slots').insert(slotRows)
  if (slotsErr) throw new Error(slotsErr.message)

  const slots = await getSlots(created.id)
  return { ...mapWeeklyLineup(created), slots }
}

// QB, RB, RB, WR, WR, TE, FLEX, DST, K -> QB, RB1, RB2, WR1, WR2, TE, FLEX, DST, K
function countSameBefore(list, index) {
  const label = list[index]
  const occurrencesSoFar = list.slice(0, index + 1).filter((s) => s === label).length
  const totalOccurrences = list.filter((s) => s === label).length
  return totalOccurrences > 1 ? occurrencesSoFar : ''
}

/** Assign a rostered player into a lineup slot, validating position eligibility and no duplicate use within the lineup. */
export async function setLineupSlot({ weeklyLineup, slotType, playerId, rosterSlots }) {
  const supabase = requireSupabase()
  if (weeklyLineup.lineupStatus === 'scored') throw new Error('This week has already been scored.')

  const rosterSlot = rosterSlots.find((r) => r.playerId === playerId)
  if (!rosterSlot) throw new Error('That player is not on your roster.')
  if (!validateSlotEligibility(slotType, rosterSlot.player?.position)) {
    throw new Error(`${rosterSlot.player?.displayName} is not eligible for the ${slotType} slot.`)
  }
  const alreadyUsed = weeklyLineup.slots.some((s) => s.slotType !== slotType && s.playerId === playerId)
  if (alreadyUsed) throw new Error('That player is already in another lineup slot this week.')

  const wasSubstituted = weeklyLineup.lineupStatus === 'locked'
  const { error } = await supabase.from('nfl_lineup_slots').update({
    player_id: playerId, is_empty: false, was_substituted: wasSubstituted,
  }).eq('weekly_lineup_id', weeklyLineup.id).eq('slot_type', slotType)
  if (error) throw new Error(error.message)
}

export async function clearLineupSlot({ weeklyLineup, slotType }) {
  const supabase = requireSupabase()
  if (weeklyLineup.lineupStatus === 'scored') throw new Error('This week has already been scored.')
  const { error } = await supabase.from('nfl_lineup_slots').update({
    player_id: null, is_empty: true,
  }).eq('weekly_lineup_id', weeklyLineup.id).eq('slot_type', slotType)
  if (error) throw new Error(error.message)
}

/** Commissioner action: lock every lineup in the league for a given week (marks first-kickoff has passed). */
export async function lockLineupsForWeek({ leagueId, nflWeek }) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('nfl_weekly_lineups')
    .update({ lineup_status: 'locked', locked_at: new Date().toISOString() })
    .eq('league_id', leagueId).eq('nfl_week', nflWeek).eq('lineup_status', 'open')
  if (error) throw new Error(error.message)
}

export async function getLineupHistory(leagueId, managerId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_weekly_lineups').select('*')
    .eq('league_id', leagueId).eq('manager_id', managerId)
    .order('nfl_week', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []).map(mapWeeklyLineup)
}
