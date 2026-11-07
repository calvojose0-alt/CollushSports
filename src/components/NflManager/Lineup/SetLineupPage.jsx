import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Lock, Unlock, CheckCircle2, AlertTriangle, Users } from 'lucide-react'
import { getOrCreateWeeklyLineup, setLineupSlot, clearLineupSlot } from '@/services/nflManager/lineupService'
import { SLOT_ELIGIBILITY } from '@/services/gameEngine/nflScoringEngine'

const SLOT_LABELS = { QB: 'QB', RB1: 'RB', RB2: 'RB', WR1: 'WR', WR2: 'WR', TE: 'TE', FLEX: 'FLEX (RB/WR/TE)', DST: 'D/ST', K: 'K' }

function StatusPill({ lineup }) {
  if (!lineup) return null
  if (lineup.lineupStatus === 'scored') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-900/60 text-blue-300 border border-blue-700">
        <CheckCircle2 className="w-3 h-3" /> Scored · {lineup.totalPoints.toFixed(1)} pts
        {lineup.noScoreReason && <span className="text-red-300 ml-1">({lineup.noScoreReason.replace('_', ' ')})</span>}
      </span>
    )
  }
  if (lineup.lineupStatus === 'locked') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-900/60 text-yellow-300 border border-yellow-700">
        <Lock className="w-3 h-3" /> Locked — swap only with players who haven't played
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-900/60 text-green-300 border border-green-700">
      <Unlock className="w-3 h-3" /> Open
    </span>
  )
}

function PlayerBadges({ player, week }) {
  if (!player) return null
  const onBye = player.byeWeek === week
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {onBye && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-300 border border-orange-700">
          BYE WEEK
        </span>
      )}
      {player.injuryStatus && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700">
          {player.injuryStatus}
        </span>
      )}
    </div>
  )
}

export default function SetLineupPage() {
  const { league, myMember, myRoster } = useOutletContext()
  const [week, setWeek] = useState(league.startWeek)
  const [lineup, setLineup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busySlot, setBusySlot] = useState(null)

  const loadLineup = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await getOrCreateWeeklyLineup({ league, managerId: myMember.id, nflWeek: week })
      setLineup(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [league, myMember.id, week])

  useEffect(() => { loadLineup() }, [loadLineup])

  const usedPlayerIds = new Set((lineup?.slots || []).filter((s) => !s.isEmpty).map((s) => s.playerId))
  const rosterByPlayerId = Object.fromEntries(myRoster.map((r) => [r.playerId, r]))

  const eligibleFor = (slotType) => {
    const allowedPositions = SLOT_ELIGIBILITY[slotType] || []
    return myRoster.filter((slot) => allowedPositions.includes(slot.player?.position))
  }

  const assign = async (slotType, playerId) => {
    setBusySlot(slotType); setError(null)
    try {
      if (!playerId) {
        await clearLineupSlot({ weeklyLineup: lineup, slotType })
      } else {
        await setLineupSlot({ weeklyLineup: lineup, slotType, playerId, rosterSlots: myRoster })
      }
      await loadLineup()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusySlot(null)
    }
  }

  const weekOptions = []
  for (let w = league.startWeek; w <= league.endWeek; w++) weekOptions.push(w)

  const benchSlots = myRoster.filter((r) => !usedPlayerIds.has(r.playerId))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select className="input-field w-32 py-1.5" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {weekOptions.map((w) => <option key={w} value={w}>Week {w}</option>)}
          </select>
          <StatusPill lineup={lineup} />
        </div>
      </div>

      {myMember.balance < 0 && (
        <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/20 border border-red-700 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Your balance is negative right now — if it's still negative when this week locks, you'll score 0 regardless of your lineup.
        </div>
      )}

      {error && <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>}

      {loading && (
        <div className="flex items-center justify-center py-14">
          <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && lineup && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-f1light">
            {lineup.slots.map((slot) => {
              const options = eligibleFor(slot.slotType).filter(
                (r) => r.playerId === slot.playerId || !usedPlayerIds.has(r.playerId)
              )
              const selectedPlayer = slot.playerId ? rosterByPlayerId[slot.playerId]?.player : null
              return (
                <div
                  key={slot.slotType}
                  className={`px-4 py-3 flex items-center gap-3 flex-wrap ${slot.isEmpty ? 'bg-red-950/20' : ''}`}
                >
                  <span className="text-xs font-bold text-gray-400 w-28 flex-shrink-0">{SLOT_LABELS[slot.slotType] || slot.slotType}</span>
                  <select
                    className="input-field py-1.5 text-sm flex-1 min-w-[10rem]"
                    value={slot.playerId || ''}
                    disabled={busySlot === slot.slotType || lineup.lineupStatus === 'scored'}
                    onChange={(e) => assign(slot.slotType, e.target.value || null)}
                  >
                    <option value="">— Empty (−4 pts) —</option>
                    {options.map((r) => (
                      <option key={r.playerId} value={r.playerId}>
                        {r.player?.displayName} ({r.player?.nflTeam}{r.player?.byeWeek === week ? ' · BYE' : ''}{r.player?.injuryStatus ? ` · ${r.player.injuryStatus}` : ''})
                      </option>
                    ))}
                  </select>
                  <PlayerBadges player={selectedPlayer} week={week} />
                  {slot.wasSubstituted && <span className="text-[10px] text-yellow-400 flex-shrink-0">SWAPPED</span>}
                  {lineup.lineupStatus === 'scored' && !slot.isEmpty && (
                    <span className="text-sm font-bold text-blue-300 flex-shrink-0 w-14 text-right">{slot.slotPoints.toFixed(1)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && lineup && (
        <div>
          <h2 className="section-title flex items-center gap-2 text-sm"><Users className="w-4 h-4" /> Bench ({benchSlots.length})</h2>
          <div className="card p-0 overflow-hidden mt-2">
            <div className="divide-y divide-f1light">
              {benchSlots.map((r) => (
                <div key={r.id} className="px-4 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-300 truncate">
                      {r.player?.displayName} <span className="text-xs text-gray-500">({r.player?.position} · {r.player?.nflTeam})</span>
                    </p>
                  </div>
                  <PlayerBadges player={r.player} week={week} />
                </div>
              ))}
              {benchSlots.length === 0 && <p className="px-4 py-4 text-center text-gray-500 italic text-xs">Your entire roster is in the starting lineup.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
