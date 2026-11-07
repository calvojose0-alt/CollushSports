import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, AlertCircle } from 'lucide-react'
import { getLeagueByInviteCode, joinLeagueByInviteCode } from '@/services/nflManager/leagueService'
import { formatMoney } from '@/components/NflManager/NflManagerLayout'

export default function JoinLeaguePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [league, setLeague] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [fetchErr, setFetchErr] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinErr, setJoinErr] = useState(null)

  useEffect(() => {
    getLeagueByInviteCode(code)
      .then((l) => { if (!l) setFetchErr('This invite code is not valid.'); setLeague(l) })
      .catch((err) => setFetchErr(err.message))
      .finally(() => setFetching(false))
  }, [code])

  if (fetching || authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (fetchErr || !league) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-white font-bold">{fetchErr || 'League not found.'}</p>
        <button className="btn-secondary" onClick={() => navigate('/nfl-manager')}>Back to Leagues</button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <Shield className="w-10 h-10 text-blue-400 mx-auto" />
        <p className="text-white font-bold">Sign in to join "{league.name}"</p>
        <button className="btn-primary" onClick={() => navigate('/login')}>Sign In</button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-5">
      <div className="text-center space-y-2">
        <Shield className="w-10 h-10 text-blue-400 mx-auto" />
        <h1 className="text-xl font-black text-white">Join {league.name}</h1>
        <p className="text-sm text-gray-400">
          {league.seasonYear} · {formatMoney(league.budgetAmount)} budget · {league.rosterMode} start
        </p>
      </div>

      <div className="card space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Your Team Name</span>
          <input className="input-field" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Thomas's Titans" />
        </label>

        {joinErr && <p className="text-xs text-red-400">{joinErr}</p>}

        <button
          className="btn-primary w-full py-2.5"
          disabled={joining || !teamName.trim()}
          onClick={async () => {
            setJoining(true); setJoinErr(null)
            try {
              const { league: joined } = await joinLeagueByInviteCode({ inviteCode: code, userId: user.uid, teamName: teamName.trim() })
              navigate(`/nfl-manager/${joined.id}`)
            } catch (err) {
              setJoinErr(err.message)
              setJoining(false)
            }
          }}
        >
          {joining ? 'Joining...' : 'Join League'}
        </button>
      </div>
    </div>
  )
}
