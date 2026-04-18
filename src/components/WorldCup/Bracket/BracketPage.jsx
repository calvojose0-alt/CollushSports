import { useState, useMemo, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGame } from '@/hooks/useWCGame'
import { savePlayoffPick } from '@/services/firebase/wc2026Service'
import { WC_TEAMS, GROUP_LETTERS, isPicksLocked, SCORING } from '@/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '@/data/wc2026Schedule'
import { computeGroupStandings } from '@/services/gameEngine/wc2026Engine'
import { Save, Loader, Lock, Info, CheckCircle2, AlertCircle, Trophy, Users, Globe } from 'lucide-react'
import TournamentCountdown from '@/components/WorldCup/TournamentCountdown'

// ── Layout constants ───────────────────────────────────────────────────────────
const CARD_H   = 80    // px – match card height
const GAP      = 6     // px – gap between consecutive R32 cards
const UNIT     = CARD_H + GAP   // 86px per bracket slot
const TOTAL_H  = 16 * UNIT      // 1376px
const COL_W    = 186            // px – match card column width
const CONN_W   = 44             // px – connector SVG width
const HDR_H    = 36             // px – column header height

// Top-edge position of a match card (roundIdx 0=R32…4=Final, matchIdx 0-based)
function cardTop(roundIdx, matchIdx) {
  const step = UNIT * Math.pow(2, roundIdx)
  const offset = roundIdx === 0 ? 0 : (step - UNIT) / 2
  return matchIdx * step + offset
}

const STAGE_ROUND_IDX = { r32: 0, r16: 1, qf: 2, sf: 3, final: 4 }
const STAGE_LABELS    = {
  r32: 'Round of 32', r16: 'Round of 16',
  qf:  'Quarterfinals', sf: 'Semifinals', final: 'Final',
}
const STAGE_SCORING = {
  r16: SCORING.PLAYOFF_R16, qf: SCORING.PLAYOFF_QF,
  sf: SCORING.PLAYOFF_SF, winner: SCORING.PLAYOFF_WINNER,
}

// ── Resolve a slot label to a teamId ──────────────────────────────────────────
// slot: '1A', '2B', 'W_r32_1', '3ABCDF' (best 3rd from those groups), 'L_sf_1' etc.
function resolveSlot(slot, slotMap, picks) {
  if (!slot) return null
  if (slot.startsWith('W_')) {
    const matchId = 'ko_' + slot.slice(2)
    return picks[matchId] || null
  }
  if (slot.startsWith('3rd') || slot.startsWith('L_')) return null
  return slotMap[slot] || null  // handles 1X, 2X, and 3XXXX (best-3rd) slots
}

// Format a TBD slot label for display
function formatSlotLabel(slot) {
  if (!slot) return 'TBD'
  if (slot.startsWith('W_')) return 'TBD'
  if (/^3[A-L]{2,}/.test(slot)) return `Best 3rd · Grp ${slot.slice(1)}`
  if (slot.startsWith('3rd')) return 'Best 3rd'
  if (slot.startsWith('L_')) return 'Semifinal loser'
  // '1A', '2B' etc. — will already be resolved to a team; this is a fallback
  return slot
}

// Cascade-clear downstream picks when a team is removed from a match
function cascadeClear(matchId, removedTeam, picks) {
  const nextStage =
    matchId.includes('_r32_') ? 'r16' :
    matchId.includes('_r16_') ? 'qf' :
    matchId.includes('_qf_')  ? 'sf' :
    matchId.includes('_sf_')  ? 'final' : null
  if (!nextStage) return
  const numMatch = matchId.match(/_(\d+)$/)?.[1]
  if (!numMatch) return
  const nextNum = Math.ceil(parseInt(numMatch) / 2)
  const nextId  = `ko_${nextStage}_${nextNum}`
  if (picks[nextId] === removedTeam) {
    picks[nextId] = null
    cascadeClear(nextId, removedTeam, picks)
  }
}

