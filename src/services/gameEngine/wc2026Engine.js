// World Cup 2026 – Game Engine
// Handles: group stage scoring, playoff scoring, standings computation,
//          leaderboard ranking, group stage standings simulation.

import { SCORING, WC_GROUPS, WC_TEAMS } from '@/data/wc2026Teams'
import { GROUP_MATCHES } from '@/data/wc2026Schedule'
import {
  getPicksForMatch,
  getAllWCPicks,
  getAllPlayoffPicks,
  getAllWCPlayers,
  getAllMatchResults,
  updatePickScoring,
  updateWCPlayer,
  updateTournamentMeta,
} from '@/services/firebase/wc2026Service'

// ── Outcome helpers ───────────────────────────────────────────────────────────

export function getOutcome(homeScore, awayScore) {
  if (homeScore === awayScore) return 'draw'
  return homeScore > awayScore ? 'home' : 'away'
}

// ── Group stage pick scoring ──────────────────────────────────────────────────

export function scoreGroupPick(pick, result) {
  if (pick.homeScore === null || pick.awayScore === null) return { points: 0, isExact: false, isCorrectOutcome: false }
  if (result.homeScore === null || result.awayScore === null) return { points: 0, isExact: false, isCorrectOutcome: false }

  const isExact = pick.homeScore === result.homeScore && pick.awayScore === result.awayScore
  const isCorrectOutcome = getOutcome(pick.homeScore, pick.awayScore) === getOutcome(result.homeScore, result.awayScore)

  let points = 0
  if (isExact) points = SCORING.GROUP_EXACT_SCORE          // 5 pts
  else if (isCorrectOutcome) points = SCORING.GROUP_CORRECT_OUTCOME // 3 pts

  return { points, isExact, isCorrectOutcome }
}

// ── Process a single match result: score all picks for that match ─────────────

export async function processMatchResult(matchId, result) {
  const picks = await getPicksForMatch(matchId)

  await Promise.all(picks.map(async (pick) => {
    const { points, isExact, isCorrectOutcome } = scoreGroupPick(pick, result)
    await updatePickScoring(pick.id, { pointsEarned: points, isExact, isCorrectOutcome })
  }))

  // Re-fetch and update each player's totals from scratch (safer than increments)
  await recalculateAllPlayerTotals()
}

