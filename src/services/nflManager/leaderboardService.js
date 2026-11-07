// NFL Fantasy Manager League — Leaderboard Service
// Builds ranked standings with the spec's 3-tier tie-break: season points,
// then roster value, then best single-week score.
import { requireSupabase } from './shared'
import { getLeagueMembers } from './leagueService'
import { getLeagueRoster, getLeaguePlayerValues, computeRosterValue } from './rosterService'

export async function buildLeaderboard(league) {
  const supabase = requireSupabase()
  const [members, rosterSlots, playerValues] = await Promise.all([
    getLeagueMembers(league.id),
    getLeagueRoster(league.id),
    getLeaguePlayerValues(league.id),
  ])
  const valuesByPlayerId = Object.fromEntries(playerValues.map((v) => [v.player_id, v]))

  const { data: lineups, error } = await supabase
    .from('nfl_weekly_lineups').select('*').eq('league_id', league.id)
  if (error) throw new Error(error.message)

  const rosterByManager = {}
  for (const slot of rosterSlots) {
    ;(rosterByManager[slot.managerId] ||= []).push(slot)
  }

  const lineupsByManager = {}
  for (const row of lineups || []) {
    ;(lineupsByManager[row.manager_id] ||= []).push(row)
  }

  const rows = members.map((member) => {
    const myRoster = rosterByManager[member.id] || []
    const rosterValue = computeRosterValue(myRoster, valuesByPlayerId)
    const myLineups = (lineupsByManager[member.id] || []).sort((a, b) => b.nfl_week - a.nfl_week)
    const latestScored = myLineups.find((l) => l.lineup_status === 'scored')
    const bestWeekScore = myLineups.reduce((max, l) => Math.max(max, Number(l.total_points || 0)), -Infinity)

    return {
      managerId: member.id,
      teamName: member.teamName,
      weeklyScore: latestScored ? Number(latestScored.total_points) : 0,
      seasonPoints: member.seasonPoints,
      rosterValue,
      balance: member.balance,
      playersOwned: myRoster.length,
      bestWeekScore: bestWeekScore === -Infinity ? 0 : bestWeekScore,
    }
  })

  rows.sort((a, b) => {
    if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints
    if (b.rosterValue !== a.rosterValue) return b.rosterValue - a.rosterValue
    return b.bestWeekScore - a.bestWeekScore
  })

  return rows.map((row, i) => ({ ...row, rank: i + 1 }))
}
