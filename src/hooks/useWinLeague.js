// useWinLeague — central state hook for Soccer Tournament Win League 2026
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getSession, updateSession, subscribeToSession,
  joinWinLeague, subscribeToWLPlayers,
  getAllWLPicks, subscribeToWLPicks,
  getAllAdvancements, subscribeToAdvancements,
  draftTeam as _draftTeam,
} from '@/services/winLeague/winLeagueService'
import { getAllMatchResults } from '@/services/firebase/wc2026Service'
import { WL_RANKED_TEAMS, WL_ROUND_ORDER, WL_ADVANCE_POINTS } from '@/data/wl2026Rankings'
import { WC_TEAMS } from '@/data/wc2026Teams'
import { GROUP_MATCHES } from '@/data/wc2026Schedule'

// ── Scoring engine ────────────────────────────────────────────────────────────

/**
 * Compute match-result points for a team from all match results.
 * Returns { matchPoints, wins, draws, losses, matches }
 * `matches` is an ordered list of per-match outcomes (World Cup games only)
 * for the icon row: [{ matchId, outcome: 'win'|'draw'|'loss', opponentId }]
 */
function computeMatchPoints(teamId, matchResults) {
  let matchPoints = 0, wins = 0, draws = 0, losses = 0
  const matches = []

  for (const result of matchResults) {
    if (result.status !== 'final') continue

    let isHome = false, isAway = false
    let opponentId = null

    // Group stage: look up teams from schedule
    const groupMatch = GROUP_MATCHES.find((m) => m.id === result.matchId)
    if (groupMatch) {
      isHome = groupMatch.homeTeam === teamId
      isAway = groupMatch.awayTeam === teamId
      opponentId = isHome ? groupMatch.awayTeam : groupMatch.homeTeam
    } else {
      // Knockout: admin sets home_team/away_team in the result
      isHome = result.homeTeam === teamId
      isAway = result.awayTeam === teamId
      opponentId = isHome ? result.awayTeam : result.homeTeam
    }

    if (!isHome && !isAway) continue

    const hs = result.homeScore ?? 0
    const as = result.awayScore ?? 0

    let outcome
    if (hs === as) {
      // Draw
      matchPoints += 1
      draws++
      outcome = 'draw'
    } else if ((isHome && hs > as) || (isAway && as > hs)) {
      // Win
      matchPoints += 3
      wins++
      outcome = 'win'
    } else {
      // Loss
      losses++
      outcome = 'loss'
    }

    matches.push({ matchId: result.matchId, outcome, opponentId })
  }

  return { matchPoints, wins, draws, losses, matches }
}

/**
 * Compute advancement bonus points for a team.
 * Returns { advancePoints, roundsReached }
 */
function computeAdvancePoints(teamId, advancements) {
  const teamAdv = advancements.filter((a) => a.teamId === teamId)
  const advancePoints = teamAdv.length * WL_ADVANCE_POINTS
  const roundsReached = teamAdv.map((a) => a.round)
  return { advancePoints, roundsReached }
}

/**
 * Build full leaderboard from raw data.
 * Returns sorted array of player objects with computed scores.
 */