// ── SVG connectors between two adjacent bracket columns ───────────────────────
function BracketConnector({ fromRoundIdx, pairCount }) {
  const elems = []
  for (let i = 0; i < pairCount; i++) {
    const y0 = cardTop(fromRoundIdx, i * 2)     + CARD_H / 2
    const y1 = cardTop(fromRoundIdx, i * 2 + 1) + CARD_H / 2
    const yd = cardTop(fromRoundIdx + 1, i)      + CARD_H / 2
    const mx = CONN_W / 2
    elems.push(
      <g key={i} stroke="#374151" strokeWidth="1.5" fill="none">
        <line x1="0"     y1={y0} x2={mx}    y2={y0} />
        <line x1="0"     y1={y1} x2={mx}    y2={y1} />
        <line x1={mx}    y1={y0} x2={mx}    y2={y1} />
        <line x1={mx}    y1={yd} x2={CONN_W} y2={yd} />
      </g>
    )
  }
  return (
    <svg
      width={CONN_W}
      height={TOTAL_H + HDR_H}
      style={{ flexShrink: 0, marginTop: HDR_H }}
      aria-hidden="true"
    >
      {elems}
    </svg>
  )
}

// ── Team slot within a match card ─────────────────────────────────────────────
// resultStatus: 'correct' | 'wrong' | 'actual-winner' | 'eliminated' | null
// actualWinnerId: teamId of the actual match winner (shown beside wrong picks)
function TeamSlot({ teamId, slotLabel, selected, clickable, onClick, resultStatus, actualWinnerId }) {
  const team         = teamId         ? WC_TEAMS[teamId]         : null
  const actualWinner = actualWinnerId ? WC_TEAMS[actualWinnerId] : null

  // Background / text color based on result state
  let colorClass
  if (selected) {
    colorClass = resultStatus === 'correct'  ? 'bg-green-500/30 text-white'
               : resultStatus === 'wrong'    ? 'bg-red-500/25 text-white'
               : 'bg-yellow-500/30 text-white'
  } else if (resultStatus === 'actual-winner') {
    colorClass = 'bg-green-500/10 text-green-300'
  } else if (resultStatus === 'eliminated') {
    colorClass = 'text-gray-600 opacity-50'
  } else {
    colorClass = team && clickable ? 'hover:bg-white/5 text-gray-200' : 'text-gray-500'
  }

  // Pick indicator icon
  const indicator = selected
    ? resultStatus === 'correct' ? <span className="ml-auto text-green-400 text-[9px] font-bold">✓</span>
    : resultStatus === 'wrong'   ? <span className="ml-auto text-red-400   text-[9px] font-bold">✗</span>
    :                              <span className="ml-auto text-yellow-400 text-[8px]">▶</span>
    : resultStatus === 'actual-winner'
      ? <span className="ml-auto text-green-400 text-[9px] font-bold">✓</span>
      : null

  // Wrong pick: show struck-through picked team + actual winner beside it
  const showWrongWithWinner = selected && resultStatus === 'wrong' && actualWinner

  return (
    <div
      onClick={clickable && teamId ? onClick : undefined}
      className={`flex items-center gap-1 px-2 transition-colors
        ${clickable && teamId ? 'cursor-pointer' : 'cursor-default'}
        ${colorClass}
      `}
      style={{ height: (CARD_H - 28) / 2 }}
    >
      {team ? (
        showWrongWithWinner ? (
          // Wrong pick: ~~MEX~~ → 🇿🇦 RSA ✗
          <>
            <span className="text-[12px] leading-none flex-shrink-0 opacity-40">{team.flag}</span>
            <span className="text-[10px] font-semibold line-through text-gray-600 flex-shrink-0">{team.shortName}</span>
            <span className="text-[8px] text-gray-400 flex-shrink-0">→</span>
            <span className="text-[12px] leading-none flex-shrink-0">{actualWinner.flag}</span>
            <span className="text-[10px] font-bold text-white truncate">{actualWinner.shortName}</span>
            <span className="ml-auto text-red-400 text-[9px] font-bold flex-shrink-0">✗</span>
          </>
        ) : (
          <>
            <span className="text-[13px] leading-none flex-shrink-0">{team.flag}</span>
            <span className="text-[11px] font-semibold truncate">{team.shortName}</span>
            {indicator}
          </>
        )
      ) : (
        <>
          <span className="w-3.5 h-3.5 rounded-full bg-gray-700 flex-shrink-0" />
          <span className="text-[9px] text-gray-600 truncate">{formatSlotLabel(slotLabel)}</span>
        </>
      )}
    </div>
  )
}

