import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { useAuth } from '@/hooks/useAuth'
import { Zap, Trophy, AlertCircle } from 'lucide-react'
import TeamLogo from '@/components/FootballWinLeague/TeamLogo'
import { NFL_WL_TEAMS, FWL_MATCH_POINTS } from '@/data/nflWinLeagueTeams'
import { fmtPts } from '@/components/FootballWinLeague/format'

function ResultDot({ result }) {
  if (result === 'win') return <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">W</span>
  if (result === 'tie') return <span className="w-5 h-5 rounded-full bg-yellow-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">T</span>
  if (result === 'loss') return <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">L</span>
  return <span className="w-5 h-5 rounded-full border border-gray-700 flex-shrink-0" />
}

function TeamCard({ pick, results }) {
  const team = NFL_WL_TEAMS[pick.teamId]
  if (!team) return null

  const teamResults = results
    .filter((r) => r.teamId === pick.teamId)
    .sort((a, b) => (a.week ?? 0) - (b.week ?? 0))

  const wins   = teamResults.filter((r) => r.outcome === 'win').length
  const ties   = teamResults.filter((r) => r.outcome === 'tie').length
  const losses = teamResults.filter((r) => r.outcome === 'loss').length
  const totalPts = wins * FWL_MATCH_POINTS.win + ties * FWL_MATCH_POINTS.tie

  return (
    <div className="card overflow-hidden border border-f1light">
      {/* Team header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: `linear-gradient(90deg, ${team.color}22, transparent)` }}
      >
        <TeamLogo team={team} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-base">{team.name}</h3>
          <p className="text-xs text-gray-400">{team.conference} {team.division}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black" style={{ color: team.color !== '#000000' ? team.color : '#9ca3af' }}>
            {fmtPts(totalPts)}
          </p>
          <p className="text-[10px] text-gray-500">total pts</p>
        </div>
      </div>

      {/* Record breakdown */}
      <div className="px-4 py-3 border-t border-f1light grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-black text-green-400">{wins}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Wins</p>
        </div>
        <div>
          <p className="text-lg font-black text-yellow-400">{ties}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Ties</p>
        </div>
        <div>
          <p className="text-lg font-black text-gray-400">{losses}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Losses</p>
        </div>
      </div>

      {/* Week history */}
      {teamResults.length > 0 ? (
        <div className="border-t border-f1light">
          <p className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Week-by-Week</p>
          <div className="divide-y divide-f1light">
            {teamResults.map((r) => {
              const pts = r.outcome === 'win' ? FWL_MATCH_POINTS.win : r.outcome === 'tie' ? FWL_MATCH_POINTS.tie : 0
              return (
                <div key={r.week} className="px-4 py-2 flex items-center gap-3">
                  <ResultDot result={r.outcome} />
                  <span className="text-xs text-gray-400 flex-shrink-0">Week {r.week}</span>
                  <span className={`text-xs font-bold w-12 text-right ml-auto ${pts >= 1 ? 'text-green-400' : pts > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                    +{fmtPts(pts)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-f1light text-xs text-gray-600 italic">
          No results recorded yet.
        </div>
      )}
    </div>
  )
}

export default function MyTeamsPage() {
  const { user } = useAuth()
  const { myPicks, results, session, myPlayer, leaderboard } = useFootballWinLeague()

  const draftDone = session?.status === 'locked' || session?.status === 'complete' || session?.status === 'active'

  if (!myPlayer) {
    return (
      <div className="card text-center py-14 space-y-3">
        <Zap className="w-12 h-12 text-gray-600 mx-auto" />
        <h2 className="text-lg font-bold text-white">You're Not In This Game</h2>
        <p className="text-gray-400 text-sm">
          Go to the <strong className="text-white">Draft</strong> tab to join when registration is open.
        </p>
      </div>
    )
  }

  if (!draftDone && myPicks.length === 0) {
    return (
      <div className="card text-center py-14 space-y-3">
        <Zap className="w-10 h-10 text-gray-600 mx-auto" />
        <h2 className="text-base font-bold text-white">Draft hasn't started yet</h2>
        <p className="text-gray-400 text-sm">Your team cards will appear here once you've made your picks.</p>
      </div>
    )
  }

  const myRank = leaderboard.findIndex((p) => p.userId === user?.uid) + 1
  const myRow  = leaderboard.find((p) => p.userId === user?.uid)
  const totalPts = myRow?.totalPoints ?? 0

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="card bg-gradient-to-br from-green-900/30 to-transparent border-green-700/30">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-green-400">{fmtPts(totalPts)}</p>
            <p className="text-xs text-gray-400">Total Pts</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{myRow?.totalWins ?? 0}</p>
            <p className="text-xs text-gray-400">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-black text-yellow-400">{myRow?.totalTies ?? 0}</p>
            <p className="text-xs text-gray-400">Ties</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">#{myRank || '—'}</p>
            <p className="text-xs text-gray-400">Rank</p>
          </div>
        </div>
      </div>

      {/* Pending picks */}
      {!draftDone && myPicks.length < (session?.picksPerPlayer ?? 3) && (
        <div className="flex items-center gap-2 text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-700 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          You have {(session?.picksPerPlayer ?? 3) - myPicks.length} more pick(s) remaining. Go to the <strong className="mx-1">Draft</strong> tab when it's your turn.
        </div>
      )}

      {/* Team cards */}
      <div className="space-y-4">
        {myPicks.sort((a, b) => a.pickNumber - b.pickNumber).map((pick) => (
          <TeamCard key={pick.teamId} pick={pick} results={results} />
        ))}
      </div>
    </div>
  )
}
