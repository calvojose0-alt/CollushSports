// useFootballWinLeague — central state hook for Pro Football Win League 2025–26
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getSession, updateSession, subscribeToSession,
  joinFootballWinLeague, subscribeToFWLPlayers,
  getAllFWLPicks, subscribeToFWLPicks,
  getAllResults, subscribeToResults,
  draftTeam as _draftTeam,
} from '@/services/footballWinLeague/footballWinLeagueService'
import { NFL_WL_TEAMS, FWL_RANKED_TEAMS, FWL_MATCH_POINTS } from '@/data/nflWinLeagueTeams'

// ── Scoring engine ────────────────────────────────────────────────────────────

/**
 * Compute regular-season points for a team from all weekly results.
 * Win = 1, Tie = 0.5, Loss = 0. No advancement bonuses.
 * Returns { matchPoints, wins, ties, losses, weeks }
 * `weeks` is an ordered list of per-week outcomes for the icon row:
 *   [{ week, outcome: 'win'|'tie'|'loss' }]
 */
function computeTeamPoints(teamId, results) {
  let matchPoints = 0, wins = 0, ties = 0, losses = 0
  const weeks = results
    .filter((r) => r.teamId === teamId)
    .sort((a, b) => (a.week ?? 0) - (b.week ?? 0))
    .map((r) => {
      if (r.outcome === 'win')      { matchPoints += FWL_MATCH_POINTS.win;  wins++ }
      else if (r.outcome === 'tie') { matchPoints += FWL_MATCH_POINTS.tie;  ties++ }
      else                          { losses++ }
      return { week: r.week, outcome: r.outcome }
    })
  return { matchPoints, wins, ties, losses, weeks }
}

/**
 * Build full leaderboard from raw data.
 * Returns sorted array of player objects with computed scores.
 */