// ── Match card ────────────────────────────────────────────────────────────────
function MatchCard({ match, homeTeamId, awayTeamId, picked, onPick, locked, isR32, communityStats, result }) {
  const fmtDate = (d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
  const fmtTime = (t) => t || ''
  const venue   = match.venue || ''
  const [showCommunity, setShowCommunity] = useState(false)

  const canPick = !locked
  const hasCommunity = communityStats && communityStats.total > 0

  // ── Scoring overlay (all rounds, including R32) ───────────────────────────
  // Convention: admin saves winner as homeTeam with homeScore=1, awayScore=0
  const resultKnown  = result?.status === 'final' && !!result?.homeTeam
  const actualWinner = resultKnown
    ? (result.homeScore > result.awayScore ? result.homeTeam : result.awayTeam)
    : null

  const pickCorrect = !!(picked && actualWinner && picked === actualWinner)
  const pickWrong   = !!(picked && actualWinner && picked !== actualWinner)

  // Per-slot result status
  const homeResultStatus = (resultKnown && homeTeamId)
    ? homeTeamId === actualWinner
      ? (picked === homeTeamId ? 'correct' : 'actual-winner')
      : (picked === homeTeamId ? 'wrong'   : 'eliminated')
    : null
  const awayResultStatus = (resultKnown && awayTeamId)
    ? awayTeamId === actualWinner
      ? (picked === awayTeamId ? 'correct' : 'actual-winner')
      : (picked === awayTeamId ? 'wrong'   : 'eliminated')
    : null

  // Card border & background:
  // - When result is known: green/red overlay applies to ALL rounds (including R32)
  // - Before result: R32 keeps its subdued look; R16+ shows yellow when picked
  const borderColor = resultKnown
    ? pickCorrect ? '#22C55E' : pickWrong ? '#EF4444' : '#4B5563'
    : isR32 ? '#374151'
    : picked ? '#CA8A04' : '#4B5563'
  const cardBg = resultKnown
    ? pickCorrect ? 'rgba(20,83,45,0.22)' : pickWrong ? 'rgba(127,29,29,0.20)' : '#1F2937'
    : isR32 ? 'rgba(17,24,39,0.85)'
    : '#1F2937'

  return (
    <div className="relative">
      <div
        className="border rounded overflow-hidden flex flex-col select-none"
        style={{ height: CARD_H, borderColor, background: cardBg }}
      >
        {/* Venue + community toggle */}
        <div className="px-2 flex items-center flex-shrink-0 bg-gray-900/60 border-b border-gray-700/50"
          style={{ height: 14 }}>
          <span className="text-[8px] text-gray-500 uppercase tracking-wide truncate flex-1">{venue}</span>
          {hasCommunity && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowCommunity(v => !v) }}
              className="flex items-center gap-0.5 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 ml-1"
            >
              <Users className="w-2 h-2" />
              <span className="text-[7px]">{communityStats.total}</span>
            </button>
          )}
        </div>

        {/* Home team */}
        <TeamSlot
          teamId={homeTeamId}
          slotLabel={match.homeSlot}
          selected={picked === homeTeamId && !!homeTeamId}
          clickable={canPick}
          onClick={() => onPick(homeTeamId)}
          resultStatus={homeResultStatus}
          actualWinnerId={homeResultStatus === 'wrong' ? actualWinner : null}
        />

        {/* Divider */}
        <div className="border-t border-gray-700/40 flex-shrink-0" />

        {/* Away team */}
        <TeamSlot
          teamId={awayTeamId}
          slotLabel={match.awaySlot}
          selected={picked === awayTeamId && !!awayTeamId}
          clickable={canPick}
          onClick={() => onPick(awayTeamId)}
          resultStatus={awayResultStatus}
          actualWinnerId={awayResultStatus === 'wrong' ? actualWinner : null}
        />

        {/* Date / time  — or result badge when result is known */}
        <div className="px-2 flex items-center justify-between flex-shrink-0 bg-gray-900/40 border-t border-gray-700/40"
          style={{ height: 14 }}>
          {resultKnown ? (
            <>
              <span className={`text-[8px] font-bold ${
                pickCorrect ? 'text-green-400' : pickWrong ? 'text-red-400' : 'text-gray-500'
              }`}>
                {pickCorrect ? '✓ Correct' : pickWrong ? '✗ Wrong' : '● Final'}
              </span>
              <span className="text-[8px] text-gray-400">
                {WC_TEAMS[actualWinner]?.flag} wins
              </span>
            </>
          ) : (
            <>
              <span className="text-[8px] text-gray-600">{fmtDate(match.date)}</span>
              <span className="text-[8px] text-gray-600">{fmtTime(match.time)}</span>
            </>
          )}
        </div>
      </div>

      {/* Community picks popover — floats below card */}
      {showCommunity && hasCommunity && (
        <div
          className="absolute left-0 right-0 z-10 rounded-b border border-t-0 border-gray-600 bg-gray-900 px-2 py-1.5 shadow-lg"
          style={{ top: CARD_H }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-green-700">{communityStats.homePct}%</span>
              <span className="text-[9px] text-gray-500">{communityStats.homeTeam?.shortName}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500">{communityStats.awayTeam?.shortName}</span>
              <span className="text-[10px] font-bold text-red-700">{communityStats.awayPct}%</span>
            </div>
          </div>
          <div className="flex rounded-full overflow-hidden h-1">
            {communityStats.homePct > 0 && <div className="bg-green-700" style={{ width: `${communityStats.homePct}%` }} />}
            {communityStats.awayPct  > 0 && <div className="bg-red-700"   style={{ width: `${communityStats.awayPct}%` }} />}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bracket column ────────────────────────────────────────────────────────────
function BracketColumn({ stage, matches, slotMap, bracketPicks, onPick, locked, allPlayoffPicks, resultsByMatchId }) {
  const roundIdx = STAGE_ROUND_IDX[stage]
  const isR32    = stage === 'r32'

  // For each bracket match, count how many users picked each team to advance.
  // allPlayoffPicks entries: { userId, round, teamIds: [teamId, ...] }
  // R32 match winner → appears in user's 'r16' teamIds
  // R16 match winner → appears in user's 'qf' teamIds
  // QF match winner  → appears in user's 'sf' teamIds
  // SF/Final winner  → appears in user's 'winner' teamIds
  const advancementRound = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'winner', final: 'winner' }

  const communityStatsByMatch = useMemo(() => {
    const nextRound = advancementRound[stage]
    // Build per-user set of teams they picked to advance to nextRound
    const userSets = {}
    allPlayoffPicks.forEach(p => {
      if (p.round === nextRound) {
        userSets[p.userId] = new Set(p.teamIds || [])
      }
    })
    const userIds = Object.keys(userSets)
    const total   = userIds.length

    const stats = {}
    matches.forEach((m) => {
      const home = resolveSlot(m.homeSlot, slotMap, bracketPicks)
      const away = resolveSlot(m.awaySlot, slotMap, bracketPicks)
      if (!home || !away || total === 0) { stats[m.id] = { total: 0 }; return }

      let homePicked = 0, awayPicked = 0
      userIds.forEach(uid => {
        const s = userSets[uid]
        if (s.has(home))       homePicked++
        else if (s.has(away))  awayPicked++
      })
      const counted = homePicked + awayPicked
      if (counted === 0) { stats[m.id] = { total: 0 }; return }

      stats[m.id] = {
        total: counted,
        homePct: Math.round((homePicked / counted) * 100),
        drawPct: 0,
        awayPct: Math.round((awayPicked / counted) * 100),
        homeTeam: WC_TEAMS[home],
        awayTeam: WC_TEAMS[away],
      }
    })
    return stats
  }, [matches, slotMap, bracketPicks, allPlayoffPicks, stage])

  return (
    <div style={{ width: COL_W, flexShrink: 0 }}>
      {/* Header */}
      <div
        className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center border-b border-gray-700/60"
        style={{ height: HDR_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}
      >
        {STAGE_LABELS[stage]}
      </div>
      {/* Cards container */}
      <div className="relative" style={{ height: TOTAL_H }}>
        {matches.map((match, matchIdx) => {
          const homeTeamId = resolveSlot(match.homeSlot, slotMap, bracketPicks)
          const awayTeamId = resolveSlot(match.awaySlot, slotMap, bracketPicks)
          const picked     = bracketPicks[match.id] || null
          return (
            <div
              key={match.id}
              style={{ position: 'absolute', top: cardTop(roundIdx, matchIdx), left: 0, right: 0 }}
            >
              <MatchCard
                match={match}
                homeTeamId={homeTeamId}
                awayTeamId={awayTeamId}
                picked={picked}
                onPick={(teamId) => onPick(match.id, teamId)}
                locked={locked}
                isR32={isR32}
                communityStats={communityStatsByMatch[match.id]}
                result={resultsByMatchId?.[match.id] ?? null}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function PickProgress({ bracketPicks }) {
  const rounds = [
    { stage: 'r16',   matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'r32'), label: 'R16 picks',  total: 16 },
    { stage: 'qf',    matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'r16'), label: 'QF picks',   total: 8  },
    { stage: 'sf',    matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'qf'),  label: 'SF picks',   total: 4  },
    { stage: 'final', matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'sf'),  label: 'Final pick', total: 2  },
  ]
  return (
    <div className="flex gap-3 flex-wrap">
      {rounds.map(r => {
        const done = r.matches.filter(m => bracketPicks[m.id]).length
        const pct = Math.round((done / r.total) * 100)
        return (
          <div key={r.stage} className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{r.label}</span>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{done}/{r.total}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main bracket page ─────────────────────────────────────────────────────────
export default function BracketPage() {
  const { user }         = useAuth()
  const { myPicks, myPicksByMatchId, myPlayoffPicksByRound, refreshPicks, allPlayoffPicks, resultsByMatchId } = useWCGame()

  const locked = isPicksLocked()

  const [bracketPicks, setBracketPicks] = useState({})
  const [initialized, setInitialized]   = useState(false)
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState(null)

  // ── Build slot map: '1A'→teamId, '2B'→teamId, and '3XXXX'→best-3rd teamId ──
  // Prefers actual admin-entered results; falls back to user's group picks.
  const slotMap = useMemo(() => {
    const map = {}
    const allThirdPlace = []  // { group, teamId, pts, gd, gf }

    GROUP_LETTERS.forEach(group => {
      const groupMatchList = GROUP_MATCHES.filter(m => m.group === group)
      const picks = groupMatchList.map(m => {
        const actual = resultsByMatchId[m.id]
        const pred   = myPicksByMatchId[m.id]
        // Use actual result if the admin has scored it, otherwise use user's prediction
        const r = (actual?.homeScore != null && actual?.awayScore != null) ? actual : pred
        return {
          homeTeam:  m.homeTeam,
          awayTeam:  m.awayTeam,
          homeScore: r?.homeScore ?? null,
          awayScore: r?.awayScore ?? null,
        }
      })
      const standings = computeGroupStandings(group, picks)
      standings.forEach((s, idx) => { map[`${idx + 1}${group}`] = s.teamId })
      if (standings[2]) allThirdPlace.push({ group, ...standings[2] })
    })

    // Rank all 12 third-place teams; top 8 qualify for R32
    allThirdPlace.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    const qualified = allThirdPlace.slice(0, 8)

    // Collect the 8 unique 3XXXX slot codes from R32 matches
    const r32ThirdCodes = []
    KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
      if (/^3[A-L]{2,}/.test(m.homeSlot) && !r32ThirdCodes.includes(m.homeSlot)) r32ThirdCodes.push(m.homeSlot)
      if (/^3[A-L]{2,}/.test(m.awaySlot) && !r32ThirdCodes.includes(m.awaySlot)) r32ThirdCodes.push(m.awaySlot)
    })

    // Greedy assignment: best available qualified team whose group is eligible
    const assigned = new Set()
    for (const code of r32ThirdCodes) {
      const eligible = code.slice(1).split('')
      const pick = qualified.find(t => eligible.includes(t.group) && !assigned.has(t.teamId))
      if (pick) { map[code] = pick.teamId; assigned.add(pick.teamId) }
    }

    return map
  }, [myPicksByMatchId, resultsByMatchId])

  // ── Initialize bracket picks from saved playoff data (once) ───────────────
  useEffect(() => {
    if (initialized) return
    const r16Set    = new Set(myPlayoffPicksByRound.r16?.teamIds    || [])
    const qfSet     = new Set(myPlayoffPicksByRound.qf?.teamIds     || [])
    const sfSet     = new Set(myPlayoffPicksByRound.sf?.teamIds     || [])
    const winnerSet = new Set(myPlayoffPicksByRound.winner?.teamIds || [])
    const hasAny = r16Set.size || qfSet.size || sfSet.size || winnerSet.size

    // Only initialize once we have group picks or saved playoff picks
    if (!myPicks.length && !hasAny) return

    const newPicks = {}

    // R32 → r16
    KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, {})
      const away = resolveSlot(m.awaySlot, slotMap, {})
      if (home && r16Set.has(home)) newPicks[m.id] = home
      else if (away && r16Set.has(away)) newPicks[m.id] = away
    })
    // R16 → qf
    KNOCKOUT_MATCHES.filter(m => m.stage === 'r16').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, newPicks)
      const away = resolveSlot(m.awaySlot, slotMap, newPicks)
      if (home && qfSet.has(home)) newPicks[m.id] = home
      else if (away && qfSet.has(away)) newPicks[m.id] = away
    })
    // QF → sf
    KNOCKOUT_MATCHES.filter(m => m.stage === 'qf').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, newPicks)
      const away = resolveSlot(m.awaySlot, slotMap, newPicks)
      if (home && sfSet.has(home)) newPicks[m.id] = home
      else if (away && sfSet.has(away)) newPicks[m.id] = away
    })
    // SF → final
    const finalMatch = KNOCKOUT_MATCHES.find(m => m.stage === 'final')
    KNOCKOUT_MATCHES.filter(m => m.stage === 'sf').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, newPicks)
      const away = resolveSlot(m.awaySlot, slotMap, newPicks)
      if (home && winnerSet.has(home)) newPicks[m.id] = home
      else if (away && winnerSet.has(away)) newPicks[m.id] = away
    })
    // Final
    if (finalMatch) {
      const home = resolveSlot(finalMatch.homeSlot, slotMap, newPicks)
      const away = resolveSlot(finalMatch.awaySlot, slotMap, newPicks)
      if (home && winnerSet.has(home)) newPicks[finalMatch.id] = home
      else if (away && winnerSet.has(away)) newPicks[finalMatch.id] = away
    }

    setBracketPicks(newPicks)
    setInitialized(true)
  }, [myPlayoffPicksByRound, slotMap, initialized, myPicks.length])

  // ── Pick a winner for a match ─────────────────────────────────────────────
  const handlePick = useCallback((matchId, teamId) => {
    if (locked) return
    setBracketPicks(prev => {
      const next = { ...prev }
      const prev_winner = next[matchId]
      if (prev_winner === teamId) {
        // Toggle off
        next[matchId] = null
        cascadeClear(matchId, teamId, next)
      } else {
        if (prev_winner) cascadeClear(matchId, prev_winner, next)
        next[matchId] = teamId
      }
      return next
    })
  }, [locked])

  // ── Save all bracket picks ────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      // r32: all 32 teams — 1st + 2nd from each group + 8 best 3rd-place qualifiers
      const r32Teams = KNOCKOUT_MATCHES
        .filter(m => m.stage === 'r32')
        .flatMap(m => [
          resolveSlot(m.homeSlot, slotMap, {}),
          resolveSlot(m.awaySlot, slotMap, {}),
        ])
        .filter(Boolean)

      const r16Teams = KNOCKOUT_MATCHES.filter(m => m.stage === 'r32')
        .map(m => bracketPicks[m.id]).filter(Boolean)
      const qfTeams  = KNOCKOUT_MATCHES.filter(m => m.stage === 'r16')
        .map(m => bracketPicks[m.id]).filter(Boolean)
      const sfTeams  = KNOCKOUT_MATCHES.filter(m => m.stage === 'qf')
        .map(m => bracketPicks[m.id]).filter(Boolean)
      const finalM   = KNOCKOUT_MATCHES.find(m => m.stage === 'final')
      const winner   = finalM && bracketPicks[finalM.id] ? [bracketPicks[finalM.id]] : []

      await Promise.all([
        savePlayoffPick({ userId: user.uid, round: 'r32',    teamIds: r32Teams }),
        savePlayoffPick({ userId: user.uid, round: 'r16',    teamIds: r16Teams }),
        savePlayoffPick({ userId: user.uid, round: 'qf',     teamIds: qfTeams  }),
        savePlayoffPick({ userId: user.uid, round: 'sf',     teamIds: sfTeams  }),
        savePlayoffPick({ userId: user.uid, round: 'winner', teamIds: winner   }),
      ])
      await refreshPicks()
      setMsg({ type: 'success', text: 'Bracket saved!' })
      setTimeout(() => setMsg(null), 3000)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ── Count picks made ──────────────────────────────────────────────────────
  const r32PicksDone   = KNOCKOUT_MATCHES.filter(m => m.stage === 'r32' && bracketPicks[m.id]).length
  const finalPick      = bracketPicks[KNOCKOUT_MATCHES.find(m => m.stage === 'final')?.id]
  const champion       = finalPick ? WC_TEAMS[finalPick] : null

  // ── Build column data ─────────────────────────────────────────────────────
  const columns = ['r32', 'r16', 'qf', 'sf', 'final'].map(stage => ({
    stage,
    matches: KNOCKOUT_MATCHES.filter(m => m.stage === stage),
  }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-blue-800 text-lg">Knockout Bracket</h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Round of 32 is auto-filled from your group picks. Click teams to advance them.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!locked && <TournamentCountdown compact />}
          {locked && (
            <span className="flex items-center gap-1.5 text-xs text-red-300 bg-red-900/30 border border-red-700 px-3 py-1.5 rounded-lg">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
          {!locked && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-50 transition-colors"
            >
              {saving
                ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Bracket</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Champion banner */}
      {champion && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-900/30 border border-yellow-600/40">
          <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Your Predicted Champion</p>
            <p className="text-white font-bold">{champion.flag} {champion.name}</p>
          </div>
        </div>
      )}

      {/* Info + progress */}
      <div className="card space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400">
            Points per correctly predicted qualifier: &nbsp;
            <span className="text-yellow-400 font-semibold">R16 +{SCORING.PLAYOFF_R16}</span> ·
            <span className="text-yellow-400 font-semibold"> QF +{SCORING.PLAYOFF_QF}</span> ·
            <span className="text-yellow-400 font-semibold"> SF +{SCORING.PLAYOFF_SF}</span> ·
            <span className="text-yellow-400 font-semibold"> Champion +{SCORING.PLAYOFF_WINNER}</span>
          </p>
        </div>
        <PickProgress bracketPicks={bracketPicks} />
      </div>

      {/* Save message */}
      {msg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm border ${
          msg.type === 'success'
            ? 'bg-green-900/30 border-green-700 text-green-300'
            : 'bg-red-900/30 border-red-700 text-red-300'
        }`}>
          {msg.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle  className="w-4 h-4 flex-shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Note about R32 auto-fill */}
      {r32PicksDone < 12 && (
        <div className="card flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <span>
            R32 slots are filled from your <strong className="text-gray-300">Group Stage Picks</strong> predictions.
            Complete more group picks to see your predicted R32 matchups.
          </span>
        </div>
      )}

      {/* ── BRACKET ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-4">
        <div
          className="flex items-start"
          style={{ minWidth: columns.length * COL_W + (columns.length - 1) * CONN_W + 8 }}
        >
          {columns.map(({ stage, matches }, colIdx) => (
            <div key={stage} className="flex items-start">
              <BracketColumn
                stage={stage}
                matches={matches}
                slotMap={slotMap}
                bracketPicks={bracketPicks}
                onPick={handlePick}
                locked={locked}
                allPlayoffPicks={allPlayoffPicks}
                resultsByMatchId={resultsByMatchId}
              />
              {colIdx < columns.length - 1 && (
                <BracketConnector
                  fromRoundIdx={STAGE_ROUND_IDX[stage]}
                  pairCount={matches.length}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {locked && (
        <div className="card text-center py-6 text-gray-500">
          <Lock className="w-7 h-7 mx-auto mb-2 text-gray-600" />
          <p className="font-semibold text-white mb-1">Bracket is locked</p>
          <p className="text-sm">Your picks are saved and will be scored as the tournament progresses.</p>
        </div>
      )}
    </div>
  )
}
