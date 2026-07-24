// useNflLeagues — hub-level state: browse public leagues, list my leagues, create/join.
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  createLeague, listPublicLeagues, listMyLeagues, joinLeague, joinLeagueByInviteCode,
} from '@/services/nflManager/leagueService'

export function useNflLeagues() {
  const { user } = useAuth()
  const [publicLeagues, setPublicLeagues] = useState([])
  const [myLeagues, setMyLeagues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [pub, mine] = await Promise.all([
        listPublicLeagues(),
        user ? listMyLeagues(user.uid) : Promise.resolve([]),
      ])
      setPublicLeagues(pub)
      setMyLeagues(mine)
    } catch (err) {
      console.error('[NflLeagues] load error:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const create = async (input) => {
    if (!user) throw new Error('Sign in required.')
    const league = await createLeague({
      ...input,
      commissionerUserId: user.uid,
      commissionerTeamName: input.commissionerTeamName || user.displayName || 'Commissioner',
    })
    await load()
    return league
  }

  const join = async ({ leagueId, teamName }) => {
    if (!user) throw new Error('Sign in required.')
    await joinLeague({ leagueId, userId: user.uid, teamName })
    await load()
  }

  const joinByCode = async ({ inviteCode, teamName }) => {
    if (!user) throw new Error('Sign in required.')
    const { league } = await joinLeagueByInviteCode({ inviteCode, userId: user.uid, teamName })
    await load()
    return league
  }

  return { publicLeagues, myLeagues, loading, error, create, join, joinByCode, reload: load }
}
