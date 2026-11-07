// NFL Fantasy Manager League — Scoring Service
// Manual weekly stat entry + the finalizeWeek orchestration: negative-balance
// no-score check, per-slot scoring via the engine, empty-slot penalty,
// season point accumulation, and the weekly money bonus.
import { requireSupabase, writeAuditLog } from './shared'
import { getScoringProfile, getLeagueMembers } from './leagueService'
import { getWeeklyLineup } from './lineupService'
import { getLeagueRoster } from './rosterService'
import { calculatePlayerScore, computeLineupTotal, calculateWeeklyBonus } from '@/services/gameEngine/nflScoringEngine'
import { generateRandomStatLine } from '@/services/gameEngine/nflStatSimulator'

function mapStats(row) {
  if (!row) return null
  return {
    id: row.id,
    playerId: row.player_id,
    nflWeek: row.nfl_week,
    seasonYear: row.season_year,
    passing_yards: row.passing_yards,
    passing_tds: row.passing_tds,
    interceptions: row.interceptions,
    rushing_yards: row.rushing_yards,
    rushing_tds: row.rushing_tds,
    receiving_yards: row.receiving_yards,
    receiving_tds: row.receiving_tds,
    receptions: row.receptions,
    fumbles_lost: row.fumbles_lost,
    two_point_conversions: row.two_point_conversions,
    kicking: row.kicking,
    dst: row.dst,
    source: row.source,
  }
}

/**
 * Season average + recent-form projection for a set of players, computed
 * from real nfl_player_week_stats rows under a league's own scoring
 * profile (not a predictive model — just this player's own history).
 * Returns { [playerId]: { seasonAvg, projected, weeksPlayed } }, both
 * null when no stat lines exist yet for that player/season.
 */
export async function getPlayerScoringSummaries(playerIds, seasonYear, scoringProfile) {
  if (playerIds.length === 0) return {}
  const supabase = requireSupabase()

  const [{ data: statsRows, error: statsErr }, { data: playerRows, error: playerErr }] = await Promise.all([
    supabase.from('nfl_player_week_stats').select('*').in('player_id', playerIds).eq('season_year', seasonYear),
    supabase.from('nfl_players').select('id, position').in('id', playerIds),
  ])
  if (statsErr) throw new Error(statsErr.message)
  if (playerErr) throw new Error(playerErr.message)

  const positionById = Object.fromEntries((playerRows || []).map((p) => [p.id, p.position]))
  const rowsByPlayer = {}
  for (const row of statsRows || []) {
    ;(rowsByPlayer[row.player_id] ||= []).push(row)
  }

  const summaries = {}
  for (const playerId of playerIds) {
    const rows = (rowsByPlayer[playerId] || []).sort((a, b) => a.nfl_week - b.nfl_week)
    const weeklyPoints = rows.map((row) => calculatePlayerScore(positionById[playerId], mapStats(row), scoringProfile).points)

    const avg = (nums) => nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null

    summaries[playerId] = {
      seasonAvg: avg(weeklyPoints),
      projected: avg(weeklyPoints.slice(-3)),
      weeksPlayed: weeklyPoints.length,
    }
  }
  return summaries
}

export async function getPlayerWeekStats(playerId, nflWeek, seasonYear) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_player_week_stats').select('*')
    .eq('player_id', playerId).eq('nfl_week', nflWeek).eq('season_year', seasonYear)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return mapStats(data)
}

async function getStatsByPlayerId(playerIds, nflWeek, seasonYear) {
  if (playerIds.length === 0) return {}
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_player_week_stats').select('*')
    .in('player_id', playerIds).eq('nfl_week', nflWeek).eq('season_year', seasonYear)
  if (error) throw new Error(error.message)
  return Object.fromEntries((data || []).map((row) => [row.player_id, mapStats(row)]))
}

async function getPlayersById(playerIds) {
  if (playerIds.length === 0) return {}
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('nfl_players').select('*').in('id', playerIds)
  if (error) throw new Error(error.message)
  return Object.fromEntries((data || []).map((row) => [row.id, { position: row.position, displayName: row.display_name }]))
}

