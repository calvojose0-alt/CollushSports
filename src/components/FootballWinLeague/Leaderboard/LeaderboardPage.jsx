import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { Trophy, Users, CalendarDays } from 'lucide-react'
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
    return <span className="text-[10px] text-gray-600 italic">No games yet</span>
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

// Full-name team row: logo · team name · record · week icons · points
function TeamLine({ team }) {
  const info = team.teamInfo
  if (!info) return null
  return (
    <div className="flex items-center gap-3 bg-f1dark rounded-lg px-3 py-2">
      <TeamLogo team={info} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{info.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-500">{team.wins}W · {team.ties}T · {team.losses}L</span>
          <WeekIcons weeks={team.weeks} />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-base font-black text-white">
          {fmtPts(team.points)}
        </p>
        <p className="text-[9px] text-gray-500 -mt-0.5">pts</p>
      </div>
    </div>
  )
}

function ManagerRow({ row, rank, isChampion }) {
  return (
    <div className={`px-4 py-3.5 space-y-3 ${isChampion ? 'bg-yellow-900/10' : ''}`}>
      {/* Header: rank · manager · total */}
      <div className="flex items-center gap-3">
        <div className="w-7 flex-shrink-0 flex items-center justify-center">
          <RankBadge rank={rank} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-white truncate">{row.manager}</span>
            {isChampion && <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
          </div>
          <p className="text-[11px] text-gray-500">
            <span className="text-green-400">{row.totalWins}W</span> · {row.totalTies}T · {row.totalLosses}L
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`font-black text-xl leading-none ${row.totalPoints > 0 ? 'text-green-400' : 'text-gray-600'}`}>
            {fmtPts(row.totalPoints)}
          </div>
          <div className="text-[10px] text-gray-500">pts</div>
        </div>
      </div>

      {/* The three teams, full names + results, always shown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-10">
        {row.teams.map((t) => <TeamLine key={t.teamId} team={t} />)}
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const { standings, weeksScored, isComplete } = useFootballWinLeague()

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
        <p className="text-gray-600">Tiebreakers: total wins, then fewest losses.</p>
      </div>
    </div>
  )
}
