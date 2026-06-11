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
  if (isExact) points = SCORING.GROUP_EXACT_SCORE          // 4 pts
  else if (isCorrectOutcome) points = SCORING.GROUP_CORRECT_OUTCOME // 2 pts

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
// Returns { ["userId_entryNum"]: qualificationPoints }
export function computeQualificationPoints(allPicks, actualResultsById, r32Teams = null) {
  const qualPtsByEntry = {}

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

    // Group all picks for this group's matches by (userId, entryNumber)
    const picksByEntry = {}
    allPicks.forEach((p) => {
      const match = groupMatchList.find((m) => m.id === p.matchId)
      if (!match) return
      const key = `${p.userId}_${p.entryNumber ?? 1}`
      if (!picksByEntry[key]) picksByEntry[key] = []
      picksByEntry[key].push({ homeTeam: match.homeTeam, awayTeam: match.awayTeam, homeScore: p.homeScore, awayScore: p.awayScore })
    })

    // For each entry that has picks in this group, compute their predicted standings
    Object.entries(picksByEntry).forEach(([entryKey, entryPicks]) => {
      // Need all 6 matches picked to determine predicted qualification
      if (entryPicks.length < groupMatchList.length) return
      const predictedStandings = computeGroupStandings(group, entryPicks)
      const pred1st = predictedStandings[0]?.teamId
      const pred2nd = predictedStandings[1]?.teamId
      const pred3rd = predictedStandings[2]?.teamId

      if (!qualPtsByEntry[entryKey]) qualPtsByEntry[entryKey] = 0

      // ── Actual 1st-place team ─────────────────────────────────────────────
      if (pred1st === actual1st) {
        qualPtsByEntry[entryKey] += SCORING.GROUP_QUALIFY_EXACT
      } else if (pred2nd === actual1st || pred3rd === actual1st) {
        qualPtsByEntry[entryKey] += SCORING.GROUP_QUALIFY_POSITION
      }

      // ── Actual 2nd-place team ─────────────────────────────────────────────
      if (pred2nd === actual2nd) {
        qualPtsByEntry[entryKey] += SCORING.GROUP_QUALIFY_EXACT
      } else if (pred1st === actual2nd || pred3rd === actual2nd) {
        qualPtsByEntry[entryKey] += SCORING.GROUP_QUALIFY_POSITION
      }

      // ── Actual 3rd-place team (only when best-3rd qualification is known) ─
      if (actual3rdQualified && actual3rd) {
        if (pred3rd === actual3rd) {
          qualPtsByEntry[entryKey] += SCORING.GROUP_QUALIFY_EXACT
        } else if (pred1st === actual3rd || pred2nd === actual3rd) {
          qualPtsByEntry[entryKey] += SCORING.GROUP_QUALIFY_POSITION
        }
      }
    })
  })

  return qualPtsByEntry
}

// ── Recalculate all player totals from all pick records ───────────────────────
// Called after any match result is processed or deleted.