// ── Group qualification scoring ───────────────────────────────────────────────
// For each group, compare actual finishers (from actual results) against
// each user's predicted standings. Award:
//   +4 pts  if they predicted the team to qualify AND in the exact position
//   +2 pts  if they predicted the team to qualify but in the wrong position
//
// r32Teams (optional Set<teamId>): the 32 teams that actually reached R32.
//   When provided, 3rd-place qualifiers (best-3rd) are also scored:
//     • user predicted 3rd + team qualified as best-3rd → +4 (exact)
//     • user predicted 1st/2nd + team qualified as best-3rd → +2 (wrong position)
//     • user predicted 3rd + team actually finished 1st/2nd → +2 (wrong position)
//   Without r32Teams, only 1st/2nd-place qualification is scored (group stage
//   is still in progress; best-3rd slots aren't yet determined).
//
// Returns { [userId]: qualificationPoints }
export function computeQualificationPoints(allPicks, actualResultsById, r32Teams = null) {
  const qualPtsByUser = {}

  Object.keys(WC_GROUPS).forEach((group) => {
    const groupMatchList = GROUP_MATCHES.filter((m) => m.group === group)

    // Actual standings from admin-entered results
    const actualPicks = groupMatchList.map((m) => {
      const r = actualResultsById[m.id]
      return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: r?.homeScore ?? null, awayScore: r?.awayScore ?? null }
    })
    const actualStandings = computeGroupStandings(group, actualPicks)
    // Only score if all 6 group matches have results
    const allActualDone = groupMatchList.every((m) => {
      const r = actualResultsById[m.id]
      return r?.homeScore != null && r?.awayScore != null
    })
    if (!allActualDone) return

    // Actual positions
    const actual1st = actualStandings[0]?.teamId
    const actual2nd = actualStandings[1]?.teamId
    const actual3rd = actualStandings[2]?.teamId
    if (!actual1st || !actual2nd) return

    // Is the group's 3rd-place finisher one of the best-3rd qualifiers?
    const actual3rdQualified = r32Teams != null && actual3rd ? r32Teams.has(actual3rd) : false

    // Group all picks for this group's matches by user
    const picksByUser = {}
    allPicks.forEach((p) => {
      const match = groupMatchList.find((m) => m.id === p.matchId)
      if (!match) return
      if (!picksByUser[p.userId]) picksByUser[p.userId] = []
      picksByUser[p.userId].push({ homeTeam: match.homeTeam, awayTeam: match.awayTeam, homeScore: p.homeScore, awayScore: p.awayScore })
    })

    // For each user who has picks in this group, compute their predicted standings
    Object.entries(picksByUser).forEach(([userId, userPicks]) => {
      // Need all 6 matches picked to determine predicted qualification
      if (userPicks.length < groupMatchList.length) return
      const predictedStandings = computeGroupStandings(group, userPicks)
      const pred1st = predictedStandings[0]?.teamId
      const pred2nd = predictedStandings[1]?.teamId
      const pred3rd = predictedStandings[2]?.teamId

      if (!qualPtsByUser[userId]) qualPtsByUser[userId] = 0

      // ── Actual 1st-place team ─────────────────────────────────────────────
      if (pred1st === actual1st) {
        qualPtsByUser[userId] += SCORING.GROUP_QUALIFY_EXACT      // predicted 1st → qualified 1st
      } else if (pred2nd === actual1st || pred3rd === actual1st) {
        qualPtsByUser[userId] += SCORING.GROUP_QUALIFY_POSITION   // team qualified but predicted wrong position
      }

      // ── Actual 2nd-place team ─────────────────────────────────────────────
      if (pred2nd === actual2nd) {
        qualPtsByUser[userId] += SCORING.GROUP_QUALIFY_EXACT      // predicted 2nd → qualified 2nd
      } else if (pred1st === actual2nd || pred3rd === actual2nd) {
        qualPtsByUser[userId] += SCORING.GROUP_QUALIFY_POSITION   // team qualified but predicted wrong position
      }

      // ── Actual 3rd-place team (only when best-3rd qualification is known) ─
      if (actual3rdQualified && actual3rd) {
        if (pred3rd === actual3rd) {
          qualPtsByUser[userId] += SCORING.GROUP_QUALIFY_EXACT    // predicted 3rd → qualified as best-3rd
        } else if (pred1st === actual3rd || pred2nd === actual3rd) {
          qualPtsByUser[userId] += SCORING.GROUP_QUALIFY_POSITION // predicted 1st/2nd but qualified as best-3rd
        }
      }
    })
  })

  return qualPtsByUser
}

// ── Recalculate all player totals from all pick records ───────────────────────
// Called after any match result is processed or deleted.

export async function recalculateAllPlayerTotals() {
  const [allPicks, allPlayers, allResults] = await Promise.all([
    getAllWCPicks(),
    getAllWCPlayers(),
    getAllMatchResults(),
  ])

  // Build results-by-match-id map for qualification scoring
  const actualResultsById = {}
  allResults.forEach((r) => { actualResultsById[r.matchId] = r })

  const playerMap = {}
  allPlayers.forEach((p) => {
    playerMap[p.userId] = { totalPoints: 0, exactHits: 0, outcomeHits: 0, playoffPoints: 0, qualificationPoints: 0 }
  })

  // Aggregate group stage match points (exact score / correct outcome)
  allPicks.forEach((pick) => {
    if (pick.pointsEarned === null) return
    if (!playerMap[pick.userId]) {
      playerMap[pick.userId] = { totalPoints: 0, exactHits: 0, outcomeHits: 0, playoffPoints: 0, qualificationPoints: 0 }
    }
    playerMap[pick.userId].totalPoints += pick.pointsEarned
    if (pick.isExact)                         playerMap[pick.userId].exactHits++
    if (pick.isCorrectOutcome && !pick.isExact) playerMap[pick.userId].outcomeHits++
  })

  // Compute group qualification bonus points
  const qualPtsByUser = computeQualificationPoints(allPicks, actualResultsById)
  Object.entries(qualPtsByUser).forEach(([userId, pts]) => {
    if (!playerMap[userId]) {
      playerMap[userId] = { totalPoints: 0, exactHits: 0, outcomeHits: 0, playoffPoints: 0, qualificationPoints: 0 }
    }
    playerMap[userId].qualificationPoints = pts
    playerMap[userId].totalPoints += pts
  })

  // Persist updated totals (playoff points kept from existing stored value)
  await Promise.all(
    Object.entries(playerMap).map(([userId, totals]) => {
      const existingPlayoff = allPlayers.find((p) => p.userId === userId)?.playoffPoints || 0
      return updateWCPlayer(userId, {
        totalPoints:         totals.totalPoints + existingPlayoff,
        exactHits:           totals.exactHits,
        outcomeHits:         totals.outcomeHits,
        qualificationPoints: totals.qualificationPoints,
      })
    })
  )

  return playerMap
}

