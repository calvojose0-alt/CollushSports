// useNflLeague — central state for one league: league config, members,
// scoring profile, my roster, and the leaderboard. Page-specific flows
// (lineup editing, commissioner tools) call the service layer directly,
// mirroring how WLAdminPage works alongside useWinLeague.js.
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getLeague, subscribeToLeague, subscribeToLeagueMembers, getLeagueMembers, getScoringProfile,
} from '@/services/nflManager/leagueService'
import { getRosterForManager, buildRandomRoster, initEmptyRoster } from '@/services/nflManager/rosterService'
import { buildLeaderboard } from '@/services/nflManager/leaderboardService'
import { getCurrentWeek } from '@/services/nflManager/lineupService'

export function useNflLeague(leagueId) {
  const { user } = useAuth()

  const [league, setLeague] = useState(null)
  const [members, setMembers] = useState([])
  const [scoringProfile, setScoringProfile] = useState(null)
  const [myRoster, setMyRoster] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [currentWeek, setCurrentWeek] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const myMember = members.find((m) => m.userId === user?.uid) || null
  const isCommissioner = myMember?.role === 'commissioner'

  const refreshLeaderboard = useCallback(async () => {
    if (!leagueId) return
    try {
      const board = await buildLeaderboard({ id: leagueId })
      setLeaderboard(board)
    } catch (err) {
      console.error('[NflLeague] leaderboard error:', err.message)
    }
  }, [leagueId])

  const loadScoringProfile = useCallback(async () => {
    if (!leagueId) return
    const profile = await getScoringProfile(leagueId)
    setScoringProfile(profile)
  }, [leagueId])

  // Explicit re-fetch (not just the realtime subscription below) so balances/
  // season points reliably update right after an action, even if Supabase
  // Realtime isn't enabled for these tables in this project.
  const refreshMembers = useCallback(async () => {
    if (!leagueId) return
    try {
      const rows = await getLeagueMembers(leagueId)
      setMembers(rows)
    } catch (err) {
      console.error('[NflLeague] members refresh error:', err.message)
    }
  }, [leagueId])

  useEffect(() => {
    if (!leagueId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([getLeague(leagueId), loadScoringProfile(), refreshLeaderboard()])
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [leagueId, loadScoringProfile, refreshLeaderboard])

  useEffect(() => {
    if (!leagueId) return
    const unsubLeague = subscribeToLeague(leagueId, setLeague)
    const unsubMembers = subscribeToLeagueMembers(leagueId, setMembers)
    return () => { unsubLeague(); unsubMembers() }
  }, [leagueId])

  useEffect(() => {
    if (!myMember) { setMyRoster([]); return }
    getRosterForManager(myMember.id).then(setMyRoster).catch((err) => setError(err.message))
  }, [myMember?.id])

  // Explicit re-fetch for the same reason as refreshMembers — roster changes
  // (market wins, sales) shouldn't depend on Realtime being enabled.
  const refreshRoster = useCallback(async () => {
    if (!myMember) return
    try {
      const roster = await getRosterForManager(myMember.id)
      setMyRoster(roster)
    } catch (err) {
      console.error('[NflLeague] roster refresh error:', err.message)
    }
  }, [myMember?.id])

  // Best-effort "what week is it" for opponent lookups — see getCurrentWeek's
  // own doc comment for why this isn't an authoritative clock.
  const refreshCurrentWeek = useCallback(async () => {
    if (!league) return
    try {
      setCurrentWeek(await getCurrentWeek(league))
    } catch (err) {
      console.error('[NflLeague] currentWeek error:', err.message)
    }
  }, [league])

  useEffect(() => {
    if (!league) return
    refreshCurrentWeek()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league?.id])

  const buildStartingRoster = async () => {
    if (!league || !myMember) throw new Error('League not loaded.')
    const result = league.rosterMode === 'random'
      ? await buildRandomRoster({ league, member: myMember })
      : await initEmptyRoster()
    await refreshRoster()
    await refreshMembers() // balance changed
    return result
  }

  return {
    league,
    members,
    myMember,
    isCommissioner,
    scoringProfile,
    myRoster,
    leaderboard,
    currentWeek,
    loading,
    error,
    buildStartingRoster,
    refreshLeaderboard,
    refreshMembers,
    refreshRoster,
    refreshCurrentWeek,
    refreshScoringProfile: loadScoringProfile,
  }
}
