import { getOpponent } from '@/data/nflSchedule'

export function fmtPts(v) {
  return v == null ? '—' : v.toFixed(1)
}

/** Compact opponent/season-avg/projected cluster shown next to a player row. */
export default function PlayerStatsInline({ nflTeam, currentWeek, summary }) {
  const opponent = currentWeek ? getOpponent(nflTeam, currentWeek) : undefined

  return (
    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
      {currentWeek != null && (
        opponent
          ? <span className="text-gray-400">Wk{currentWeek} vs {opponent}</span>
          : <span className="text-orange-400">Wk{currentWeek} BYE</span>
      )}
      <span className="text-gray-400">Avg <strong className="text-gray-200">{fmtPts(summary?.seasonAvg)}</strong></span>
      <span className="text-gray-400">Proj <strong className="text-blue-300">{fmtPts(summary?.projected)}</strong></span>
    </div>
  )
}
