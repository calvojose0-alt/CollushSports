import { useState } from 'react'
import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, ChevronDown, ChevronUp, Medal, Zap } from 'lucide-react'
import TeamLogo from '@/components/FootballWinLeague/TeamLogo'
import { NFL_WL_TEAMS } from '@/data/nflWinLeagueTeams'
import { fmtPts } from '@/components/FootballWinLeague/format'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-f1gold font-black text-lg">🥇</span>
  if (rank === 2) return <span className="text-f1silver font-black text-lg">🥈</span>
  if (rank === 3) return <span className="text-f1bronze font-black text-lg">🥉</span>
  return <span className="text-gray-500 font-semibold text-sm w-6 text-center">{rank}</span>
}

function Avatar({ name, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'
  return (
    <div className={`${sz} rounded-full bg-green-700 flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// One icon per week: green ✓ = win, grey – = tie, red ✗ = loss
function WeekResultIcons({ weeks }) {
  if (!weeks || weeks.length === 0) {
    return <span className="text-[9px] text-gray-600 italic">No games yet</span>
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {weeks.map((w, i) => {
        const title = `Week ${w.week}: ${w.outcome}`
        if (w.outcome === 'win') {
          return (
            <span key={i} title={title}
              className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold leading-none">
              ✓
            </span>
          )
        }
        if (w.outcome === 'tie') {
          return (
            <span key={i} title={title}
              className="w-4 h-4 rounded-full bg-gray-500/20 text-gray-400 flex items-center justify-center text-[11px] font-bold leading-none">
              –
            </span>
          )
        }
        return (
          <span key={i} title={title}
            className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold leading-none">
            ✗
          </span>
        )
      })}
    </div>
  )
}

function TeamMiniCard({ team }) {
  const info = NFL_WL_TEAMS[team.teamId]
  if (!info) return null
  return (
    <div className="bg-f1dark rounded-lg px-3 py-2 flex-1 min-w-[150px] space-y-1.5">
      <div className="flex items-center gap-2">
        <TeamLogo team={info} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{info.name}</p>
          <p className="text-[10px] text-gray-500">{team.wins}W · {team.ties}T · {team.losses}L</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-black" style={{ color: info.color !== '#000000' ? info.color : '#9ca3af' }}>
            {fmtPts(team.matchPoints)}
          </p>
        </div>
      </div>
      {/* Per-week result icons */}
      <WeekResultIcons weeks={team.weeks} />
    </div>
  )
}

function PlayerRow({ player, rank, isMe, expanded, onToggle, isChampion }) {
  return (
    <div className={`${isMe ? 'bg-green-900/20' : ''} ${isChampion ? 'bg-yellow-900/10' : ''}`}>
      {/* Main row */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className="w-7 flex-shrink-0 flex items-center justify-center">
            <RankBadge rank={rank} />
          </div>

          {/* Avatar */}
          <Avatar name={player.displayName} />

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-semibold text-sm truncate ${isMe ? 'text-white' : 'text-gray-200'}`}>
                {player.displayName}
              </span>
              {isMe && (
                <span className="text-xs bg-green-900/40 text-green-400 border border-green-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                  You
                </span>
              )}
              {isChampion && <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
              <span className="text-green-400">{player.totalWins}W</span>
              <span>·</span>
              <span className="text-gray-400">{player.totalTies}T</span>
              <span>·</span>
              <span className="text-gray-500">{player.totalLosses}L</span>
            </div>
          </div>

          {/* Total points */}
          <div className="text-right flex-shrink-0">
            <div className={`font-black text-lg leading-none ${player.totalPoints > 0 ? 'text-green-400' : 'text-gray-600'}`}>
              {fmtPts(player.totalPoints)}
            </div>
            <div className="text-[10px] text-gray-500">pts</div>
          </div>

          {/* Expand button */}
          <button
            onClick={onToggle}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-f1light bg-f1dark hover:bg-f1light text-gray-300 hover:text-white text-xs font-semibold transition-colors flex-shrink-0"
          >
            Teams
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Team badges preview */}
        <div className="flex items-center gap-1.5 pl-10 flex-wrap">
          {(player.teams || []).map((t) => {
            const info = NFL_WL_TEAMS[t.teamId]
            if (!info) return null
            return (
              <span
                key={t.teamId}
                title={info.name}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border bg-gray-800/60 border-f1light text-gray-300"
              >
                <TeamLogo team={info} size="xs" />
                {info.shortName}
              </span>
            )
          })}
          {(!player.teams || player.teams.length === 0) && (
            <span className="text-xs text-gray-600 italic">No picks yet</span>
          )}
        </div>
      </div>

      {/* Expanded: team breakdown */}
      {expanded && player.teams?.length > 0 && (
        <div className="mx-4 mb-3 rounded-xl border border-f1light bg-f1dark overflow-hidden">
          <div className="px-4 py-2 border-b border-f1light">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Team Breakdown — {player.displayName}
            </p>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {player.teams.map((t) => <TeamMiniCard key={t.teamId} team={t} />)}
          </div>
          <div className="px-4 py-2 border-t border-f1light grid grid-cols-3 text-center text-xs">
            <div>
              <p className="font-bold text-green-400">{player.totalWins}</p>
              <p className="text-gray-500">Wins</p>
            </div>
            <div>
              <p className="font-bold text-gray-300">{player.totalTies}</p>
              <p className="text-gray-500">Ties</p>
            </div>
            <div>
              <p className="font-bold text-white">{fmtPts(player.totalPoints)}</p>
              <p className="text-gray-500">Total Pts</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { leaderboard, session, players, picks } = useFootballWinLeague()
  const [expanded, setExpanded] = useState(null)

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id))
  const draftDone = session?.status === 'locked' || session?.status === 'complete' || session?.status === 'active'
  const isComplete = session?.status === 'complete'
  const champion = isComplete && leaderboard[0]

  if (!draftDone && leaderboard.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-white">Leaderboard</h2>
        </div>
        <div className="card text-center py-12 space-y-2">
          <Zap className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-gray-400 text-sm">Leaderboard will be visible once the draft is complete.</p>
        </div>
      </div>
    )
  }

  const totalTeamsDrafted = picks.length

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-white">Leaderboard</h2>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Zap className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-green-400">{players.length}</div>
          <div className="text-xs text-gray-400">Players</div>
        </div>
        <div className="card text-center">
          <Medal className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-yellow-400">{totalTeamsDrafted}</div>
          <div className="text-xs text-gray-400">Teams Drafted</div>
        </div>
        <div className="card text-center">
          <Trophy className="w-5 h-5 text-f1gold mx-auto mb-1" />
          <div className="text-2xl font-black text-f1gold">
            {fmtPts(leaderboard[0]?.totalPoints ?? 0)}
          </div>
          <div className="text-xs text-gray-400">Top Score</div>
        </div>
      </div>

      {/* Champion banner */}
      {champion && (
        <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/40 border border-yellow-700 rounded-2xl px-6 py-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-f1gold">{champion.displayName}</h2>
          <p className="text-yellow-400 font-semibold">Pro Football Win-League Champion</p>
          <p className="text-gray-400 text-sm mt-1">{fmtPts(champion.totalPoints)} total points</p>
        </div>
      )}

      {/* Standings table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-f1light flex items-center gap-2">
          <Trophy className="w-4 h-4 text-f1gold" />
          <h2 className="font-bold text-white">Standings</h2>
          {!draftDone && (
            <span className="ml-auto text-xs text-gray-500">Draft in progress</span>
          )}
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No players yet.
          </div>
        ) : (
          <div className="divide-y divide-f1light">
            {leaderboard.map((player, idx) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={idx + 1}
                isMe={player.userId === user?.uid}
                expanded={expanded === player.id}
                onToggle={() => toggle(player.id)}
                isChampion={isComplete && idx === 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scoring guide */}
      <div className="text-xs text-gray-500 bg-f1dark border border-f1light rounded-xl px-4 py-3 space-y-2">
        <p className="text-gray-400 font-semibold">Scoring Guide</p>
        <div>
          <p className="text-gray-500 mb-1">Each regular-season game (Weeks 1–18):</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <span>🏈 Win: <strong className="text-green-400">+1</strong></span>
            <span>🤝 Tie: <strong className="text-yellow-400">+0.5</strong></span>
            <span>❌ Loss: <strong className="text-gray-600">0</strong></span>
          </div>
        </div>
        <p className="text-gray-600">Tiebreakers: 1. Total wins  2. Fewest losses</p>
      </div>
    </div>
  )
}
