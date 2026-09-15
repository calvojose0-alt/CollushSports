import { useState } from 'react'
import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { Trophy, ChevronDown, ChevronUp, Users, CalendarDays } from 'lucide-react'
import TeamLogo from '@/components/FootballWinLeague/TeamLogo'
import { fmtPts } from '@/components/FootballWinLeague/format'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-f1gold font-black text-lg">🥇</span>
  if (rank === 2) return <span className="text-f1silver font-black text-lg">🥈</span>
  if (rank === 3) return <span className="text-f1bronze font-black text-lg">🥉</span>
  return <span className="text-gray-500 font-semibold text-sm w-6 text-center">{rank}</span>
}

// One icon per recorded week: green ✓ = win, grey – = tie, red ✗ = loss
function WeekIcons({ weeks }) {
  if (!weeks || weeks.length === 0) {
    return <span className="text-[9px] text-gray-600 italic">No games yet</span>
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {weeks.map((w, i) => {
        const title = `Week ${w.week}: ${w.outcome}`
        if (w.outcome === 'win') return <span key={i} title={title} className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold leading-none">✓</span>
        if (w.outcome === 'tie') return <span key={i} title={title} className="w-4 h-4 rounded-full bg-gray-500/20 text-gray-400 flex items-center justify-center text-[11px] font-bold leading-none">–</span>
        return <span key={i} title={title} className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold leading-none">✗</span>
      })}
    </div>
  )
}

// Compact team chip: badge · record · pts
function TeamChip({ team }) {
  const info = team.teamInfo
  if (!info) return null
  return (
    <span
      title={`${info.name}: ${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''} · ${fmtPts(team.points)} pts`}
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md border bg-gray-800/60 border-f1light text-gray-300"
    >
      <TeamLogo team={info} size="xs" />
      <span className="text-gray-400 tabular-nums">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ''}</span>
      <span className="text-green-400 font-bold">{fmtPts(team.points)}</span>
    </span>
  )
}

// Detailed per-team card (expanded view)
function TeamDetailCard({ team }) {
  const info = team.teamInfo
  if (!info) return null
  return (
    <div className="bg-f1dark rounded-lg px-3 py-2 flex-1 min-w-[150px] space-y-1.5">
      <div className="flex items-center gap-2">
        <TeamLogo team={info} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{info.name}</p>
          <p className="text-[10px] text-gray-500">{team.wins}W · {team.ties}T · {team.losses}L</p>
        </div>
        <p className="text-xs font-black" style={{ color: info.color !== '#000000' ? info.color : '#9ca3af' }}>
          {fmtPts(team.points)}
        </p>
      </div>
      <WeekIcons weeks={team.weeks} />
    </div>
  )
}

function ManagerRow({ row, rank, expanded, onToggle, isChampion }) {
  return (
    <div className={isChampion ? 'bg-yellow-900/10' : ''}>
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-7 flex-shrink-0 flex items-center justify-center">
            <RankBadge rank={rank} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-gray-100 truncate">{row.manager}</span>
              {isChampion && <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
              <span className="text-green-400">{row.totalWins}W</span>
              <span>·</span>
              <span className="text-gray-400">{row.totalTies}T</span>
              <span>·</span>
              <span className="text-gray-500">{row.totalLosses}L</span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className={`font-black text-lg leading-none ${row.totalPoints > 0 ? 'text-green-400' : 'text-gray-600'}`}>
              {fmtPts(row.totalPoints)}
            </div>
            <div className="text-[10px] text-gray-500">pts</div>
          </div>

          <button
            onClick={onToggle}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-f1light bg-f1dark hover:bg-f1light text-gray-300 hover:text-white text-xs font-semibold transition-colors flex-shrink-0"
          >
            Teams
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Team chips with record + points */}
        <div className="flex items-center gap-1.5 pl-10 flex-wrap">
          {row.teams.map((t) => <TeamChip key={t.teamId} team={t} />)}
        </div>
      </div>

      {/* Expanded per-team detail */}
      {expanded && (
        <div className="mx-4 mb-3 rounded-xl border border-f1light bg-f1dark overflow-hidden">
          <div className="px-4 py-2 border-b border-f1light">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Team Breakdown — {row.manager}</p>
          </div>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {row.teams.map((t) => <TeamDetailCard key={t.teamId} team={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const { standings, weeksScored, isComplete } = useFootballWinLeague()
  const [expanded, setExpanded] = useState(null)
  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id))

  const champion = isComplete && standings[0]
  const topScore = standings[0]?.totalPoints ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-white">Standings</h2>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Users className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-green-400">{standings.length}</div>
          <div className="text-xs text-gray-400">Managers</div>
        </div>
        <div className="card text-center">
          <CalendarDays className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-yellow-400">{weeksScored.length}</div>
          <div className="text-xs text-gray-400">Weeks Scored</div>
        </div>
        <div className="card text-center">
          <Trophy className="w-5 h-5 text-f1gold mx-auto mb-1" />
          <div className="text-2xl font-black text-f1gold">{fmtPts(topScore)}</div>
          <div className="text-xs text-gray-400">Top Score</div>
        </div>
      </div>

      {/* Champion banner */}
      {champion && (
        <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/40 border border-yellow-700 rounded-2xl px-6 py-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-f1gold">{champion.manager}</h2>
          <p className="text-yellow-400 font-semibold">Pro Football Win-League Champion</p>
          <p className="text-gray-400 text-sm mt-1">{fmtPts(champion.totalPoints)} total points</p>
        </div>
      )}

      {/* Standings table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-f1light flex items-center gap-2">
          <Trophy className="w-4 h-4 text-f1gold" />
          <h2 className="font-bold text-white">Manager Standings</h2>
          <span className="ml-auto text-xs text-gray-500">
            {weeksScored.length ? `Through Week ${Math.max(...weeksScored)}` : 'No results yet'}
          </span>
        </div>
        <div className="divide-y divide-f1light">
          {standings.map((row, idx) => (
            <ManagerRow
              key={row.id}
              row={row}
              rank={idx + 1}
              expanded={expanded === row.id}
              onToggle={() => toggle(row.id)}
              isChampion={isComplete && idx === 0}
            />
          ))}
        </div>
      </div>

      {/* Scoring guide */}
      <div className="text-xs text-gray-500 bg-f1dark border border-f1light rounded-xl px-4 py-3 space-y-2">
        <p className="text-gray-400 font-semibold">Scoring Guide</p>
        <p className="text-gray-500">Each manager scores the combined results of their 3 teams, every week:</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          <span>🏈 Win: <strong className="text-green-400">+1</strong></span>
          <span>🤝 Tie: <strong className="text-yellow-400">+0.5</strong></span>
          <span>❌ Loss: <strong className="text-gray-600">0</strong></span>
        </div>
        <p className="text-gray-600">Team chips show <span className="tabular-nums">W-L</span> (or W-L-T) record and points. Tiebreakers: total wins, then fewest losses.</p>
      </div>
    </div>
  )
}
