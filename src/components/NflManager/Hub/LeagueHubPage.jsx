import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Plus, KeyRound, Users, ChevronRight, ChevronLeft } from 'lucide-react'
import { useNflLeagues } from '@/hooks/useNflLeagues'
import { formatMoney } from '@/components/NflManager/NflManagerLayout'

function LeagueCard({ league, action }) {
  return (
    <div className="card flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-bold text-white truncate">{league.name}</p>
        <p className="text-xs text-gray-400">
          {league.seasonYear} · {league.leagueType === 'public' ? 'Public' : 'Private'} · {formatMoney(league.budgetAmount)} budget · {league.rosterMode} start
        </p>
      </div>
      {action}
    </div>
  )
}

function JoinInline({ onJoin }) {
  const [teamName, setTeamName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)

  if (!open) {
    return <button className="btn-primary flex-shrink-0 text-sm px-3 py-1.5" onClick={() => setOpen(true)}>Join</button>
  }

  return (
    <div className="flex-shrink-0 flex items-center gap-2">
      <input
        className="input-field text-sm py-1.5 w-32"
        placeholder="Team name"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
      />
      <button
        className="btn-primary text-sm px-3 py-1.5"
        disabled={joining || !teamName.trim()}
        onClick={async () => {
          setJoining(true); setError(null)
          try { await onJoin(teamName.trim()) }
          catch (err) { setError(err.message); setJoining(false) }
        }}
      >
        {joining ? '...' : 'Confirm'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

export default function LeagueHubPage() {
  const navigate = useNavigate()
  const { publicLeagues, myLeagues, loading, error, join, joinByCode } = useNflLeagues()
  const [inviteCode, setInviteCode] = useState('')
  const [codeError, setCodeError] = useState(null)
  const [codeBusy, setCodeBusy] = useState(false)

  const myLeagueIds = new Set(myLeagues.map((l) => l.id))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Games
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">NFL Fantasy Manager League</h1>
            <p className="text-sm text-gray-400">Build a roster, set weekly lineups, climb the table.</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/nfl-manager/create')}>
          <Plus className="w-4 h-4" /> Create League
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Join by invite code */}
      <div className="card flex items-center gap-3 flex-wrap">
        <KeyRound className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-300 flex-shrink-0">Have an invite code?</span>
        <input
          className="input-field text-sm py-1.5 w-32 uppercase"
          placeholder="ABC123"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
        />
        <button
          className="btn-secondary text-sm px-3 py-1.5"
          disabled={codeBusy || !inviteCode.trim()}
          onClick={async () => {
            setCodeBusy(true); setCodeError(null)
            try {
              const teamName = window.prompt('Your team name for this league:')
              if (!teamName) { setCodeBusy(false); return }
              const league = await joinByCode({ inviteCode: inviteCode.trim(), teamName })
              navigate(`/nfl-manager/${league.id}`)
            } catch (err) {
              setCodeError(err.message)
            } finally {
              setCodeBusy(false)
            }
          }}
        >
          Join
        </button>
        {codeError && <span className="text-xs text-red-400">{codeError}</span>}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-14">
          <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && (
        <>
          {/* My leagues */}
          <div className="space-y-3">
            <h2 className="section-title flex items-center gap-2"><Users className="w-4 h-4" /> My Leagues</h2>
            {myLeagues.length === 0 && (
              <p className="text-sm text-gray-500 italic">You haven't joined any leagues yet.</p>
            )}
            <div className="space-y-2">
              {myLeagues.map((league) => (
                <LeagueCard
                  key={league.id}
                  league={league}
                  action={
                    <button
                      className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1 flex-shrink-0"
                      onClick={() => navigate(`/nfl-manager/${league.id}`)}
                    >
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  }
                />
              ))}
            </div>
          </div>

          {/* Public leagues */}
          <div className="space-y-3">
            <h2 className="section-title">Public Leagues</h2>
            {publicLeagues.length === 0 && (
              <p className="text-sm text-gray-500 italic">No public leagues open right now — create one!</p>
            )}
            <div className="space-y-2">
              {publicLeagues.filter((l) => !myLeagueIds.has(l.id)).map((league) => (
                <LeagueCard
                  key={league.id}
                  league={league}
                  action={
                    <JoinInline
                      onJoin={async (teamName) => {
                        await join({ leagueId: league.id, teamName })
                        navigate(`/nfl-manager/${league.id}`)
                      }}
                    />
                  }
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