export async function recalculateAllPlayerTotals() {
  const [allPicks, allPlayers, allResults] = await Promise.all([
    getAllWCPicks(),
    getAllWCPlayers(),
    getAllMatchResults(),
  ])

  const actualResultsById = {}
  allResults.forEach((r) => { actualResultsById[r.matchId] = r })

  // Key by "userId_entryNumber" so each entry is counted independently
  const playerMap = {}
  allPlayers.forEach((p) => {
    const key = `${p.userId}_${p.entryNumber ?? 1}`
    playerMap[key] = { userId: p.userId, entryNumber: p.entryNumber ?? 1, totalPoints: 0, exactHits: 0, outcomeHits: 0, qualificationPoints: 0 }
  })

  allPicks.forEach((pick) => {
    if (pick.pointsEarned === null) return
    const key = `${pick.userId}_${pick.entryNumber ?? 1}`
    if (!playerMap[key]) {
      playerMap[key] = { userId: pick.userId, entryNumber: pick.entryNumber ?? 1, totalPoints: 0, exactHits: 0, outcomeHits: 0, qualificationPoints: 0 }
    }
    playerMap[key].totalPoints += pick.pointsEarned
    if (pick.isExact)                           playerMap[key].exactHits++
    if (pick.isCorrectOutcome && !pick.isExact) playerMap[key].outcomeHits++
  })

  // ── Group qualification bonus ─────────────────────────────────────────────
  const allGroupsDone = Object.keys(WC_GROUPS).every((group) => {
    const gm = GROUP_MATCHES.filter((m) => m.group === group)
    return gm.every((m) => {
      const r = actualResultsById[m.id]
      return r?.homeScore != null && r?.awayScore != null
    })
  })

  let r32Teams = null
  if (allGroupsDone) {
    const allThirdPlace = []
    Object.keys(WC_GROUPS).forEach((group) => {
      const gm = GROUP_MATCHES.filter((m) => m.group === group)
      const picks = gm.map((m) => {
        const r = actualResultsById[m.id]
        return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: r?.homeScore ?? null, awayScore: r?.awayScore ?? null }
      })
      const standings = computeGroupStandings(group, picks)
      if (standings[2]) allThirdPlace.push({ group, ...standings[2] })
    })
    allThirdPlace.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    r32Teams = new Set(allThirdPlace.slice(0, 8).map((t) => t.teamId))
  }

  // qualPtsByEntry keyed by "userId_entryNumber"
  const qualPtsByEntry = computeQualificationPoints(allPicks, actualResultsById, r32Teams)
  Object.entries(qualPtsByEntry).forEach(([key, pts]) => {
    if (!playerMap[key]) return
    playerMap[key].qualificationPoints = pts
    playerMap[key].totalPoints += pts
  })

  // Persist — keep existing playoff points per entry, update the rest
  await Promise.all(
    Object.entries(playerMap).map(([key, totals]) => {
      const existing = allPlayers.find((p) => `${p.userId}_${p.entryNumber ?? 1}` === key)
      const existingPlayoff = existing?.playoffPoints || 0
      return updateWCPlayer(totals.userId, {
        totalPoints:         totals.totalPoints + existingPlayoff,
        exactHits:           totals.exactHits,
        outcomeHits:         totals.outcomeHits,
        qualificationPoints: totals.qualificationPoints,
      }, totals.entryNumber)
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

  // Key by "userId_entryNumber"
  const playoffPtsByEntry = {}
  allPlayers.forEach((p) => { playoffPtsByEntry[`${p.userId}_${p.entryNumber ?? 1}`] = 0 })

  allPlayoffPicks.forEach((pick) => {
    const actualSet = actualRounds[pick.round]
    if (!actualSet) return
    const pts = roundPointMap[pick.round] || 0
    const correctCount = (pick.teamIds || []).filter((t) => actualSet.has(t)).length
    const key = `${pick.userId}_${pick.entryNumber ?? 1}`
    if (!playoffPtsByEntry[key]) playoffPtsByEntry[key] = 0
    playoffPtsByEntry[key] += correctCount * pts
  })

  // Write playoff points per entry
  await Promise.all(
    allPlayers.map((p) => {
      const key = `${p.userId}_${p.entryNumber ?? 1}`
      return updateWCPlayer(p.userId, { playoffPoints: playoffPtsByEntry[key] ?? 0 }, p.entryNumber ?? 1)
    })
  )

  // Combine group + qualification + playoff into totalPoints per entry
  const [allPicks, allResults] = await Promise.all([getAllWCPicks(), getAllMatchResults()])
  const actualResultsById = {}
  allResults.forEach((r) => { actualResultsById[r.matchId] = r })

  const groupPtsByEntry = {}
  allPicks.forEach((pick) => {
    if (pick.pointsEarned === null) return
    const key = `${pick.userId}_${pick.entryNumber ?? 1}`
    if (!groupPtsByEntry[key]) groupPtsByEntry[key] = 0
    groupPtsByEntry[key] += pick.pointsEarned
  })

  const qualPtsByEntry = computeQualificationPoints(allPicks, actualResultsById, actualRounds.r32 || null)

  await Promise.all(
    allPlayers.map((p) => {
      const key = `${p.userId}_${p.entryNumber ?? 1}`
      const groupPts   = groupPtsByEntry[key]   || 0
      const qualPts    = qualPtsByEntry[key]    || 0
      const playoffPts = playoffPtsByEntry[key] || 0
      return updateWCPlayer(p.userId, {
        totalPoints:         groupPts + qualPts + playoffPts,
        qualificationPoints: qualPts,
      }, p.entryNumber ?? 1)
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
  const leaderEntry = sorted[0]?.entryNumber ?? 1
  await Promise.all(
    players.map((p) =>
      updateWCPlayer(p.userId, {
        groupStageLeader: p.userId === leaderId && (p.entryNumber ?? 1) === leaderEntry,
      }, p.entryNumber ?? 1)
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

// ── Head-to-head tiebreak among a set of tied teams ──────────────────────────
// Builds a mini-table from ONLY the matches played between the tied teams and
// orders them by: H2H points → H2H goal difference → H2H goals scored.
// Anything still level falls through to the caller's deterministic fallback.
//
// tiedTeams: array of standing objects that are equal on overall pts/gd/gf.
// validMatches: parsed matches [{ homeTeam, awayTeam, hs, as }] for the group.
function breakGroupTie(tiedTeams, validMatches) {
  const ids = new Set(tiedTeams.map((t) => t.teamId))
  const mini = {}
  tiedTeams.forEach((t) => { mini[t.teamId] = { pts: 0, gf: 0, ga: 0 } })

  validMatches.forEach(({ homeTeam, awayTeam, hs, as }) => {
    // Only count matches played strictly between the tied teams
    if (!ids.has(homeTeam) || !ids.has(awayTeam)) return
    mini[homeTeam].gf += hs; mini[homeTeam].ga += as
    mini[awayTeam].gf += as; mini[awayTeam].ga += hs
    if (hs > as)      mini[homeTeam].pts += 3
    else if (hs < as) mini[awayTeam].pts += 3
    else { mini[homeTeam].pts++; mini[awayTeam].pts++ }
  })

  return [...tiedTeams].sort((a, b) => {
    const ma = mini[a.teamId], mb = mini[b.teamId]
    const agd = ma.gf - ma.ga, bgd = mb.gf - mb.ga
    if (mb.pts !== ma.pts) return mb.pts - ma.pts   // H2H points
    if (bgd !== agd)       return bgd - agd          // H2H goal difference
    if (mb.gf !== ma.gf)   return mb.gf - ma.gf       // H2H goals scored
    // Deterministic final fallback (FIFA uses fair-play then drawing of lots,
    // which we can't replicate without disciplinary data). Alphabetical by
    // teamId guarantees identical inputs always yield the same order rather
    // than depending on array/insertion order.
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0
  })
}

// ── Group standings simulation (client-side, no DB) ──────────────────────────
// Used in MyPicksPage to show live standings as user enters scores.
//
// picks = array of { homeTeam, awayTeam, homeScore, awayScore }
// (only picks with both scores filled in are counted)
//
// Ranking follows FIFA group-stage criteria: overall points → overall goal
// difference → overall goals scored, and teams still level are separated by
// head-to-head results between only those tied teams (points → GD → GF),
// then a deterministic alphabetical fallback.

export function computeGroupStandings(groupId, picks) {
  const teams = WC_GROUPS[groupId] || []

  const standings = {}
  teams.forEach((teamId) => {
    standings[teamId] = { teamId, played: 0, wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
  })

  // Collect parsed valid matches once — reused for head-to-head tiebreaks.
  const validMatches = []

  picks.forEach(({ homeTeam, awayTeam, homeScore, awayScore }) => {
    if (homeScore === null || homeScore === undefined || homeScore === '') return
    if (awayScore === null || awayScore === undefined || awayScore === '') return
    const hs = parseInt(homeScore, 10)
    const as = parseInt(awayScore, 10)
    if (isNaN(hs) || isNaN(as)) return
    if (!standings[homeTeam] || !standings[awayTeam]) return

    validMatches.push({ homeTeam, awayTeam, hs, as })

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

  // Compute GD, then sort by overall criteria first.
  const sorted = Object.values(standings).map((s) => ({ ...s, gd: s.gf - s.ga }))
  sorted.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd  !== a.gd)  return b.gd  - a.gd
    if (b.gf  !== a.gf)  return b.gf  - a.gf
    return 0
  })

  // Resolve any remaining ties (equal overall pts/gd/gf) via head-to-head.
  const overallKey = (s) => `${s.pts}|${s.gd}|${s.gf}`
  const ranked = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length && overallKey(sorted[j]) === overallKey(sorted[i])) j++
    const tiedGroup = sorted.slice(i, j)
    if (tiedGroup.length > 1) ranked.push(...breakGroupTie(tiedGroup, validMatches))
    else                      ranked.push(tiedGroup[0])
    i = j
  }

  return ranked
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