/** Admin manual entry/correction of one player's weekly stat line. */
export async function recordPlayerWeekStats({ playerId, nflWeek, seasonYear, stats, enteredByUserId }) {
  const supabase = requireSupabase()
  const before = await getPlayerWeekStats(playerId, nflWeek, seasonYear)

  const payload = {
    player_id: playerId, nfl_week: nflWeek, season_year: seasonYear,
    passing_yards: stats.passing_yards ?? 0,
    passing_tds: stats.passing_tds ?? 0,
    interceptions: stats.interceptions ?? 0,
    rushing_yards: stats.rushing_yards ?? 0,
    rushing_tds: stats.rushing_tds ?? 0,
    receiving_yards: stats.receiving_yards ?? 0,
    receiving_tds: stats.receiving_tds ?? 0,
    receptions: stats.receptions ?? 0,
    fumbles_lost: stats.fumbles_lost ?? 0,
    two_point_conversions: stats.two_point_conversions ?? 0,
    kicking: stats.kicking ?? { fg_0_39: 0, fg_40_49: 0, fg_50_plus: 0, xp_made: 0, fg_missed: 0 },
    dst: stats.dst ?? { sacks: 0, interceptions: 0, fumble_recoveries: 0, safeties: 0, blocked_kicks: 0, tds: 0, points_allowed: 0 },
    source: 'manual',
    entered_by_user_id: enteredByUserId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('nfl_player_week_stats').upsert(payload, { onConflict: 'player_id,nfl_week,season_year' }).select().single()
  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorUserId: enteredByUserId, leagueId: null, actionType: 'record_player_stats',
    entityType: 'player_week_stats', entityId: `${playerId}_${nflWeek}_${seasonYear}`,
    before, after: mapStats(data),
  })

  return mapStats(data)
}

/**
 * Generate a random (bounded, position-aware) stat line for every player
 * currently rostered in this league and upsert them all in one batch —
 * a stand-in for real stat imports so the scoring pipeline can be
 * exercised without hand-entering every player's numbers. Overwrites any
 * existing stat lines for these players/week/season, manual or simulated.
 */
export async function simulateWeekStats({ leagueId, nflWeek, seasonYear, actorUserId }) {
  const supabase = requireSupabase()
  const roster = await getLeagueRoster(leagueId)

  const rows = roster
    .filter((slot) => slot.player)
    .map((slot) => ({
      player_id: slot.playerId,
      nfl_week: nflWeek,
      season_year: seasonYear,
      ...generateRandomStatLine(slot.player.position),
      source: 'simulated',
      entered_by_user_id: actorUserId,
      updated_at: new Date().toISOString(),
    }))

  if (rows.length === 0) return { count: 0 }

  const { error } = await supabase
    .from('nfl_player_week_stats').upsert(rows, { onConflict: 'player_id,nfl_week,season_year' })
  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorUserId, leagueId, actionType: 'simulate_week_stats', entityType: 'league', entityId: leagueId,
    before: null, after: { nflWeek, seasonYear, playerCount: rows.length },
  })

  return { count: rows.length }
}

/**
 * Finalize a week for every manager in the league: negative-balance
 * managers score 0, everyone else's lineup is scored slot-by-slot via
 * the engine, empty-slot penalties applied, season points + weekly
 * money bonus updated. Idempotent to re-run (e.g. after a stat correction).
 */
