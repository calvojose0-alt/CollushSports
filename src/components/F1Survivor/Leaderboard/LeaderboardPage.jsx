import { useState } from 'react'
import { useF1Game } from '@/hooks/useF1Game'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, Flame, Users, Medal, ChevronDown, ChevronUp } from 'lucide-react'
import { RACES_2026 } from '@/data/calendar2026'
import { DRIVER_MAP, SEASON_STANDINGS_2026 } from '@/data/drivers2026'

function StatusChip({ status }) {
  if (status === 'winner') return <span className="badge-winner">🏆 Champion</span>
  if (status === 'alive') return <span className="badge-alive">● Alive</span>
  if (status === 'eliminated') return <span className="badge-eliminated">✗ Out</span>
  return null
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-f1gold font-black text-lg">🥇</span>
  if (rank === 2) return <span className="text-f1silver font-black text-lg">🥈</span>
  if (rank === 3) return <span className="text-f1bronze font-black text-lg">🥉</span>
  return <span className="text-gray-500 font-semibold text-sm w-6 text-center">{rank}</span>
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const { leaderboard, loading, currentRace, races, raceResults, allPicks } = useF1Game()
  const [expandedPlayer, setExpandedPlayer] = useState(null)

  const togglePlayer = (playerId) =>
    setExpandedPlayer((prev) => (prev === playerId ? null : playerId))

  // Build per-player used driver sets, tracked separately per column
  const usedAByPlayer = {}
  const usedBByPlayer = {}
  allPicks.forEach(({ userId, columnA, columnB }) => {
    if (!usedAByPlayer[userId]) usedAByPlayer[userId] = new Set()
    if (!usedBByPlayer[userId]) usedBByPlayer[userId] = new Set()
    if (columnA?.driverId) usedAByPlayer[userId].add(columnA.driverId)
    if (columnB?.driverId) usedBByPlayer[userId].add(columnB.driverId)
  })

  // Get top 3 drivers still available in at least one column
  const getTopRemaining = (userId) => {
    const usedA = usedAByPlayer[userId] || new Set()
    const usedB = usedBByPlayer[userId] || new Set()
    return SEASON_STANDINGS_2026
      .filter((id) => !usedA.has(id) || !usedB.has(id))
      .slice(0, 3)
      .map((id) => {
        const driver = DRIVER_MAP[id]
        if (!driver) return null
        const availA = !usedA.has(id)
        const availB = !usedB.has(id)
        return { ...driver, availA, availB }
      })
      .filter(Boolean)
  }

  const alive = leaderboard.filter((p) => p.status === 'alive')
  const eliminated = leaderboard.filter((p) => p.status === 'eliminated')
  const winner = leaderboard.filter((p) => p.status === 'winner')

  const completedRaces = raceResults.length

  if (loading) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-f1red border-t-transparent rounded-full mx-auto mb-3" />
        Loading leaderboard…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-blue-800">Leaderboard</h2>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Users className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-green-400">{alive.length}</div>
          <div className="text-xs text-gray-400">Still Alive</div>
        </div>
        <div className="card text-center">
          <Flame className="w-5 h-5 text-f1red mx-auto mb-1" />
          <div className="text-2xl font-black text-f1red">{eliminated.length}</div>
          <div className="text-xs text-gray-400">Eliminated</div>
        </div>
        <div className="card text-center">
          <Trophy className="w-5 h-5 text-f1gold mx-auto mb-1" />
          <div className="text-2xl font-black text-f1gold">{completedRaces}</div>
          <div className="text-xs text-gray-400">Races Done</div>
        </div>
      </div>

      {/* Tiebreaker alert */}
      {alive.length === 2 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl px-4 py-3 flex items-center gap-2 text-yellow-300 text-sm">
          <Medal className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Tiebreaker Mode!</strong> Only 2 players remain. After the next race,
            the player with more points will be crowned Champion.
          </span>
        </div>
      )}

      {/* Champion banner */}
      {winner.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/40 border border-yellow-700 rounded-2xl px-6 py-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-f1gold">{winner[0].displayName}</h2>
          <p className="text-yellow-400 font-semibold">2026 F1 Survivor Champion</p>
          <p className="text-gray-400 text-sm mt-1">{winner[0].points} bonus points accumulated</p>
        </div>
      )}

      {/* Main leaderboard table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-f1light flex items-center gap-2">
          <Trophy className="w-4 h-4 text-f1gold" />
          <h2 className="font-bold text-white">Standings</h2>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No players yet. Be the first to join!
          </div>
        ) : (
          <div className="divide-y divide-f1light">
            {leaderboard.map((player, idx) => {
              const isMe = player.userId === user?.uid
              const rank = idx + 1

              const isExpanded = expandedPlayer === player.id
              const playerPicks = allPicks
                .filter((p) => p.userId === player.userId && p.resultA !== null)
                .sort((a, b) => a.raceId.localeCompare(b.raceId))

              return (
                <div key={player.id} className={`${isMe ? 'bg-f1red/10' : ''} ${player.status === 'eliminated' ? 'opacity-60' : ''}`}>
                  {/* Main row */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    {/* Rank */}
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      <RankBadge rank={rank} />
                    </div>

                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                      player.status === 'alive' ? 'bg-f1red' : player.status === 'winner' ? 'bg-f1gold' : 'bg-f1light'
                    }`}>
                      {player.displayName?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Name + status */}
                    <div className="min-w-0 w-32 flex-shrink-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${isMe ? 'text-white' : 'text-gray-200'}`}>
                          {player.displayName}
                        </span>
                        {isMe && (
                          <span className="text-xs bg-f1red/30 text-f1red border border-f1red/50 px-1.5 py-0.5 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <StatusChip status={player.status} />
                    </div>

                    {/* Past Results button */}
                    <button
                      onClick={() => togglePlayer(player.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-f1light bg-f1dark hover:bg-f1light text-gray-300 hover:text-white text-xs font-semibold transition-colors flex-shrink-0"
                      style={{ marginLeft: '-35px' }}
                    >
                      <span style={{ fontSize: 10 }}>Past Results</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Drivers still available */}
                    <div className="flex-1 min-w-0">
                      {player.status !== 'eliminated' && (
                        <>
                          <p className="text-xs text-gray-500 mb-1">Drivers Still Available</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {getTopRemaining(player.userId).map((driver) => (
                              <div key={driver.id} className="flex items-center gap-1">
                                <span className="text-xs font-semibold" style={{ color: driver.teamColor }}>
                                  {driver.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({driver.availA && driver.availB ? 'Podium & Top 10' : driver.availA ? 'Podium Pick' : 'Top 10 Pick'})
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <div className={`font-black text-lg ${player.points > 0 ? 'text-f1gold' : 'text-gray-600'}`}>
                        {player.points || 0}
                      </div>
                      <div className="text-xs text-gray-500">pts</div>
                    </div>

                    {player.tiebreaker && <Medal className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                  </div>

                  {/* Expanded: Past Race Results */}
                  {isExpanded && (
                    <div className="mx-4 mb-3 rounded-xl border border-f1light bg-f1dark overflow-hidden">
                      <div className="px-4 py-2 border-b border-f1light">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Past Race Results — {player.displayName}</p>
                      </div>
                      {playerPicks.length === 0 ? (
                        <p className="text-xs text-gray-500 px-4 py-3">No completed races yet.</p>
                      ) : (
                        <div>
                          {/* Column headers */}
                          <div className="flex items-center gap-4 px-4 py-2 border-b border-f1light bg-f1gray/40">
                            <div className="w-20 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-white font-bold uppercase tracking-wider">Podium Pick</p>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-white font-bold uppercase tracking-wider">Top 10 Pick</p>
                            </div>
                            <div className="w-16 flex-shrink-0" />
                          </div>
                          <div className="divide-y divide-f1light">
                          {playerPicks.map((pick) => {
                            const race = RACES_2026.find((r) => r.id === pick.raceId)
                            const driverA = DRIVER_MAP[pick.columnA?.driverId]
                            const driverB = DRIVER_MAP[pick.columnB?.driverId]
                            return (
                              <div key={pick.raceId} className="flex items-center gap-4 px-4 py-2.5">
                                {/* Race */}
                                <div className="w-20 flex-shrink-0 flex items-center gap-1.5">
                                  <p className="text-xs text-gray-500">R{race?.round}</p>
                                  <p className="text-xs font-bold text-white">{race?.flag} {race?.shortName}</p>
                                </div>
                                {/* Podium Pick */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5">
                                    {driverA && (
                                      <span className="text-xs font-semibold" style={{ color: driverA.teamColor }}>
                                        {driverA.name}
                                      </span>
                                    )}
                                    <span className={`text-xs font-bold ${pick.resultA === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                      {pick.resultA === 'success' ? '✓' : '✗'}
                                    </span>
                                  </div>
                                </div>
                                {/* Top 10 Pick */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5">
                                    {driverB && (
                                      <span className="text-xs font-semibold" style={{ color: driverB.teamColor }}>
                                        {driverB.name}
                                      </span>
                                    )}
                                    <span className={`text-xs font-bold ${pick.resultB === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                      {pick.resultB === 'success' ? '✓' : '✗'}
                                    </span>
                                  </div>
                                </div>
                                {/* Outcome */}
                                <div className="w-16 flex-shrink-0 text-right">
                                  {pick.pointEarned && <span className="text-xs text-f1gold font-bold">+1 pt</span>}
                                  {pick.survived === false && <span className="text-xs text-red-400 font-bold">Eliminated</span>}
                                </div>
                              </div>
                            )
                          })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Points explanation */}
      <div className="text-xs text-gray-500 bg-f1dark border border-f1light rounded-xl px-4 py-3">
        <strong className="text-gray-400">Points:</strong> Earn 1 point when <em>both</em> your picks
        succeed in the same race (Podium Pick + Top 10 Pick). Points don't affect survival —
        they break ties when 2 or fewer players remain.
      </div>
    </div>
  )
}
