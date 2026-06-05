// useF1Game — central hook for F1 Survivor game state (supports 2 entries per user)
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  createGame,
  getPlayers,
  subscribeToPlayers,
  getPicksForPlayer,
  getPicksForGame,
  getAllRaceResults,
  joinGame,
  getEntriesForUser,
} from '@/services/firebase/firestore'
import { getUsedDrivers } from '@/services/gameEngine/survivorEngine'
import { RACES_2026, getCurrentRace } from '@/data/calendar2026'
import { useAuth } from '@/hooks/useAuth'

export const DEFAULT_GAME_ID = 'f1_survivor_2026'

export function useF1Game(gameId = DEFAULT_GAME_ID) {
  const { user } = useAuth()
  const [players, setPlayers]           = useState([])
  const [myPlayer, setMyPlayer]         = useState(null)
  const [myEntries, setMyEntries]       = useState([])
  const [activeEntryNum, setActiveEntryNum] = useState(1)
  const [myPicks, setMyPicks]           = useState([])
  const [allPicks, setAllPicks]         = useState([])
  const [raceResults, setRaceResults]   = useState([])
  const [usedDrivers, setUsedDrivers]   = useState({ usedA: new Set(), usedB: new Set() })
  const [currentRace, setCurrentRace]   = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  // Ref so callbacks can access latest value without stale closure
  const activeEntryNumRef = useRef(activeEntryNum)
  useEffect(() => { activeEntryNumRef.current = activeEntryNum }, [activeEntryNum])

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError(null)

      await createGame({ gameId, season: 2026, name: 'Motorsport Survivor Pool 2026', createdBy: user.uid })

      // Load existing entries for this user
      let entries = await getEntriesForUser(gameId, user.uid)

      // Auto-create entry 1 on first ever load
      if (entries.length === 0) {
        await joinGame({
          gameId, userId: user.uid,
          displayName: user.displayName || user.email,
          entryNumber: 1, entryName: 'Entry 1',
        })
        entries = await getEntriesForUser(gameId, user.uid)
      }

      setMyEntries(entries)

      const activeNum = activeEntryNumRef.current
      const [picks, gamePicks, results, used] = await Promise.all([
        getPicksForPlayer(gameId, user.uid, activeNum),
        getPicksForGame(gameId),
        getAllRaceResults(gameId),
        getUsedDrivers(gameId, user.uid, activeNum),
      ])

      setMyPicks(picks)
      setAllPicks(gamePicks)
      setRaceResults(results)
      setUsedDrivers(used)
      setCurrentRace(getCurrentRace())
    } catch (err) {
      console.error('[F1Game] loadData error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [gameId, user])

  // When active entry switches, reload picks + used drivers for that entry
  const loadEntryData = useCallback(async (entryNum) => {
    if (!user) return
    const [picks, used] = await Promise.all([
      getPicksForPlayer(gameId, user.uid, entryNum),
      getUsedDrivers(gameId, user.uid, entryNum),
    ])
    setMyPicks(picks)
    setUsedDrivers(used)
  }, [gameId, user])

  // Subscribe to live player updates
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToPlayers(gameId, (playerList) => {
      setPlayers(playerList)
      const activeNum = activeEntryNumRef.current
      const me = playerList.find(
        (p) => p.userId === user.uid && (p.entryNumber ?? 1) === activeNum
      )
      setMyPlayer(me || null)
      // Keep myEntries in sync with live player updates
      const myPlayerEntries = playerList
        .filter((p) => p.userId === user.uid)
        .sort((a, b) => (a.entryNumber ?? 1) - (b.entryNumber ?? 1))
      if (myPlayerEntries.length > 0) setMyEntries(myPlayerEntries)
    })
    return unsub
  }, [gameId, user])

  useEffect(() => { loadData() }, [loadData])

  // Create a second entry (max 2 total)
  const createEntry = async (entryName) => {
    if (myEntries.length >= 2) throw new Error('Maximum 2 entries per game')
    const trimmed = entryName.trim() || 'Entry 2'
    await joinGame({
      gameId, userId: user.uid,
      displayName: user.displayName || user.email,
      entryNumber: 2, entryName: trimmed,
    })
    await loadData()
  }

  // Switch which entry is "active" (affects myPicks, usedDrivers, myPlayer)
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
    const [picks, used] = await Promise.all([
      getPicksForPlayer(gameId, user.uid, activeNum),
      getUsedDrivers(gameId, user.uid, activeNum),
    ])
    setMyPicks(picks)
    setUsedDrivers(used)
  }

  const refreshResults = async () => {
    const results = await getAllRaceResults(gameId)
    setRaceResults(results)
  }

  // Leaderboard: alive first by points, then eliminated
  const leaderboard = [...players].sort((a, b) => {
    const statusOrder = { winner: 0, alive: 1, eliminated: 2 }
    const oa = statusOrder[a.status] ?? 3
    const ob = statusOrder[b.status] ?? 3
    if (oa !== ob) return oa - ob
    return (b.points || 0) - (a.points || 0)
  })

  const getPickForRace = (raceId) => myPicks.find((p) => p.raceId === raceId) || null
  const getRaceResult  = (raceId) => raceResults.find((r) => r.raceId === raceId) || null

  return {
    players,
    myPlayer,
    myEntries,
    activeEntryNum,
    myPicks,
    allPicks,
    raceResults,
    usedDrivers,
    currentRace,
    leaderboard,
    loading,
    error,
    gameId,
    races: RACES_2026,
    getPickForRace,
    getRaceResult,
    refreshPicks,
    refreshResults,
    createEntry,
    switchEntry,
    reload: loadData,
  }
}