export async function finalizeWeek({ league, nflWeek, actorUserId }) {
  const supabase = requireSupabase()
  const profile = await getScoringProfile(league.id)
  const members = await getLeagueMembers(league.id)

  const results = []

  for (const member of members) {
    const lineup = await getWeeklyLineup(league.id, member.id, nflWeek)

    if (!lineup) {
      results.push({ managerId: member.id, teamName: member.teamName, totalPoints: 0, noScoreReason: 'no_lineup_set' })
      continue
    }

    if (member.balance < 0) {
      await supabase.from('nfl_weekly_lineups').update({
        lineup_status: 'scored', total_points: 0, empty_slot_penalty: 0, no_score_reason: 'negative_balance',
      }).eq('id', lineup.id)
      results.push({ managerId: member.id, teamName: member.teamName, totalPoints: 0, noScoreReason: 'negative_balance' })
      continue
    }

    const playerIds = lineup.slots.filter((s) => !s.isEmpty && s.playerId).map((s) => s.playerId)
    const [playersById, statsByPlayerId] = await Promise.all([
      getPlayersById(playerIds),
      getStatsByPlayerId(playerIds, nflWeek, league.seasonYear),
    ])

    const scoredSlots = lineup.slots.map((slot) => {
      if (slot.isEmpty || !slot.playerId) return { ...slot, slotPoints: 0, isEmpty: true, calculationBreakdown: null }
      const player = playersById[slot.playerId]
      const stats = statsByPlayerId[slot.playerId]
      const { points, breakdown } = calculatePlayerScore(player?.position, stats, profile)
      return { ...slot, slotPoints: points, calculationBreakdown: breakdown, isEmpty: false }
    })

    await Promise.all(scoredSlots.map((slot) =>
      supabase.from('nfl_lineup_slots').update({
        slot_points: slot.slotPoints, calculation_breakdown: slot.calculationBreakdown,
      }).eq('id', slot.id)
    ))

    const { totalPoints, emptySlotPenalty } = computeLineupTotal(scoredSlots)
    await supabase.from('nfl_weekly_lineups').update({
      lineup_status: 'scored', total_points: totalPoints, empty_slot_penalty: emptySlotPenalty, no_score_reason: null,
    }).eq('id', lineup.id)

    const bonus = calculateWeeklyBonus(totalPoints, league.moneyPerPoint)
    const newBalance = member.balance + bonus
    const newSeasonPoints = member.seasonPoints + totalPoints
    await supabase.from('nfl_league_members').update({
      balance: newBalance, season_points: newSeasonPoints,
    }).eq('id', member.id)

    if (bonus > 0) {
      await supabase.from('nfl_transactions').insert({
        league_id: league.id, transaction_type: 'weekly_bonus', to_manager_id: member.id,
        amount: bonus, notes: `Week ${nflWeek} bonus (${totalPoints.toFixed(2)} pts)`,
      })
    }

    results.push({ managerId: member.id, teamName: member.teamName, totalPoints, bonus, emptySlotPenalty })
  }

  await writeAuditLog({
    actorUserId, leagueId: league.id, actionType: 'finalize_week', entityType: 'league', entityId: league.id,
    before: null, after: { nflWeek, results },
  })

  return results
}

/**
 * Commissioner action: undo a week's finalize/lock so it can be re-tested.
 * Reverses each manager's season-points/bonus contribution from a prior
 * finalize (safe to call even if that manager scored 0 or was skipped for
 * negative balance — both net to a zero-effect reversal), clears the
 * lineup's scored totals, and reopens it for editing. Player assignments
 * in each lineup slot are left untouched — only lock/score state resets.
 */
export async function resetWeek({ league, nflWeek, actorUserId }) {
  const supabase = requireSupabase()
  const members = await getLeagueMembers(league.id)

  const results = []

  for (const member of members) {
    const lineup = await getWeeklyLineup(league.id, member.id, nflWeek)
    if (!lineup) continue

    if (lineup.lineupStatus === 'scored') {
      const bonus = calculateWeeklyBonus(lineup.totalPoints, league.moneyPerPoint)
      const newBalance = member.balance - bonus
      const newSeasonPoints = member.seasonPoints - lineup.totalPoints
      await supabase.from('nfl_league_members').update({
        balance: newBalance, season_points: newSeasonPoints,
      }).eq('id', member.id)
    }

    await supabase.from('nfl_weekly_lineups').update({
      lineup_status: 'open', locked_at: null, total_points: 0, empty_slot_penalty: 0, no_score_reason: null,
    }).eq('id', lineup.id)

    await supabase.from('nfl_lineup_slots').update({
      slot_points: 0, calculation_breakdown: null, was_substituted: false,
    }).eq('weekly_lineup_id', lineup.id)

    results.push({ managerId: member.id, teamName: member.teamName })
  }

  await writeAuditLog({
    actorUserId, leagueId: league.id, actionType: 'reset_week', entityType: 'league', entityId: league.id,
    before: null, after: { nflWeek, resetCount: results.length },
  })

  return results
}
