// useFootballWinLeague — central state hook for Pro Football Win League 2025–26
//
// This is a FIXED-ROSTER pool (see nflWinLeagueRoster.js): managers and their
// teams are baked in, teams may be shared, and there is no in-app draft. The
// admin records weekly Win/Tie/Loss per team (fwl_results) and standings are
// computed from the roster + those results. Win = 1, Tie = 0.5, Loss = 0.
import { useState, useEffect, useCallback } from 'react'
import {
  getSession, updateSession, subscribeToSession,
  getAllResults, subscribeToResults,
} from '@/services/footballWinLeague/footballWinLeagueService'
import { NFL_WL_TEAMS, FWL_MATCH_POINTS } from '@/data/nflWinLeagueTeams'
import { FWL_ROSTER, FWL_ROSTER_TEAMS } from '@/data/nflWinLeagueRoster'

// ── Scoring engine ────────────────────────────────────────────────────────────

/**
 * Per-team record & points from all weekly results.
 * Returns { wins, ties, losses, points, weeks }
 * `weeks` is an ordered list of { week, outcome } for the icon row.
 */
function computeTeamRecord(teamId, results) {
  let wins = 0, ties = 0, losses = 0
  const weeks = results
    .filter((r) => r.teamId === teamId)
    .sort((a, b) => (a.week ?? 0) - (b.week ?? 0))
    .map((r) => {
      if (r.outcome === 'win')      wins++
      else if (r.outcome === 'tie') ties++
      else                          losses++
      return { week: r.week, outcome: r.outcome }
    })
  const points = wins * FWL_MATCH_POINTS.win + ties * FWL_MATCH_POINTS.tie
  return { wins, ties, losses, points, weeks }
}

/**
 * Build the manager standings from the fixed roster + weekly results.
 * Returns a sorted array of manager rows with per-team breakdowns.
 */
function buildStandings(results) {
  const rows = FWL_ROSTER.map((entry) => {
    let totalPoints = 0, totalWins = 0, totalTies = 0, totalLosses = 0

    const teams = entry.teams.map((teamId) => {
      const rec = computeTeamRecord(teamId, results)
      totalPoints  += rec.points
      totalWins    += rec.wins
      totalTies    += rec.ties
      totalLosses  += rec.losses
      return { teamId, teamInfo: NFL_WL_TEAMS[teamId] || null, ...rec }
    })

    return {
      id: entry.id,
      manager: entry.manager,
      teams,
      totalPoints,
      totalWins,
      totalTies,
      totalLosses,
    }
  })

  // Sort: totalPoints → totalWins → fewest losses → manager name
  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.totalWins !== a.totalWins)     return b.totalWins - a.totalWins
    if (a.totalLosses !== b.totalLosses) return a.totalLosses - b.totalLosses
    return a.manager.localeCompare(b.manager)
  })

  return rows
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFootballWinLeague() {
  const [session, setSession] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [sess, allResults] = await Promise.all([getSession(), getAllResults()])
      setSession(sess)
      setResults(allResults)
    } catch (err) {
      console.error('[FootballWinLeague] loadData error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const unsubSession = subscribeToSession((s) => setSession(s))
    const unsubResults = subscribeToResults((r) => setResults(r))
    return () => { unsubSession(); unsubResults() }
  }, [])

  const refreshResults = async () => setResults(await getAllResults())

  const setStatus = async (status) => {
    await updateSession({ status })
  }

  const standings   = buildStandings(results)
  const weeksScored  = [...new Set(results.map((r) => r.week))].sort((a, b) => a - b)
  const isComplete   = session?.status === 'complete'

  return {
    // State
    session, results, loading, error, isComplete,
    // Computed
    standings, roster: FWL_ROSTER, rosterTeams: FWL_ROSTER_TEAMS, weeksScored,
    // Actions
    refreshResults, setStatus, reload: loadData,
  }
}
