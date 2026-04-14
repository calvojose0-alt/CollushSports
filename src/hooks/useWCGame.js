// useWCGame — central hook for World Cup 2026 Quiniela state
import { useState, useEffect, useCallback } from 'react'
import {
  joinWCGame,
  getWCPlayer,
  getAllWCPlayers,
  subscribeToWCPlayers,
  getPicksForUser,
  getAllWCPicks,
  getAllPlayoffPicks,
  getPlayoffPicksForUser,
  getAllMatchResults,
  getTournamentMeta,
} from '@/services/firebase/wc2026Service'
import { sortLeaderboard } from '@/services/gameEngine/wc2026Engine'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '@/data/wc2026Schedule'
import { useAuth } from '@/hooks/useAuth'

export function useWCGame() {
  const { user } = useAuth()

  const [players, setPlayers]             = useState([])
  const [myPlayer, setMyPlayer]           = useState(null)
  const [myPicks, setMyPicks]             = useState([])          // group stage picks for current user
  const [myPlayoffPicks, setMyPlayoffPicks] = useState([])        // playoff picks for current user
  const [allPicks, setAllPicks]           = useState([])          // all users' group stage picks
  const [allPlayoffPicks, setAllPlayoffPicks] = useState([])
  const [matchResults, setMatchResults]   = useState([])          // admin-entered results
  const [tournamentMeta, setTournamentMeta] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      await joinWCGame({ userId: user.uid, displayName: user.displayName || user.email })

      const [myP, picks, playoffPicks, allP, allPO, results, meta] = await Promise.all([
        getWCPlayer(user.uid),
        getPicksForUser(user.uid),
        getPlayoffPicksForUser(user.uid),
        getAllWCPicks(),
        getAllPlayoffPicks(),
        getAllMatchResults(),
        getTournamentMeta(),
      ])

      setMyPlayer(myP)
      setMyPicks(picks)
      setMyPlayoffPicks(playoffPicks)
      setAllPicks(allP)
      setAllPlayoffPicks(allPO)
      setMatchResults(results)
      setTournamentMeta(meta)
    } catch (err) {
      console.error('[WCGame] loadData error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Subscribe to live player updates
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToWCPlayers((playerList) => {
      setPlayers(playerList)
      const me = playerList.find((p) => p.userId === user.uid)
      setMyPlayer(me || null)
    })
    return unsub
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Refresh helpers ────────────────────────────────────────────────────────

  const refreshPicks = async () => {
    if (!user) return
    const [picks, playoffPicks, allP, allPO] = await Promise.all([
      getPicksForUser(user.uid),
      getPlayoffPicksForUser(user.uid),
      getAllWCPicks(),
      getAllPlayoffPicks(),
    ])
    setMyPicks(picks)
    setMyPlayoffPicks(playoffPicks)
    setAllPicks(allP)
    setAllPlayoffPicks(allPO)
  }

  const refreshResults = async () => {
    const [results, meta] = await Promise.all([getAllMatchResults(), getTournamentMeta()])
    setMatchResults(results)
    setTournamentMeta(meta)
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  // Map picks by matchId for O(1) lookup
  const myPicksByMatchId = {}
  myPicks.forEach((p) => { myPicksByMatchId[p.matchId] = p })

  // Map playoff picks by round
  const myPlayoffPicksByRound = {}
  myPlayoffPicks.forEach((p) => { myPlayoffPicksByRound[p.round] = p })

  // Map results by matchId
  const resultsByMatchId = {}
  matchResults.forEach((r) => { resultsByMatchId[r.matchId] = r })

  // Leaderboard sorted by points → exact hits → goals tiebreaker
  const leaderboard = sortLeaderboard(players, tournamentMeta?.actualTotalGoals ?? null)

  // Count how many group matches have been scored
  const scoredMatchIds = new Set(matchResults.filter((r) => r.status === 'final').map((r) => r.matchId))
  const completedGroupMatches = GROUP_MATCHES.filter((m) => scoredMatchIds.has(m.id)).length
  const totalGroupMatches     = GROUP_MATCHES.length // 72

  // Progress
  const groupStageComplete = completedGroupMatches === totalGroupMatches

  return {
    players,
    myPlayer,
    myPicks,
    myPlayoffPicks,
    allPicks,
    allPlayoffPicks,
    matchResults,
    tournamentMeta,
    loading,
    error,
    // Derived
    myPicksByMatchId,
    myPlayoffPicksByRound,
    resultsByMatchId,
    leaderboard,
    completedGroupMatches,
    totalGroupMatches,
    groupStageComplete,
    scoredMatchIds,
    // Schedule
    groupMatches:    GROUP_MATCHES,
    knockoutMatches: KNOCKOUT_MATCHES,
    // Helpers
    refreshPicks,
    refreshResults,
    reload: loadData,
  }
}
