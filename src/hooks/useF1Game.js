// useF1Game — central hook for F1 Survivor game state
import { useState, useEffect, useCallback } from 'react'
import {
  getPlayers,
  subscribeToPlayers,
  getPicksForPlayer,
  getPicksForGame,
  getAllRaceResults,
  joinGame,
} from '@/services/firebase/firestore'
import { getUsedDrivers } from '@/services/gameEngine/survivorEngine'
import { RACES_2026, getCurrentRace } from '@/data/calendar2026'
import { useAuth } from '@/hooks/useAuth'

// Default game ID for the current season
export const DEFAULT_GAME_ID = 'f1_survivor_2026'

export function useF1Game(gameId = DEFAULT_GAME_ID) {
  const { user } = useAuth()
  const [players, setPlayers] = useState([])
  const [myPlayer, setMyPlayer] = useState(null)
  const [myPicks, setMyPicks] = useState([])
  const [allPicks, setAllPicks] = useState([])
  const [raceResults, setRaceResults] = useState([])
  const [usedDrivers, setUsedDrivers] = useState({ usedA: new Set(), usedB: new Set() })
  const [currentRace, setCurrentRace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)

      // Join game if not already enrolled
      await joinGame({ gameId, userId: user.uid, displayName: user.displayName || user.email })

      const [picks, gamePicks, results, used] = await Promise.all([
        getPicksForPlayer(gameId, user.uid),
        getPicksForGame(gameId),
        getAllRaceResults(gameId),
        getUsedDrivers(gameId, user.uid),
      ])

      setMyPicks(picks)
      setAllPicks(gamePicks)
      setRaceResults(results)
      setUsedDrivers(used)
      setCurrentRace(getCurrentRace())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [gameId, user])

  // Subscribe to live player updates
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToPlayers(gameId, (playerList) => {
      setPlayers(playerList)
      const me = playerList.find((p) => p.userId === user.uid)
      setMyPlayer(me || null)
    })
    return unsub
  }, [gameId, user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refreshPicks = async () => {
    if (!user) return
    const [picks, used] = await Promise.all([
      getPicksForPlayer(gameId, user.uid),
      getUsedDrivers(gameId, user.uid),
    ])
    setMyPicks(picks)
    setUsedDrivers(used)
  }

  const refreshResults = async () => {
    const results = await getAllRaceResults(gameId)
    setRaceResults(results)
  }

  // Compute leaderboard (alive first sorted by points, then eliminated)
  const leaderboard = [...players].sort((a, b) => {
    const statusOrder = { winner: 0, alive: 1, eliminated: 2 }
    const oa = statusOrder[a.status] ?? 3
    const ob = statusOrder[b.status] ?? 3
    if (oa !== ob) return oa - ob
    return (b.points || 0) - (a.points || 0)
  })

  // Get pick for a specific race
  const getPickForRace = (raceId) => myPicks.find((p) => p.raceId === raceId) || null

  // Get result for a specific race
  const getRaceResult = (raceId) => raceResults.find((r) => r.raceId === raceId) || null

  return {
    players,
    myPlayer,
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
    reload: loadData,
  }
}
