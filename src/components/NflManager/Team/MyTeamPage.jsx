import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Shield, Sparkles, AlertTriangle } from 'lucide-react'
import { formatMoney } from '@/components/NflManager/NflManagerLayout'

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

export default function MyTeamPage() {
  const { league, myMember, myRoster, buildStartingRoster, refreshLeaderboard } = useOutletContext()
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState(null)

  const rosterValue = myRoster.reduce((sum, slot) => sum + (slot.purchasePrice || 0), 0)
  const grouped = POSITION_ORDER.map((pos) => ({
    position: pos,
    players: myRoster.filter((s) => s.player?.position === pos),
  })).filter((g) => g.players.length > 0)

  const claimRoster = async () => {
    setBuilding(true); setError(null)
    try {
      await buildStartingRoster()
      await refreshLeaderboard()
    } catch (err) {
      setError(err.message)
    } finally {
      setBuilding(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="card bg-gradient-to-br from-blue-900/30 to-transparent border-blue-700/30">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={`text-2xl font-black ${myMember.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>{formatMoney(myMember.balance)}</p>
            <p className="text-xs text-gray-400">Balance</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{formatMoney(rosterValue)}</p>
            <p className="text-xs text-gray-400">Roster Value</p>
          </div>
          <div>
            <p className="text-2xl font-black text-blue-400">{myMember.seasonPoints.toFixed(1)}</p>
            <p className="text-xs text-gray-400">Season Pts</p>
          </div>
        </div>
      </div>

      {myMember.balance < 0 && (
        <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/20 border border-red-700 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Your balance is negative. You'll score 0 points for any week that starts while you're in the red.
        </div>
      )}

      {myRoster.length === 0 && (
        <div className="card text-center py-14 space-y-3">
          <Shield className="w-12 h-12 text-gray-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">Build Your Starting Roster</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            {league.rosterMode === 'random'
              ? `This league starts with a random roster draw (${Object.entries(league.rosterTemplate).map(([p, c]) => `${c} ${p}`).join(', ')}) and your remaining budget.`
              : `This league starts with an empty roster and your full ${formatMoney(league.budgetAmount)} budget.`}
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button className="btn-primary flex items-center gap-2 mx-auto" disabled={building} onClick={claimRoster}>
            <Sparkles className="w-4 h-4" />
            {building ? 'Building...' : league.rosterMode === 'random' ? 'Draw My Roster' : 'Start With Empty Roster'}
          </button>
        </div>
      )}

      {myRoster.length > 0 && (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.position} className="card p-0 overflow-hidden">
              <div className="px-4 py-2 border-b border-f1light">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group.position} ({group.players.length})</span>
              </div>
              <div className="divide-y divide-f1light">
                {group.players.map((slot) => (
                  <div key={slot.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{slot.player?.displayName}</p>
                      <p className="text-xs text-gray-500">
                        {slot.player?.nflTeam} · Bye {slot.player?.byeWeek}
                        {slot.player?.injuryStatus ? ` · ${slot.player.injuryStatus}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-300 flex-shrink-0">{formatMoney(slot.purchasePrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
