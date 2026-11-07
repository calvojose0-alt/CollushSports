import { useWinLeague } from '@/hooks/useWinLeague'
import { useAuth } from '@/hooks/useAuth'
import { Globe, TrendingUp, Trophy, AlertCircle } from 'lucide-react'
import { WC_TEAMS } from '@/data/wc2026Teams'
import { WL_ROUNDS, WL_ROUND_ORDER } from '@/data/wl2026Rankings'
import { GROUP_MATCHES } from '@/data/wc2026Schedule'

// Map matchId to its group-stage match info
const GROUP_MATCH_BY_ID = {}
for (const m of GROUP_MATCHES) GROUP_MATCH_BY_ID[m.id] = m

function ResultDot({ result }) {
  if (result === 'win')  return <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">W</span>
  if (result === 'draw') return <span className="w-5 h-5 rounded-full bg-yellow-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">D</span>
  if (result === 'loss') return <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">L</span>
  return <span className="w-5 h-5 rounded-full border border-gray-700 flex-shrink-0" />
}

function getMatchOutcome(teamId, result) {
  const gm = GROUP_MATCH_BY_ID[result.matchId]
  let isHome = false, isAway = false

  if (gm) {
    isHome = gm.homeTeam === teamId
    isAway = gm.awayTeam === teamId
  } else {
    isHome = result.homeTeam === teamId
    isAway = result.awayTeam === teamId
  }

  if (!isHome && !isAway) return null

  const hs = result.homeScore ?? 0
  const as = result.awayScore ?? 0

  const outcome = hs === as ? 'draw'
    : (isHome && hs > as) || (isAway && as > hs) ? 'win' : 'loss'

  const pts = outcome === 'win' ? 3 : outcome === 'draw' ? 1 : 0
  const homeTeamInfo  = WC_TEAMS[gm?.homeTeam || result.homeTeam]
  const awayTeamInfo  = WC_TEAMS[gm?.awayTeam || result.awayTeam]

  return {
    matchId: result.matchId,
    outcome,
    pts,
    score: `${hs}–${as}`,
    opponent: isHome
      ? (awayTeamInfo?.shortName || 'OPP')
      : (homeTeamInfo?.shortName || 'OPP'),
    opponentFlag: isHome ? (awayTeamInfo?.flag || '') : (homeTeamInfo?.flag || ''),
    stage: result.matchId?.startsWith('gs_') ? 'Group Stage' : 'Knockout',
  }
}