// ── Playoff round scoring ─────────────────────────────────────────────────────
// Called when admin marks which teams advanced to a round.
// actualTeamIds = array of team IDs that actually reached this round.
// roundId = 'r32' | 'r16' | 'qf' | 'sf' | 'winner'


// ── Called when admin saves playoff round results ─────────────────────────────
// Called with an object like: { r32: Set<teamId>, r16: Set<teamId>, ... }

export async function recalculatePlayoffPoints(actualRounds) {
  if (!actualRounds) return
  const allPlayoffPicks = await getAllPlayoffPicks()
  const allPlayers      = await getAllWCPlayers()

  const roundPointMap = {
    r32: SCORING.PLAYOFF_R32,
    r16: SCORING.PLAYOFF_R16,
    qf:  SCORING.PLAYOFF_QF,
    sf:  SCORING.PLAYOFF_SF,
    winner: SCORING.PLAYOFF_WINNER,
  }

  const playerPlayoffPts = {}
  allPlayers.forEach((p) => { playerPlayoffPts[p.userId] = 0 })

  allPlayoffPicks.forEach((pick) => {
    const actualSet = actualRounds[pick.round]
    if (!actualSet) return
    const pts = roundPointMap[pick.round] || 0
    const correctCount = (pick.teamIds || []).filter((t) => actualSet.has(t)).length
    if (!playerPlayoffPts[pick.userId]) playerPlayoffPts[pick.userId] = 0
    playerPlayoffPts[pick.userId] += correctCount * pts
  })

  await Promise.all(
    Object.entries(playerPlayoffPts).map(([userId, pts]) =>
      updateWCPlayer(userId, { playoffPoints: pts })
    )
  )

  // Combine group + qualification + playoff points
  const [allPicks, allResults] = await Promise.all([getAllWCPicks(), getAllMatchResults()])
  const actualResultsById = {}
  allResults.forEach((r) => { actualResultsById[r.matchId] = r })

  const groupPtsByUser = {}
  allPicks.forEach((pick) => {
    if (pick.pointsEarned === null) return
    if (!groupPtsByUser[pick.userId]) groupPtsByUser[pick.userId] = 0
    groupPtsByUser[pick.userId] += pick.pointsEarned
  })

  // Pass r32Teams so best-3rd qualifiers are included in qualification scoring
  const qualPtsByUser = computeQualificationPoints(allPicks, actualResultsById, actualRounds.r32 || null)

  await Promise.all(
    allPlayers.map((p) => {
      const groupPts  = groupPtsByUser[p.userId]  || 0
      const qualPts   = qualPtsByUser[p.userId]   || 0
      const playoffPts = playerPlayoffPts[p.userId] || 0
      return updateWCPlayer(p.userId, {
        totalPoints:         groupPts + qualPts + playoffPts,
        qualificationPoints: qualPts,
      })
    })
  )
}

// ── Mark group stage leader ───────────────────────────────────────────────────

