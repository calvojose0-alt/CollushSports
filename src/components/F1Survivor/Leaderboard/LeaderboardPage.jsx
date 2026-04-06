import { useF1Game } from '@/hooks/useF1Game'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, Flame, Users, Medal } from 'lucide-react'
import { RACES_2026 } from '@/data/calendar2026'

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
  const { leaderboard, loading, currentRace, races, raceResults } = useF1Game()

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

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                    isMe ? 'bg-f1red/10' : 'hover:bg-f1light/30'
                  } ${player.status === 'eliminated' ? 'opacity-60' : ''}`}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    <RankBadge rank={rank} />
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                      player.status === 'alive' ? 'bg-f1red' : player.status === 'winner' ? 'bg-f1gold' : 'bg-f1light'
                    }`}
                  >
                    {player.displayName?.[0]?.toUpperCase() || '?'}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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

                  {/* Points */}
                  <div className="text-right flex-shrink-0">
                    <div className={`font-black text-lg ${player.points > 0 ? 'text-f1gold' : 'text-gray-600'}`}>
                      {player.points || 0}
                    </div>
                    <div className="text-xs text-gray-500">pts</div>
                  </div>

                  {/* Tiebreaker indicator */}
                  {player.tiebreaker && (
                    <Medal className="w-4 h-4 text-yellow-400 flex-shrink-0" />
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