function buildLeaderboard(players, picks, advancements, matchResults) {
  // Group picks by userId
  const picksByUser = {}
  for (const p of picks) {
    if (!picksByUser[p.userId]) picksByUser[p.userId] = []
    picksByUser[p.userId].push(p)
  }

  const rows = players.map((player) => {
    const myPicks = picksByUser[player.userId] || []
    let totalMatchPoints = 0
    let totalAdvancePoints = 0
    let totalWins = 0
    let totalAdvanceBonuses = 0

    const teams = myPicks.map((pick) => {
      const { matchPoints, wins, draws, losses, matches } = computeMatchPoints(pick.teamId, matchResults)
      const { advancePoints, roundsReached } = computeAdvancePoints(pick.teamId, advancements)
      totalMatchPoints   += matchPoints
      totalAdvancePoints += advancePoints
      totalWins          += wins
      totalAdvanceBonuses += roundsReached.length
      return {
        teamId:       pick.teamId,
        pickNumber:   pick.pickNumber,
        matchPoints,
        advancePoints,
        wins,
        draws,
        losses,
        matches,
        roundsReached,
        teamInfo:     WC_TEAMS[pick.teamId] || null,
      }
    })

    return {
      ...player,
      teams,
      matchPoints:   totalMatchPoints,
      advancePoints: totalAdvancePoints,
      totalPoints:   totalMatchPoints + totalAdvancePoints,
      totalWins,
      totalAdvanceBonuses,
    }
  })

  // Sort: totalPoints → totalWins → totalAdvanceBonuses
  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints)         return b.totalPoints - a.totalPoints
    if (b.totalWins !== a.totalWins)             return b.totalWins - a.totalWins
    return b.totalAdvanceBonuses - a.totalAdvanceBonuses
  })

  return rows
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWinLeague() {
  const { user } = useAuth()

  const [session,      setSession]      = useState(null)
  const [players,      setPlayers]      = useState([])
  const [myPlayer,     setMyPlayer]     = useState(null)
  const [picks,        setPicks]        = useState([])
  const [advancements, setAdvancements] = useState([])
  const [matchResults, setMatchResults] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  // Load one-time data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [sess, allPicks, advs, results] = await Promise.all([
        getSession(),
        getAllWLPicks(),
        getAllAdvancements(),
        getAllMatchResults(),
      ])
      setSession(sess)
      setPicks(allPicks)
      setAdvancements(advs)
      setMatchResults(results)
    } catch (err) {
      console.error('[WinLeague] loadData error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Real-time subscriptions
  useEffect(() => {
    const unsubSession = subscribeToSession((s) => setSession(s))
    const unsubPlayers = subscribeToWLPlayers((p) => {
      setPlayers(p)
      if (user) {
        setMyPlayer(p.find((x) => x.userId === user.uid) || null)
      }
    })
    const unsubPicks = subscribeToWLPicks((p) => setPicks(p))
    const unsubAdv   = subscribeToAdvancements((a) => setAdvancements(a))
    return () => { unsubSession(); unsubPlayers(); unsubPicks(); unsubAdv() }
  }, [user])

  // Refresh match results (called externally after admin updates WC results)
  const refreshResults = async () => {
    const results = await getAllMatchResults()
    setMatchResults(results)
  }

  // Join the Win League game (register as a player)
  const joinGame = async () => {
    if (!user) throw new Error('You must be signed in.')
    const session_ = session || await getSession()
    if (session_.status === 'locked' || session_.status === 'complete') {
      throw new Error('The draft has already been locked. No new players can join.')
    }
    const currentCount = players.length
    if (currentCount >= (session_?.maxPlayers ?? 10)) {
      throw new Error(`This game is full (max ${session_?.maxPlayers ?? 10} players).`)
    }
    await joinWinLeague({
      userId: user.uid,
      displayName: user.displayName || user.profile?.display_name || user.email || 'Player',
    })
    // myPlayer will update via subscription
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
    // Check team not already picked
    if (picks.some((p) => p.teamId === teamId)) {
      throw new Error('This team has already been drafted.')
    }
    await _draftTeam({ userId: user.uid, teamId, pickNumber: currentPickIndex })
    // Advance the pick counter
    const nextPick = currentPickIndex + 1
    const totalPicks = session.draftOrder.length
    const newStatus = nextPick >= totalPicks ? 'locked' : 'drafting'
    await updateSession({ currentPick: nextPick, status: newStatus })
  }

  // Derived data
  const myPicks      = picks.filter((p) => p.userId === user?.uid)
  const draftedTeams = new Set(picks.map((p) => p.teamId))

  // Teams sorted by rank, with availability flag
  const rankedTeams = WL_RANKED_TEAMS.map((teamId, rankIdx) => ({
    ...(WC_TEAMS[teamId] || { id: teamId, name: teamId }),
    rank:      rankIdx + 1,
    drafted:   draftedTeams.has(teamId),
    draftedBy: picks.find((p) => p.teamId === teamId) || null,
  }))

  // Current drafter info
  const currentPickIndex = session?.currentPick ?? 0
  const currentDrafterId = session?.draftOrder?.[currentPickIndex] ?? null
  const isMyTurn = currentDrafterId === user?.uid && session?.status === 'drafting'
  const currentDrafter = players.find((p) => p.userId === currentDrafterId) || null

  // Roster per player (for draft room display)
  const rosterByUserId = {}
  for (const pick of picks) {
    if (!rosterByUserId[pick.userId]) rosterByUserId[pick.userId] = []
    rosterByUserId[pick.userId].push(pick)
  }

  const leaderboard = buildLeaderboard(players, picks, advancements, matchResults)

  const picksPerPlayer    = session?.picksPerPlayer ?? 3
  const myPicksComplete   = myPicks.length >= picksPerPlayer
  const draftComplete     = session?.status === 'locked' || session?.status === 'complete'
  const draftInProgress   = session?.status === 'drafting'
  const draftOpen         = session?.status === 'open'

  return {
    // State
    session,
    players,
    myPlayer,
    picks,
    myPicks,
    advancements,
    matchResults,
    loading,
    error,
    // Computed
    rankedTeams,
    leaderboard,
    currentPickIndex,
    currentDrafterId,
    currentDrafter,
    isMyTurn,
    rosterByUserId,
    draftedTeams,
    myPicksComplete,
    draftComplete,
    draftInProgress,
    draftOpen,
    // Actions
    joinGame,
    draftTeam,
    refreshResults,
    reload: loadData,
  }
}
