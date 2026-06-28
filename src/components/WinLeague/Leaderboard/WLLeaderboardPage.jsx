import { useState } from 'react'
import { useWinLeague } from '@/hooks/useWinLeague'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, ChevronDown, ChevronUp, Medal, Globe } from 'lucide-react'
import { WC_TEAMS } from '@/data/wc2026Teams'
import { WL_ROUNDS, WL_ROUND_ORDER } from '@/data/wl2026Rankings'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-f1gold font-black text-lg">🥇</span>
  if (rank === 2) return <span className="text-f1silver font-black text-lg">🥈</span>
  if (rank === 3) return <span className="text-f1bronze font-black text-lg">🥉</span>
  return <span className="text-gray-500 font-semibold text-sm w-6 text-center">{rank}</span>
}

function Avatar({ name, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'
  return (
    <div className={`${sz} rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// One icon per World Cup match: green ✓ = win, grey – = draw/tie, red ✗ = loss
function MatchResultIcons({ matches }) {
  if (!matches || matches.length === 0) {
    return <span className="text-[9px] text-gray-600 italic">No matches yet</span>
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {matches.map((m, i) => {
        const opp = m.opponentId ? WC_TEAMS[m.opponentId] : null
        const title = opp ? `vs ${opp.name}: ${m.outcome}` : m.outcome
        if (m.outcome === 'win') {
          return (
            <span key={i} title={title}
              className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold leading-none">
              ✓
            </span>
          )
        }
        if (m.outcome === 'draw') {
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
  const info = WC_TEAMS[team.teamId]
  if (!info) return null
  const isChampion = team.roundsReached?.includes('champion')
  return (
    <div className="bg-f1dark rounded-lg px-3 py-2 flex-1 min-w-[150px] space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{info.flag}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{info.name}</p>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {(team.roundsReached || []).slice(0, 3).map((r) => {
              const rInfo = WL_ROUNDS.find((x) => x.id === r)
              return rInfo ? (
                <span key={r} className="text-[9px] bg-emerald-900/50 text-emerald-300 px-1 rounded">{rInfo.shortLabel}</span>
              ) : null
            })}
            {(team.roundsReached || []).length > 3 && (
              <span className="text-[9px] text-gray-600">+{team.roundsReached.length - 3}</span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-black" style={{ color: info.color !== '#000000' ? info.color : '#9ca3af' }}>
            {team.matchPoints + team.advancePoints}
          </p>
          {isChampion && <span className="text-[10px]">🏆</span>}
        </div>
      </div>
      {/* Per-match result icons (World Cup games only) */}
      <MatchResultIcons matches={team.matches} />
    </div>
  )
}

function PlayerRow({ player, rank, isMe, expanded, onToggle, isChampion }) {
  return (
    <div className={`${isMe ? 'bg-emerald-900/20' : ''} ${isChampion ? 'bg-yellow-900/10' : ''}`}>
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
                <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                  You
                </span>
              )}
              {isChampion && <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
              <span className="text-green-400">{player.matchPoints}mp</span>
              <span>+</span>
              <span className="text-emerald-400">{player.advancePoints}adv</span>
            </div>
          </div>

          {/* Total points */}
          <div className="text-right flex-shrink-0">
            <div className={`font-black text-lg leading-none ${player.totalPoints > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
              {player.totalPoints}
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

        {/* Team flags preview */}
        <div className="flex items-center gap-1.5 pl-10 flex-wrap">
          {(player.teams || []).map((t) => {
            const info = WC_TEAMS[t.teamId]
            if (!info) return null
            return (
              <span
                key={t.teamId}
                title={t.eliminated ? `${info.name} (eliminated)` : info.name}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border ${
                  t.eliminated
                    ? 'bg-red-900/30 border-red-700/50 text-red-300 line-through decoration-red-400/70'
                    : 'bg-gray-800/60 border-f1light text-gray-300'
                }`}
              >
                <span className="text-sm leading-none no-underline">{info.flag}</span>
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
              <p className="font-bold text-green-400">{player.matchPoints}</p>
              <p className="text-gray-500">Match Pts</p>
            </div>
            <div>
              <p className="font-bold text-emerald-400">{player.advancePoints}</p>
              <p className="text-gray-500">Adv. Pts</p>
            </div>
            <div>
              <p className="font-bold text-white">{player.totalWins}</p>
              <p className="text-gray-500">Total Wins</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function WLLeaderboardPage() {
  const { user } = useAuth()
  const { leaderboard, session, players, picks } = useWinLeague()
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
          <Globe className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-gray-400 text-sm">Leaderboard will be visible once the draft is complete.</p>
        </div>
      </div>
    )
  }

  const totalTeamsDrafted = picks.length
  const maxTeams = (session?.maxPlayers ?? 10) * (session?.picksPerPlayer ?? 3)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-white">Leaderboard</h2>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Globe className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-emerald-400">{players.length}</div>
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
            {leaderboard[0]?.totalPoints ?? 0}
          </div>
          <div className="text-xs text-gray-400">Top Score</div>
        </div>
      </div>

      {/* Champion banner */}
      {champion && (
        <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/40 border border-yellow-700 rounded-2xl px-6 py-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-f1gold">{champion.displayName}</h2>
          <p className="text-yellow-400 font-semibold">2026 Soccer Win League Champion</p>
          <p className="text-gray-400 text-sm mt-1">{champion.totalPoints} total points</p>
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
          <p className="text-gray-500 mb-1">Each match (group stage + every game):</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            <span>🏆 Win: <strong className="text-green-400">+3</strong></span>
            <span>🤝 Draw: <strong className="text-yellow-400">+1</strong></span>
            <span>❌ Loss: <strong className="text-gray-600">0</strong></span>
          </div>
        </div>

        <div>
          <p className="text-gray-500 mb-1">Knockout wins (advancement bonus):</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span>Win Round of 32: <strong className="text-emerald-400">+2</strong></span>
            <span>Win Round of 16: <strong className="text-emerald-400">+4</strong></span>
            <span>Win Quarterfinal: <strong className="text-emerald-400">+5</strong></span>
            <span>Win Semifinal: <strong className="text-emerald-400">+6</strong></span>
            <span>Win Final (Champion): <strong className="text-emerald-400">+8</strong></span>
            <span>Max advancement: <strong className="text-white">+25</strong></span>
          </div>
        </div>

        <p className="text-gray-600">Tiebreakers: 1. Total wins  2. Total advancement bonuses</p>
      </div>
    </div>
  )
}
