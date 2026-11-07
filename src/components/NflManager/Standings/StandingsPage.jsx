import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Trophy, RefreshCw } from 'lucide-react'
import { formatMoney } from '@/components/NflManager/NflManagerLayout'

export default function StandingsPage() {
  const { league, leaderboard, refreshLeaderboard, myMember } = useOutletContext()

  useEffect(() => { refreshLeaderboard() }, [refreshLeaderboard])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2"><Trophy className="w-4 h-4" /> Standings</h2>
        <button className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5" onClick={refreshLeaderboard}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="table-header text-left">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-right">Season Pts</th>
              <th className="px-4 py-3 text-right">Latest Week</th>
              <th className="px-4 py-3 text-right">Best Week</th>
              <th className="px-4 py-3 text-right">Roster Value</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Players</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-f1light">
            {leaderboard.map((row) => (
              <tr key={row.managerId} className={row.managerId === myMember?.id ? 'bg-blue-900/20' : ''}>
                <td className="px-4 py-3">
                  <span className={`font-black ${row.rank === 1 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {row.rank === 1 ? '🏆 ' : ''}{row.rank}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-white">{row.teamName}</td>
                <td className="px-4 py-3 text-right font-bold text-blue-400">{row.seasonPoints.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{row.weeklyScore.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{row.bestWeekScore.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{formatMoney(row.rosterValue)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${row.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatMoney(row.balance)}
                </td>
                <td className="px-4 py-3 text-right text-gray-400">{row.playersOwned}</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500 italic">No managers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Ties are broken by season points, then roster value, then best single-week score.
        {league.status !== 'complete' && ' Champion is declared after the final configured week.'}
      </p>
    </div>
  )
}