function TeamCard({ pick, matchResults, advancements }) {
  const team = WC_TEAMS[pick.teamId]
  if (!team) return null

  // All finished matches involving this team
  const teamMatches = matchResults
    .filter((r) => r.status === 'final')
    .map((r) => getMatchOutcome(pick.teamId, r))
    .filter(Boolean)

  const matchPts    = teamMatches.reduce((s, m) => s + m.pts, 0)
  const wins        = teamMatches.filter((m) => m.outcome === 'win').length
  const draws       = teamMatches.filter((m) => m.outcome === 'draw').length
  const losses      = teamMatches.filter((m) => m.outcome === 'loss').length

  // Advancement
  const teamAdv     = advancements.filter((a) => a.teamId === pick.teamId)
  const advPts      = teamAdv.length * 2
  const roundsReached = teamAdv
    .map((a) => WL_ROUNDS.find((r) => r.id === a.round))
    .filter(Boolean)
    .sort((a, b) => WL_ROUND_ORDER.indexOf(a.id) - WL_ROUND_ORDER.indexOf(b.id))

  const isChampion  = teamAdv.some((a) => a.round === 'champion')
  const totalPts    = matchPts + advPts

  return (
    <div className={`card overflow-hidden border ${isChampion ? 'border-yellow-600' : 'border-f1light'}`}>
      {/* Team header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ background: `linear-gradient(90deg, ${team.color}22, transparent)` }}
      >
        <span className="text-3xl leading-none">{team.flag}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-white text-base">{team.name}</h3>
            {isChampion && <span className="text-xs bg-yellow-800/60 text-yellow-300 border border-yellow-600 px-2 py-0.5 rounded-full font-bold">🏆 Champion</span>}
          </div>
          <p className="text-xs text-gray-400">{team.confed} · Group {team.group}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-black" style={{ color: team.color !== '#000000' ? team.color : '#9ca3af' }}>
            {totalPts}
          </p>
          <p className="text-[10px] text-gray-500">total pts</p>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="px-4 py-3 border-t border-f1light grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Match Points</p>
          <p className="text-lg font-black text-white">{matchPts} <span className="text-xs text-gray-500 font-normal">pts</span></p>
          <p className="text-xs text-gray-400">{wins}W · {draws}D · {losses}L</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Advancement Bonus</p>
          <p className="text-lg font-black text-emerald-400">{advPts} <span className="text-xs text-gray-500 font-normal">pts</span></p>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {roundsReached.map((r) => (
              <span key={r.id} className="text-[10px] bg-emerald-900/40 text-emerald-300 border border-emerald-800 px-1.5 rounded font-semibold">
                {r.shortLabel}
              </span>
            ))}
            {roundsReached.length === 0 && <span className="text-[10px] text-gray-600">None yet</span>}
          </div>
        </div>
      </div>

      {/* Match history */}
      {teamMatches.length > 0 && (
        <div className="border-t border-f1light">
          <p className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Match History</p>
          <div className="divide-y divide-f1light">
            {teamMatches.map((m) => (
              <div key={m.matchId} className="px-4 py-2 flex items-center gap-3">
                <ResultDot result={m.outcome} />
                <span className="text-xs text-gray-400 flex-shrink-0">{m.opponentFlag} {m.opponent}</span>
                <span className="text-xs font-semibold text-gray-300 ml-auto">{m.score}</span>
                <span className={`text-xs font-bold w-10 text-right ${m.pts === 3 ? 'text-green-400' : m.pts === 1 ? 'text-yellow-400' : 'text-gray-600'}`}>
                  +{m.pts}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {teamMatches.length === 0 && (
        <div className="px-4 py-3 border-t border-f1light text-xs text-gray-600 italic">
          No matches recorded yet.
        </div>
      )}
    </div>
  )
}

export default function MyTeamsPage() {
  const { user } = useAuth()
  const { myPicks, picks, advancements, matchResults, session, myPlayer, players, leaderboard } = useWinLeague()

  const draftDone = session?.status === 'locked' || session?.status === 'complete' || session?.status === 'active'

  if (!myPlayer) {
    return (
      <div className="card text-center py-14 space-y-3">
        <Globe className="w-12 h-12 text-gray-600 mx-auto" />
        <h2 className="text-lg font-bold text-white">You're Not In This Game</h2>
        <p className="text-gray-400 text-sm">
          Go to the <strong className="text-white">Draft</strong> tab to join when registration is open.
        </p>
      </div>
    )
  }

  if (!draftDone && myPicks.length === 0) {
    return (
      <div className="card text-center py-14 space-y-3">
        <Globe className="w-10 h-10 text-gray-600 mx-auto" />
        <h2 className="text-base font-bold text-white">Draft hasn't started yet</h2>
        <p className="text-gray-400 text-sm">Your team cards will appear here once you've made your picks.</p>
      </div>
    )
  }

  // My rank
  const myRank = leaderboard.findIndex((p) => p.userId === user?.uid) + 1
  const myLeaderboardRow = leaderboard.find((p) => p.userId === user?.uid)
  const totalMatchPts  = myLeaderboardRow?.matchPoints ?? 0
  const totalAdvPts    = myLeaderboardRow?.advancePoints ?? 0
  const totalPts       = totalMatchPts + totalAdvPts

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="card bg-gradient-to-br from-emerald-900/30 to-transparent border-emerald-700/30">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-black text-emerald-400">{totalPts}</p>
            <p className="text-xs text-gray-400">Total Pts</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">{totalMatchPts}</p>
            <p className="text-xs text-gray-400">Match Pts</p>
          </div>
          <div>
            <p className="text-2xl font-black text-yellow-400">{totalAdvPts}</p>
            <p className="text-xs text-gray-400">Adv. Bonus</p>
          </div>
          <div>
            <p className="text-2xl font-black text-white">#{myRank || '—'}</p>
            <p className="text-xs text-gray-400">Rank</p>
          </div>
        </div>
      </div>

      {/* Pending picks */}
      {!draftDone && myPicks.length < (session?.picksPerPlayer ?? 3) && (
        <div className="flex items-center gap-2 text-sm text-yellow-300 bg-yellow-900/20 border border-yellow-700 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          You have {(session?.picksPerPlayer ?? 3) - myPicks.length} more pick(s) remaining. Go to the <strong className="mx-1">Draft</strong> tab when it's your turn.
        </div>
      )}

      {/* Team cards */}
      <div className="space-y-4">
        {myPicks.sort((a, b) => a.pickNumber - b.pickNumber).map((pick) => (
          <TeamCard
            key={pick.teamId}
            pick={pick}
            matchResults={matchResults}
            advancements={advancements}
          />
        ))}
      </div>
    </div>
  )
}
