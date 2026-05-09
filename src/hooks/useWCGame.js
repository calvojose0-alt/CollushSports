// useWCGame — central hook for World Cup 2026 Quiniela state (supports 2 entries per user)
import { useState, useEffect, useCallback, useRef } from 'react'
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
  getWCEntriesForUser,
} from '@/services/firebase/wc2026Service'
import { sortLeaderboard } from '@/services/gameEngine/wc2026Engine'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '@/data/wc2026Schedule'
import { useAuth } from '@/hooks/useAuth'

export function useWCGame() {
  const { user } = useAuth()

  const [players, setPlayers]               = useState([])
  const [myPlayer, setMyPlayer]             = useState(null)
  const [myEntries, setMyEntries]           = useState([])
  const [activeEntryNum, setActiveEntryNum] = useState(1)
  const [myPicks, setMyPicks]               = useState([])
  const [myPlayoffPicks, setMyPlayoffPicks] = useState([])
  const [allPicks, setAllPicks]             = useState([])
  const [allPlayoffPicks, setAllPlayoffPicks] = useState([])
  const [matchResults, setMatchResults]     = useState([])
  const [tournamentMeta, setTournamentMeta] = useState(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [picksVersion, setPicksVersion]     = useState(0)

  const activeEntryNumRef = useRef(activeEntryNum)
  useEffect(() => { activeEntryNumRef.current = activeEntryNum }, [activeEntryNum])

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      // Load existing entries for this user
      let entries = await getWCEntriesForUser(user.uid)

      // Auto-create entry 1 on first ever load
      if (entries.length === 0) {
        await joinWCGame({
          userId: user.uid,
          displayName: user.displayName || user.email,
          entryNumber: 1,
          entryName: 'Entry 1',
        })
        entries = await getWCEntriesForUser(user.uid)
      }

      setMyEntries(entries)

      const activeNum = activeEntryNumRef.current
      const [picks, playoffPicks, allP, allPO, results, meta] = await Promise.all([
        getPicksForUser(user.uid, activeNum),
        getPlayoffPicksForUser(user.uid, activeNum),
        getAllWCPicks(),
        getAllPlayoffPicks(),
        getAllMatchResults(),
        getTournamentMeta(),
      ])

      setMyPicks(picks)
      setMyPlayoffPicks(playoffPicks)
      setPicksVersion(v => v + 1)
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

  const loadEntryData = useCallback(async (entryNum) => {
    if (!user) return
    const [picks, playoffPicks] = await Promise.all([
      getPicksForUser(user.uid, entryNum),
      getPlayoffPicksForUser(user.uid, entryNum),
    ])
    setMyPicks(picks)
    setMyPlayoffPicks(playoffPicks)
    setPicksVersion(v => v + 1)
  }, [user])

  // Subscribe to live player updates
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToWCPlayers((playerList) => {
      setPlayers(playerList)
      const activeNum = activeEntryNumRef.current
      const me = playerList.find(
        (p) => p.userId === user.uid && (p.entryNumber ?? 1) === activeNum
      )
      setMyPlayer(me || null)
      const myPlayerEntries = playerList
        .filter((p) => p.userId === user.uid)
        .sort((a, b) => (a.entryNumber ?? 1) - (b.entryNumber ?? 1))
      if (myPlayerEntries.length > 0) setMyEntries(myPlayerEntries)
    })
    return unsub
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  // Create a second entry (max 2 total)
  const createEntry = async (entryName) => {
    if (myEntries.length >= 2) throw new Error('Maximum 2 entries per game')
    const trimmed = entryName.trim() || 'Entry 2'
    await joinWCGame({
      userId: user.uid,
      displayName: user.displayName || user.email,
      entryNumber: 2,
      entryName: trimmed,
    })
    await loadData()
  }

  // Switch active entry
  const switchEntry = async (entryNum) => {
    setActiveEntryNum(entryNum)
    await loadEntryData(entryNum)
    setMyPlayer(players.find(
      (p) => p.userId === user?.uid && (p.entryNumber ?? 1) === entryNum
    ) || null)
  }

  const refreshPicks = async () => {
    if (!user) return
    const activeNum = activeEntryNumRef.current
    const [picks, playoffPicks, allP, allPO] = await Promise.all([
      getPicksForUser(user.uid, activeNum),
      getPlayoffPicksForUser(user.uid, activeNum),
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

  // Map picks by matchId for O(1) lookup
  const myPicksByMatchId = {}
  myPicks.forEach((p) => { myPicksByMatchId[p.matchId] = p })

  const myPlayoffPicksByRound = {}
  myPlayoffPicks.forEach((p) => { myPlayoffPicksByRound[p.round] = p })

  const resultsByMatchId = {}
  matchResults.forEach((r) => { resultsByMatchId[r.matchId] = r })

  const leaderboard = sortLeaderboard(players, tournamentMeta?.actualTotalGoals ?? null)

  const scoredMatchIds = new Set(matchResults.filter((r) => r.status === 'final').map((r) => r.matchId))
  const completedGroupMatches = GROUP_MATCHES.filter((m) => scoredMatchIds.has(m.id)).length
  const totalGroupMatches = GROUP_MATCHES.length
  const groupStageComplete = completedGroupMatches === totalGroupMatches

  return {
    players,
    myPlayer,
    myEntries,
    activeEntryNum,
    myPicks,
    myPlayoffPicks,
    allPicks,
    allPlayoffPicks,
    matchResults,
    tournamentMeta,
    loading,
    error,
    myPicksByMatchId,
    myPlayoffPicksByRound,
    resultsByMatchId,
    leaderboard,
    completedGroupMatches,
    totalGroupMatches,
    groupStageComplete,
    scoredMatchIds,
    groupMatches:    GROUP_MATCHES,
    knockoutMatches: KNOCKOUT_MATCHES,
    refreshPicks,
    refreshResults,
    picksVersion,
    createEntry,
    switchEntry,
    reload: loadData,
  }
}
