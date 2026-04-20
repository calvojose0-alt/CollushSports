import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGame } from '@/hooks/useWCGame'
import { Trophy, ChevronDown, ChevronUp, Target, Users, Zap, Globe } from 'lucide-react'
import { GROUP_LETTERS, WC_TEAMS } from '@/data/wc2026Teams'
import { getGroupMatches, getMatch } from '@/data/wc2026Schedule'

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-f1gold font-black text-lg">🥇</span>
  if (rank === 2) return <span className="text-f1silver font-black text-lg">🥈</span>
  if (rank === 3) return <span className="text-f1bronze font-black text-lg">🥉</span>
  return <span className="text-gray-500 font-semibold text-sm w-6 text-center">{rank}</span>
}

function PlayerRow({ player, rank, isMe, expanded, onToggle, myPicksByMatchId, resultsByMatchId }) {
  const gs = player.groupStageLeader
  const totalPts = (player.totalPoints || 0)
  const groupPts = totalPts - (player.playoffPoints || 0)

  return (
    <div className={`${isMe ? 'bg-yellow-900/10' : ''}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Rank */}
        <div className="w-8 flex-shrink-0 flex items-center justify-center">
          <RankBadge rank={rank} />
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-yellow-600">
          {player.displayName?.[0]?.toUpperCase() || '?'}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold text-sm ${isMe ? 'text-white' : 'text-gray-200'}`}>
              {player.displayName}
            </span>
            {isMe && (
              <span className="text-xs bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 px-1.5 py-0.5 rounded-full">
                You
              </span>
            )}
            {gs && (
              <span className="text-xs bg-green-900/50 text-green-300 border border-green-700 px-1.5 py-0.5 rounded-full font-bold">
                G
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
            <span>Exact: <strong className="text-green-400">{player.exactHits || 0}</strong></span>
            <span>Outcome: <strong className="text-blue-400">{player.outcomeHits || 0}</strong></span>
            {player.playoffPoints > 0 && (
              <span>Knockout: <strong className="text-yellow-400">+{player.playoffPoints}</strong></span>
            )}
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-f1light bg-f1dark hover:bg-f1light text-gray-400 hover:text-white text-xs transition-colors flex-shrink-0"
        >
          Picks {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Points */}
        <div className="text-right flex-shrink-0">
          <div className="font-black text-lg text-yellow-400">{totalPts}</div>
          <div className="text-xs text-gray-500">pts</div>
        </div>
      </div>

      {/* Expanded pick history */}
      {expanded && (
        <div className="mx-4 mb-3 rounded-xl border border-f1light bg-f1dark overflow-hidden">
          <div className="px-3 py-2 border-b border-f1light">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Scored Picks — {player.displayName}
            </p>
          </div>
          <PickHistory player={player} />
        </div>
      )}
    </div>
  )
}

function PickHistory({ player }) {
  const { allPicks, resultsByMatchId } = useWCGame()

  const scoredPicks = allPicks
    .filter((p) => p.userId === player.userId && p.pointsEarned !== null)
    .sort((a, b) => {
      // Sort by when the result was scored (most recent first), fall back to matchId
      const tA = resultsByMatchId[a.matchId]?.scoredAt?.seconds ?? 0
      const tB = resultsByMatchId[b.matchId]?.scoredAt?.seconds ?? 0
      return tB - tA || b.matchId.localeCompare(a.matchId)
    })
    .slice(0, 5)

  const totalScored = allPicks.filter((p) => p.userId === player.userId && p.pointsEarned !== null).length

  if (!scoredPicks.length) {
    return <p className="text-xs text-gray-500 px-4 py-3">No scored picks yet.</p>
  }

  return (
    <>
      <div className="divide-y divide-f1light">
        {scoredPicks.map((pick) => {
          const result = resultsByMatchId[pick.matchId]
          const matchData = getMatch(pick.matchId)
          const homeTeam = matchData ? WC_TEAMS[matchData.homeTeam] : null
          const awayTeam = matchData ? WC_TEAMS[matchData.awayTeam] : null
          const label = homeTeam && awayTeam
            ? `${homeTeam.flag} ${homeTeam.shortName} vs ${awayTeam.shortName} ${awayTeam.flag}`
            : pick.matchId
          return (
            <div key={pick.matchId} className="flex items-center gap-3 px-4 py-2">
              <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                Picked: <strong className="text-white">{pick.homeScore}–{pick.awayScore}</strong>
              </span>
              {result && (
                <span className="text-xs text-gray-500 flex-shrink-0">
                  Result: <strong className="text-gray-300">{result.homeScore}–{result.awayScore}</strong>
                </span>
              )}
              <span className={`ml-auto text-xs font-bold flex-shrink-0 ${
                pick.isExact ? 'text-green-400' :
                pick.isCorrectOutcome ? 'text-blue-400' : 'text-gray-600'
              }`}>
                {pick.isExact ? '⭐ Exact +5' :
                 pick.isCorrectOutcome ? '✓ Outcome +3' : '✗ 0 pts'}
              </span>
            </div>
          )
        })}
      </div>
      {totalScored > 5 && (
        <div className="px-4 py-2 border-t border-f1light">
          <span className="text-xs text-gray-600">Showing 5 most recent · {totalScored} total scored</span>
        </div>
      )}
    </>
  )
}

export default function WCLeaderboardPage() {
  const { user } = useAuth()
  const {
    leaderboard, players, loading, tournamentMeta,
    completedGroupMatches, totalGroupMatches,
    allPicks, resultsByMatchId,
  } = useWCGame()

  const [expandedPlayer, setExpandedPlayer] = useState(null)
  const [viewMode, setViewMode] = useState('overall') // 'overall' | 'group'
  const [selectedGroup, setSelectedGroup] = useState('A')

  const myRank = leaderboard.findIndex((p) => p.userId === user?.uid) + 1

  // Group leaderboard: filter by picks in that group
  const groupLeaderboard = (() => {
    if (viewMode !== 'group') return []
    const groupMatchIds = new Set(getGroupMatches(selectedGroup).map((m) => m.id))
    const ptsByUser = {}
    allPicks
      .filter((p) => groupMatchIds.has(p.matchId) && p.pointsEarned !== null)
      .forEach((p) => {
        if (!ptsByUser[p.userId]) ptsByUser[p.userId] = { points: 0, exact: 0 }
        ptsByUser[p.userId].points += p.pointsEarned
        if (p.isExact) ptsByUser[p.userId].exact++
      })

    return players
      .filter((p) => ptsByUser[p.userId])
      .map((p) => ({ ...p, groupPoints: ptsByUser[p.userId]?.points || 0, groupExact: ptsByUser[p.userId]?.exact || 0 }))
      .sort((a, b) => b.groupPoints - a.groupPoints || b.groupExact - a.groupExact)
  })()

  // Total scored picks
  const totalScoredPicks = allPicks.filter((p) => p.pointsEarned !== null).length

  if (loading) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-3" />
        Loading leaderboard…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-blue-800">Leaderboard</h2>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Rankings include everyone in the community. To see standings within your group of friends, go to <strong className="text-gray-300">My Groups</strong>.
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center">
          <Users className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-yellow-400">{players.length}</div>
          <div className="text-xs text-gray-400">Players</div>
        </div>
        <div className="card text-center">
          <Globe className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-blue-400">{completedGroupMatches}/{totalGroupMatches}</div>
          <div className="text-xs text-gray-400">Matches Played</div>
        </div>
        <div className="card text-center">
          <Target className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <div className="text-2xl font-black text-green-400">{totalScoredPicks}</div>
          <div className="text-xs text-gray-400">Picks Scored</div>
        </div>
        <div className="card text-center">
          <Zap className="w-5 h-5 text-f1gold mx-auto mb-1" />
          <div className="text-2xl font-black text-f1gold">#{myRank || '–'}</div>
          <div className="text-xs text-gray-400">Your Rank</div>
        </div>
      </div>

      {/* Champion banner */}
      {tournamentMeta?.tournamentFinished && leaderboard[0] && (
        <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/40 border border-yellow-700 rounded-2xl px-6 py-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-black text-yellow-400">{leaderboard[0].displayName}</h2>
          <p className="text-yellow-300 font-semibold">2026 World Cup Quiniela Champion</p>
          <p className="text-gray-400 text-sm mt-1">{leaderboard[0].totalPoints} total points</p>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('overall')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'overall' ? 'bg-yellow-600 text-white' : 'bg-f1dark border border-f1light text-gray-400 hover:text-white'
          }`}
        >
          Overall
        </button>
        <button
          onClick={() => setViewMode('group')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            viewMode === 'group' ? 'bg-yellow-600 text-white' : 'bg-f1dark border border-f1light text-gray-400 hover:text-white'
          }`}
        >
          By Group
        </button>
        {viewMode === 'group' && (
          <div className="flex gap-1">
            {GROUP_LETTERS.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  g === selectedGroup ? 'bg-yellow-600 text-white' : 'bg-f1dark border border-f1light text-gray-400'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-f1light flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h3 className="font-bold text-white">
            {viewMode === 'overall' ? 'Overall Standings' : `Group ${selectedGroup} Standings`}
          </h3>
        </div>

        {viewMode === 'overall' && (
          <>
            {/* Tiebreaker legend */}
            <div className="px-4 py-2 border-b border-f1light bg-f1dark/60 text-xs text-gray-500 flex gap-4 flex-wrap">
              <span>Tiebreakers: <strong className="text-gray-400">1)</strong> Total pts · <strong className="text-gray-400">2)</strong> Exact scores · <strong className="text-gray-400">3)</strong> Total goals guess</span>
              {tournamentMeta?.actualTotalGoals !== null && tournamentMeta?.actualTotalGoals !== undefined && (
                <span className="text-yellow-400">Actual total goals: <strong>{tournamentMeta.actualTotalGoals}</strong></span>
              )}
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No players yet.</div>
            ) : (
              <div className="divide-y divide-f1light">
                {leaderboard.map((player, idx) => (
                  <PlayerRow
                    key={player.id || player.userId}
                    player={player}
                    rank={idx + 1}
                    isMe={player.userId === user?.uid}
                    expanded={expandedPlayer === player.userId}
                    onToggle={() => setExpandedPlayer((p) => p === player.userId ? null : player.userId)}
                    resultsByMatchId={resultsByMatchId}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {viewMode === 'group' && (
          <>
            {groupLeaderboard.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No scored picks for this group yet.</div>
            ) : (
              <div className="divide-y divide-f1light">
                {groupLeaderboard.map((player, idx) => (
                  <div key={player.userId} className={`flex items-center gap-4 px-4 py-3 ${player.userId === user?.uid ? 'bg-yellow-900/10' : ''}`}>
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      <RankBadge rank={idx + 1} />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {player.displayName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-gray-200">{player.displayName}</span>
                      {player.userId === user?.uid && <span className="ml-2 text-xs text-yellow-400">(You)</span>}
                    </div>
                    <div className="text-right">
                      <div className="font-black text-yellow-400">{player.groupPoints}</div>
                      <div className="text-xs text-gray-500">{player.groupExact} exact</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