export async function markGroupStageLeader() {
  const players = await getAllWCPlayers()
  if (!players.length) return

  // Sort by points (descending), then exact hits
  const sorted = [...players].sort((a, b) => {
    if ((b.totalPoints || 0) !== (a.totalPoints || 0)) return (b.totalPoints || 0) - (a.totalPoints || 0)
    return (b.exactHits || 0) - (a.exactHits || 0)
  })

  const leaderId = sorted[0]?.userId
  await Promise.all(
    players.map((p) =>
      updateWCPlayer(p.userId, { groupStageLeader: p.userId === leaderId })
    )
  )
  await updateTournamentMeta({ groupStageFinalized: true })
}

// ── Leaderboard sort with tiebreakers ────────────────────────────────────────
// 1st: total points (desc)
// 2nd: exact-score hits (desc)
// 3rd: closeness to total goals prediction (admin enters actual at end)

export function sortLeaderboard(players, actualTotalGoals = null) {
  return [...players].sort((a, b) => {
    // 1st tiebreaker: total points
    if ((b.totalPoints || 0) !== (a.totalPoints || 0))
      return (b.totalPoints || 0) - (a.totalPoints || 0)

    // 2nd tiebreaker: exact-score hits
    if ((b.exactHits || 0) !== (a.exactHits || 0))
      return (b.exactHits || 0) - (a.exactHits || 0)

    // 3rd tiebreaker: closeness to predicted total goals
    if (actualTotalGoals !== null) {
      const diffA = Math.abs((a.totalGoalsGuess ?? Infinity) - actualTotalGoals)
      const diffB = Math.abs((b.totalGoalsGuess ?? Infinity) - actualTotalGoals)
      if (diffA !== diffB) return diffA - diffB
    }

    return 0
  })
}

// ── Group standings simulation (client-side, no DB) ──────────────────────────
// Used in MyPicksPage to show live standings as user enters scores.
//
// picks = array of { homeTeam, awayTeam, homeScore, awayScore }
// (only picks with both scores filled in are counted)

export function computeGroupStandings(groupId, picks) {
  const teams = WC_GROUPS[groupId] || []

  const standings = {}
  teams.forEach((teamId) => {
    standings[teamId] = { teamId, played: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
  })

  picks.forEach(({ homeTeam, awayTeam, homeScore, awayScore }) => {
    if (homeScore === null || homeScore === undefined || homeScore === '') return
    if (awayScore === null || awayScore === undefined || awayScore === '') return
    const hs = parseInt(homeScore, 10)
    const as = parseInt(awayScore, 10)
    if (isNaN(hs) || isNaN(as)) return
    if (!standings[homeTeam] || !standings[awayTeam]) return

    standings[homeTeam].played++
    standings[awayTeam].played++
    standings[homeTeam].gf += hs
    standings[homeTeam].ga += as
    standings[awayTeam].gf += as
    standings[awayTeam].ga += hs

    if (hs > as) {
      standings[homeTeam].wins++
      standings[awayTeam].losses++
      standings[homeTeam].pts += 3
    } else if (hs < as) {
      standings[awayTeam].wins++
      standings[homeTeam].losses++
      standings[awayTeam].pts += 3
    } else {
      standings[homeTeam].draws++
      standings[awayTeam].draws++
      standings[homeTeam].pts++
      standings[awayTeam].pts++
    }
  })

  // Compute GD and sort
  const sorted = Object.values(standings).map((s) => ({ ...s, gd: s.gf - s.ga }))
  sorted.sort((a, b) => {
    if (b.pts !== a.pts)  return b.pts - a.pts
    if (b.gd  !== a.gd)  return b.gd  - a.gd
    if (b.gf  !== a.gf)  return b.gf  - a.gf
    return 0
  })

  return sorted
}

// ── Validate that all group picks are filled ─────────────────────────────────

export function validateGroupPicksComplete(picks, groupMatches) {
  const picksById = {}
  picks.forEach((p) => { picksById[p.matchId] = p })

  const missing = groupMatches.filter((m) => {
    const pick = picksById[m.id]
    return !pick || pick.homeScore === null || pick.awayScore === null
  })

  return { complete: missing.length === 0, missing }
}