function buildLeaderboard(players, picks, results) {
  const picksByUser = {}
  for (const p of picks) {
    if (!picksByUser[p.userId]) picksByUser[p.userId] = []
    picksByUser[p.userId].push(p)
  }

  const rows = players.map((player) => {
    const myPicks = picksByUser[player.userId] || []
    let totalMatchPoints = 0
    let totalWins = 0
    let totalTies = 0
    let totalLosses = 0

    const teams = myPicks.map((pick) => {
      const { matchPoints, wins, ties, losses, weeks } = computeTeamPoints(pick.teamId, results)
      totalMatchPoints += matchPoints
      totalWins        += wins
      totalTies        += ties
      totalLosses      += losses
      return {
        teamId:     pick.teamId,
        pickNumber: pick.pickNumber,
        matchPoints,
        wins,
        ties,
        losses,
        weeks,
        teamInfo:   NFL_WL_TEAMS[pick.teamId] || null,
      }
    })

    return {
      ...player,
      teams,
      matchPoints: totalMatchPoints,
      totalPoints: totalMatchPoints,
      totalWins,
      totalTies,
      totalLosses,
    }
  })

  // Sort: totalPoints → totalWins → fewest losses
  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.totalWins !== a.totalWins)     return b.totalWins - a.totalWins
    return a.totalLosses - b.totalLosses
  })

  return rows
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFootballWinLeague() {
  const { user } = useAuth()

  const [session,  setSession]  = useState(null)
  const [players,  setPlayers]  = useState([])
  const [myPlayer, setMyPlayer] = useState(null)
  const [picks,    setPicks]    = useState([])
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // Load one-time data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [sess, allPicks, allResults] = await Promise.all([
        getSession(),
        getAllFWLPicks(),
        getAllResults(),
      ])
      setSession(sess)
      setPicks(allPicks)
      setResults(allResults)
    } catch (err) {
      console.error('[FootballWinLeague] loadData error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Real-time subscriptions
  useEffect(() => {
    const unsubSession = subscribeToSession((s) => setSession(s))
    const unsubPlayers = subscribeToFWLPlayers((p) => {
      setPlayers(p)
      if (user) setMyPlayer(p.find((x) => x.userId === user.uid) || null)
    })
    const unsubPicks   = subscribeToFWLPicks((p) => setPicks(p))
    const unsubResults = subscribeToResults((r) => setResults(r))
    return () => { unsubSession(); unsubPlayers(); unsubPicks(); unsubResults() }
  }, [user])

  const refreshResults = async () => {
    const r = await getAllResults()
    setResults(r)
  }

  // Join the game (register as a player)
  const joinGame = async () => {
    if (!user) throw new Error('You must be signed in.')
    const session_ = session || await getSession()
    if (session_.status === 'locked' || session_.status === 'complete') {
      throw new Error('The draft has already been locked. No new players can join.')
    }
    if (players.length >= (session_?.maxPlayers ?? 10)) {
      throw new Error(`This game is full (max ${session_?.maxPlayers ?? 10} players).`)
    }
    await joinFootballWinLeague({
      userId: user.uid,
      displayName: user.displayName || user.profile?.display_name || user.email || 'Player',
    })
  }

  // Draft a team (only valid when it's your turn)
  const draftTeam = async (teamId) => {
    if (!user) throw new Error('Not authenticated.')
    if (!session) throw new Error('Session not loaded.')
    if (session.status !== 'drafting') throw new Error('Draft is not currently active.')
    const currentPickIndex = session.currentPick
    if (session.draftOrder[currentPickIndex] !== user.uid) {
      throw new Error("It's not your turn to pick.")
    }
    if (picks.some((p) => p.teamId === teamId)) {
      throw new Error('This team has already been drafted.')
    }
    await _draftTeam({ userId: user.uid, teamId, pickNumber: currentPickIndex })
    const nextPick = currentPickIndex + 1
    const totalPicks = session.draftOrder.length
    const newStatus = nextPick >= totalPicks ? 'locked' : 'drafting'
    await updateSession({ currentPick: nextPick, status: newStatus })
  }

  // Derived data
  const myPicks      = picks.filter((p) => p.userId === user?.uid)
  const draftedTeams = new Set(picks.map((p) => p.teamId))

  const rankedTeams = FWL_RANKED_TEAMS.map((teamId, rankIdx) => ({
    ...(NFL_WL_TEAMS[teamId] || { id: teamId, name: teamId }),
    rank:      rankIdx + 1,
    drafted:   draftedTeams.has(teamId),
    draftedBy: picks.find((p) => p.teamId === teamId) || null,
  }))

  const currentPickIndex = session?.currentPick ?? 0
  const currentDrafterId = session?.draftOrder?.[currentPickIndex] ?? null
  const isMyTurn = currentDrafterId === user?.uid && session?.status === 'drafting'
  const currentDrafter = players.find((p) => p.userId === currentDrafterId) || null

  const rosterByUserId = {}
  for (const pick of picks) {
    if (!rosterByUserId[pick.userId]) rosterByUserId[pick.userId] = []
    rosterByUserId[pick.userId].push(pick)
  }

  const leaderboard = buildLeaderboard(players, picks, results)

  const picksPerPlayer  = session?.picksPerPlayer ?? 3
  const myPicksComplete = myPicks.length >= picksPerPlayer
  const draftComplete   = session?.status === 'locked' || session?.status === 'complete'
  const draftInProgress = session?.status === 'drafting'
  const draftOpen       = session?.status === 'open'

  return {
    // State
    session, players, myPlayer, picks, myPicks, results, loading, error,
    // Computed
    rankedTeams, leaderboard, currentPickIndex, currentDrafterId, currentDrafter,
    isMyTurn, rosterByUserId, draftedTeams, myPicksComplete,
    draftComplete, draftInProgress, draftOpen,
    // Actions
    joinGame, draftTeam, refreshResults, reload: loadData,
  }
}
