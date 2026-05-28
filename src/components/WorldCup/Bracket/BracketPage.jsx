import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGameContext as useWCGame } from '@/contexts/WCGameContext'
import { savePlayoffPick, updateWCPlayer } from '@/services/firebase/wc2026Service'
import { WC_TEAMS, GROUP_LETTERS, isPicksLocked, SCORING } from '@/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '@/data/wc2026Schedule'
import { computeGroupStandings } from '@/services/gameEngine/wc2026Engine'
import { Save, Loader, Lock, CheckCircle2, AlertCircle, Trophy, Users, Globe } from 'lucide-react'
import TournamentCountdown from '@/components/WorldCup/TournamentCountdown'
import CountryFlag from '@/components/shared/CountryFlag'

// ── Layout constants ───────────────────────────────────────────────────────────
const CARD_H   = 104   // px – match card height
const GAP      = 8     // px – gap between consecutive R32 cards
const UNIT     = CARD_H + GAP   // 112px per bracket slot
const TOTAL_H  = 16 * UNIT      // 1792px
const COL_W    = 224            // px – match card column width
const CONN_W   = 54             // px – connector SVG width
const HDR_H    = 44             // px – column header height

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

// ── Per-team overall tournament status ────────────────────────────────────────
// Computes a single persistent status for a team that propagates through all
// bracket rounds. The status is determined once at group stage and then updated
// as knockout results come in:
//
//   alive-correct  — team qualified in the exact slot the user predicted
//                    AND has not yet lost a knockout match
//   alive-different — team qualified but at a different group/slot than predicted
//                    AND has not yet lost a knockout match
//   eliminated     — team didn't qualify from groups OR has lost a knockout match
//   unknown        — insufficient admin results to determine (group not done yet)
//
// This allows the dot to show the team's current real-world status no matter
// which bracket column they appear in — so users can instantly see which of
// their picks are still alive across the full bracket.
function computeTeamOverallStatus(teamId, {
  actualGroupSlotMap, groupsWithAllResults, allGroupsComplete, resultsByMatchId, slotMap,
}) {
  const team = WC_TEAMS[teamId]
  if (!team) return 'unknown'

  // ── Group qualification ────────────────────────────────────────────────────
  const teamGroup = team.group
  if (!groupsWithAllResults.has(teamGroup)) return 'unknown'

  // Only qualifying slots count: '1X'/'2X' (direct) or '3XXXX' (confirmed best-3rd).
  // actualGroupSlotMap also contains positional '3X'/'4X' keys from the standings
  // loop — these are not qualifying slots and must be excluded.
  const actualEntry = Object.entries(actualGroupSlotMap).find(([key, v]) => {
    if (v !== teamId) return false
    return /^[12][A-L]$/.test(key) || /^3[A-L]{2,}$/.test(key)
  })

  if (!actualEntry) {
    // Not in a qualifying slot. If team finished 3rd in their group but not all
    // groups are done yet, we can't confirm whether they're a best-3rd qualifier.
    const finishedThird = Object.entries(actualGroupSlotMap)
      .some(([key, v]) => v === teamId && /^3[A-L]$/.test(key))
    if (finishedThird && !allGroupsComplete) return 'unknown'
    return 'eliminated'
  }

  const actualSlot = actualEntry[0]

  // Determine path correctness by comparing actual group slot vs user's predicted slot
  const userSlot = Object.entries(slotMap).find(([, v]) => v === teamId)?.[0]
  const baseStatus = (userSlot && userSlot === actualSlot) ? 'alive-correct' : 'alive-different'

  // ── Trace actual knockout results ─────────────────────────────────────────
  // Walk the team's real tournament path. At each stage, find their actual match
  // (based on which slot they occupy) and check if they won it.
  // If they lost at any stage → eliminated.
  // If the stage hasn't been played yet → return current baseStatus (stop here).
  let currentSlot = actualSlot
  for (const stage of ['r32', 'r16', 'qf', 'sf', 'final']) {
    const match = KNOCKOUT_MATCHES.find(m =>
      m.stage === stage && (m.homeSlot === currentSlot || m.awaySlot === currentSlot)
    )
    if (!match) return baseStatus  // data gap — stop

    const result = resultsByMatchId?.[match.id]
    if (!result || result.status !== 'final' || !result.homeTeam) return baseStatus  // not played yet

    if (result.homeTeam !== teamId) return 'eliminated'  // team lost this match

    // Team won — advance slot to the next stage
    const matchNum = match.id.match(/_(\d+)$/)?.[1]
    currentSlot = `W_${stage}_${matchNum}`   // e.g. 'W_r32_5', 'W_r16_3', …
  }

  return baseStatus  // survived all rounds (champion!)
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
// resultStatus: 'correct' | 'wrong' | 'alive-wrong-path' | 'actual-winner' | 'eliminated' | null
// entryStatus:  'alive-correct' | 'alive-different' | 'eliminated' | 'unknown' | null
//               (pre-result indicator — is this team alive in the real tournament?)
// actualWinnerId: teamId of the actual match winner (shown beside wrong/eliminated picks)
function TeamSlot({ teamId, slotLabel, selected, clickable, onClick, resultStatus, actualWinnerId, entryStatus }) {
  const team         = teamId         ? WC_TEAMS[teamId]         : null
  const actualWinner = actualWinnerId ? WC_TEAMS[actualWinnerId] : null

  // Entry dot: only when there's no match result yet AND status is known
  const showEntryDot = !resultStatus && entryStatus && entryStatus !== 'unknown' && !!team
  const entryDotClass =
    entryStatus === 'alive-correct'   ? 'bg-green-400' :
    entryStatus === 'alive-different' ? 'bg-amber-400' :
    /* eliminated */                    'bg-red-500'

  // Dim non-selected teams that are eliminated before this match
  const preResultEliminated = showEntryDot && entryStatus === 'eliminated' && !selected

  // Text-only color — no background fills on any slot (Option C)
  let colorClass
  if (selected) {
    colorClass = resultStatus === 'correct'          ? 'text-green-400'
               : resultStatus === 'wrong'            ? 'text-red-400'
               : resultStatus === 'alive-wrong-path' ? 'text-amber-400'
               : 'text-white'   // pending pick
  } else if (resultStatus === 'actual-winner') {
    colorClass = 'text-green-400'
  } else if (resultStatus === 'eliminated') {
    colorClass = 'text-gray-500'  // post-result loser — dimmed, no bg
  } else if (preResultEliminated) {
    colorClass = 'text-white'   // pre-result eliminated — dot handles the signal
  } else {
    colorClass = team && clickable ? 'hover:bg-white/5 text-white' : 'text-gray-500'
  }

  // Pick indicator icon
  const indicator = selected
    ? resultStatus === 'correct'          ? <span className="ml-auto text-green-400 text-[11px] font-bold">✓</span>
    : resultStatus === 'wrong'            ? <span className="ml-auto text-red-400   text-[11px] font-bold">✗</span>
    : resultStatus === 'alive-wrong-path' ? <span className="ml-auto text-amber-400 text-[11px] font-bold">↺</span>
    :                                       <span className="ml-auto text-yellow-400 text-[10px]">▶</span>
    : resultStatus === 'actual-winner'
      ? <span className="ml-auto text-green-400 text-[11px] font-bold">✓</span>
      : null

  // 'wrong': show struck-through picked team + actual winner beside it (team is out)
  const showWrongWithWinner = selected && resultStatus === 'wrong' && actualWinner
  // 'alive-wrong-path': show team normally with amber ↺ — team IS still in tournament
  const showAliveDifferentSlot = selected && resultStatus === 'alive-wrong-path'

  return (
    <div
      onClick={clickable && teamId ? onClick : undefined}
      className={`flex items-center gap-1 px-2 transition-colors
        ${clickable && teamId ? 'cursor-pointer' : 'cursor-default'}
        ${colorClass}
      `}
      style={{ height: (CARD_H - 36) / 2 }}
    >
      {team ? (
        showWrongWithWinner ? (
          // Wrong pick: FRA (red) → GER (green) ✗  — no strikethrough, color tells the story
          <>
            <CountryFlag cc={team.cc} size={14} alt={team.name} />
            <span className="text-[12px] font-semibold text-red-400 flex-shrink-0">{team.shortName}</span>
            <span className="text-[10px] text-gray-500 flex-shrink-0">→</span>
            <CountryFlag cc={actualWinner.cc} size={14} alt={actualWinner.name} />
            <span className="text-[12px] font-bold text-green-400 truncate">{actualWinner.shortName}</span>
            <span className="ml-auto text-red-400 text-[11px] font-bold flex-shrink-0">✗</span>
          </>
        ) : showAliveDifferentSlot ? (
          // Different bracket slot — team still alive in actual tournament ↺
          <>
            <CountryFlag cc={team.cc} size={14} alt={team.name} />
            <span className="text-[13px] font-semibold truncate">{team.shortName}</span>
            <span className="ml-auto text-amber-400 text-[11px] font-bold flex-shrink-0">↺</span>
          </>
        ) : (
          // Normal render — pre-result dot + pick arrow; post-result text color only
          <>
            {showEntryDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entryDotClass}`} />}
            <CountryFlag cc={team.cc} size={14} alt={team.name} />
            <span className="text-[13px] font-semibold truncate">
              {team.shortName}
            </span>
            {indicator}
          </>
        )
      ) : (
        <>
          <span className="w-4 h-4 rounded-full bg-gray-500 flex-shrink-0" />
          <span className="text-[11px] text-gray-300 truncate">{formatSlotLabel(slotLabel)}</span>
        </>
      )}
    </div>
  )
}

// ── Match card ────────────────────────────────────────────────────────────────
function MatchCard({ match, homeTeamId, awayTeamId, picked, onPick, locked, isR32, communityStats, result, actualStageWinners, homeEntryStatus, awayEntryStatus }) {
  const fmtDate = (d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
  const fmtTime = (t) => t || ''
  const venueParts = (match.venue || '').split(',')
  const city    = [venueParts[1], venueParts[2]].filter(Boolean).map(s => s.trim()).join(', ')
  const [showCommunity, setShowCommunity] = useState(false)

  const canPick = !locked
  const hasCommunity = communityStats && communityStats.total > 0

  // ── Scoring overlay (all rounds, including R32) ───────────────────────────
  // Convention: admin always stores the winner as `homeTeam`.
  // homeScore/awayScore may be null for simulated matches, so we never use
  // score comparison — that would make null > null → false → awayTeam (loser) "win".
  const resultKnown  = result?.status === 'final' && !!result?.homeTeam
  const actualWinner = resultKnown ? result.homeTeam : null

  // 'alive-wrong-path': user's pick didn't win THIS slot, but that team DID
  // advance in the real tournament through a different bracket position.
  const pickCorrect        = !!(picked && actualWinner && picked === actualWinner)
  const pickAliveWrongPath = !!(picked && actualWinner && picked !== actualWinner && actualStageWinners?.has(picked))
  const pickWrong          = !!(picked && actualWinner && picked !== actualWinner && !actualStageWinners?.has(picked))

  // Per-slot result status
  // 'wrong'            → team was eliminated here (red)
  // 'alive-wrong-path' → team advanced but via a different bracket slot (amber)
  const slotStatus = (teamId, isSelected) => {
    if (!resultKnown || !teamId) return null
    if (teamId === actualWinner) return isSelected ? 'correct' : 'actual-winner'
    if (!isSelected) return 'eliminated'
    return actualStageWinners?.has(teamId) ? 'alive-wrong-path' : 'wrong'
  }
  const homeResultStatus = slotStatus(homeTeamId, picked === homeTeamId && !!homeTeamId)
  const awayResultStatus = slotStatus(awayTeamId, picked === awayTeamId && !!awayTeamId)

  // Card border & background — green / amber / neutral (no red tint for wrong picks)
  const borderColor = resultKnown
    ? pickCorrect        ? '#22C55E'
    : pickAliveWrongPath ? '#f59e0b'
    :                      '#4B5563'
    : isR32 ? '#374151'
    : picked ? '#CA8A04' : '#4B5563'
  const cardBg = isR32 ? 'rgba(17,24,39,0.85)' : '#1F2937'  // always dark — text color carries all result info

  return (
    <div className="relative">
      <div
        className="border rounded overflow-hidden flex flex-col select-none"
        style={{ height: CARD_H, borderColor, background: cardBg }}
      >
        {/* Venue + community toggle */}
        <div className="px-2 flex items-center flex-shrink-0 bg-gray-900/60 border-b border-gray-700/50"
          style={{ height: 18 }}>
          <span className="text-[10px] text-gray-300 uppercase tracking-wide truncate flex-1">{city}</span>
          {hasCommunity && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowCommunity(v => !v) }}
              className="flex items-center gap-0.5 text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
            >
              <Users className="w-2.5 h-2.5" />
              <span className="text-[9px]">{communityStats.total}</span>
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
          entryStatus={homeEntryStatus}
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
          entryStatus={awayEntryStatus}
        />


        {/* Date / time  — or result badge when result is known */}
        <div className="px-2 flex items-center justify-between flex-shrink-0 bg-gray-900/40 border-t border-gray-700/40"
          style={{ height: 18 }}>
          {resultKnown ? (
            <>
              <span className={`text-[10px] font-bold ${
                pickCorrect        ? 'text-green-400'
              : pickAliveWrongPath ? 'text-amber-400'
              : pickWrong         ? 'text-red-400'
              :                     'text-gray-500'
              }`}>
                {pickCorrect        ? '✓ Correct'
               : pickAliveWrongPath ? '↺ Different slot'
               : pickWrong         ? '✗ Wrong'
               :                     '● Final'}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <CountryFlag cc={WC_TEAMS[actualWinner]?.cc} size={12} alt={WC_TEAMS[actualWinner]?.name} /> wins
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-gray-300">{fmtDate(match.date)}</span>
              <span className="text-[10px] text-gray-300">{fmtTime(match.time)}</span>
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
              <span className="text-[11px] font-bold text-green-700">{communityStats.homePct}%</span>
              <span className="text-[10px] text-gray-500">{communityStats.homeTeam?.shortName}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">{communityStats.awayTeam?.shortName}</span>
              <span className="text-[11px] font-bold text-red-700">{communityStats.awayPct}%</span>
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
function BracketColumn({ stage, matches, slotMap, bracketPicks, onPick, locked, allPlayoffPicks, resultsByMatchId, getTeamEntryStatus }) {
  const roundIdx = STAGE_ROUND_IDX[stage]
  const isR32    = stage === 'r32'

  // Set of teams that actually WON their match in this stage.
  // Used to distinguish 'alive-wrong-path' (amber) from 'wrong' (red):
  // if the user's pick didn't win THIS slot but IS in this set, the team
  // advanced in reality through a different bracket position.
  const actualStageWinners = useMemo(() => {
    const winners = new Set()
    matches.forEach(m => {
      const r = resultsByMatchId?.[m.id]
      if (r?.status === 'final' && r?.homeTeam) winners.add(r.homeTeam)
    })
    return winners
  }, [matches, resultsByMatchId])

  // Pre-result entry status for every team chip in this column.
  // Only evaluated for matches that don't have a final result yet
  // (once a result is entered the card shows ✓/↺/✗ instead).
  const entryStatusesByMatch = useMemo(() => {
    if (!getTeamEntryStatus) return {}
    const out = {}
    matches.forEach(m => {
      const r = resultsByMatchId?.[m.id]
      if (r?.status === 'final') return   // post-result — skip
      const homeId = resolveSlot(m.homeSlot, slotMap, bracketPicks)
      const awayId = resolveSlot(m.awaySlot, slotMap, bracketPicks)
      out[m.id] = {
        home: getTeamEntryStatus(homeId, m.homeSlot, stage),
        away: getTeamEntryStatus(awayId, m.awaySlot, stage),
      }
    })
    return out
  }, [matches, slotMap, bracketPicks, getTeamEntryStatus, stage, resultsByMatchId])

  // Column header counter — aggregated entry-status tallies for pending matches
  const headerCounts = useMemo(() => {
    let correct = 0, different = 0, eliminated = 0
    Object.values(entryStatusesByMatch).forEach(({ home, away }) => {
      ;[home, away].forEach(s => {
        if (s === 'alive-correct')   correct++
        else if (s === 'alive-different') different++
        else if (s === 'eliminated') eliminated++
      })
    })
    return { correct, different, eliminated }
  }, [entryStatusesByMatch])

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

  const { correct, different, eliminated } = headerCounts
  const hasHeaderCounts = correct > 0 || different > 0 || eliminated > 0

  return (
    <div style={{ width: COL_W, flexShrink: 0 }}>
      {/* Header */}
      <div
        className="border-b border-gray-700/60 text-center"
        style={{ height: HDR_H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5 }}
      >
        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
          {STAGE_LABELS[stage]}
        </span>
        {hasHeaderCounts && (
          <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center">
            {correct > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                {correct}
              </span>
            )}
            {different > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {different} alive diff. path
              </span>
            )}
            {eliminated > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {eliminated}
              </span>
            )}
          </div>
        )}
      </div>
      {/* Cards container */}
      <div className="relative" style={{ height: TOTAL_H }}>
        {matches.map((match, matchIdx) => {
          const homeTeamId = resolveSlot(match.homeSlot, slotMap, bracketPicks)
          const awayTeamId = resolveSlot(match.awaySlot, slotMap, bracketPicks)
          const picked     = bracketPicks[match.id] || null
          const matchEntry = entryStatusesByMatch[match.id] || {}
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
                actualStageWinners={actualStageWinners}
                homeEntryStatus={matchEntry.home}
                awayEntryStatus={matchEntry.away}
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
    { stage: 'r16',   matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'r32'),    label: 'R16 picks',  total: 16 },
    { stage: 'qf',    matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'r16'),    label: 'QF picks',   total: 8  },
    { stage: 'sf',    matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'qf'),     label: 'SF picks',   total: 4  },
    { stage: 'final', matches: KNOCKOUT_MATCHES.filter(m => m.stage === 'final'),  label: 'Champion',   total: 1  },
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
  const {
    myPicks, myPicksByMatchId, myPlayoffPicksByRound,
    refreshPicks, allPlayoffPicks, resultsByMatchId,
    myPlayer, reload, activeEntryNum, myEntries, switchEntry, picksVersion,
  } = useWCGame()

  const locked = isPicksLocked()

  const [bracketPicks, setBracketPicks]     = useState({})
  const lastInitVersionRef                  = useRef(-1)
  const [saving, setSaving]                   = useState(false)
  const [msg, setMsg]                         = useState(null)
  const [totalGoalsGuess, setTotalGoalsGuess] = useState(myPlayer?.totalGoalsGuess ?? '')

  // ── Build slot map: '1A'→teamId, '2B'→teamId, and '3XXXX'→best-3rd teamId ──
  // Always uses the user's own group stage picks to determine which teams
  // qualify for R32. Actual admin results are never used here — they only
  // affect the scoring overlays (✓/✗) shown on match cards.
  const slotMap = useMemo(() => {
    const map = {}
    const allThirdPlace = []  // { group, teamId, pts, gd, gf }

    GROUP_LETTERS.forEach(group => {
      const groupMatchList = GROUP_MATCHES.filter(m => m.group === group)
      const picks = groupMatchList.map(m => {
        const pred = myPicksByMatchId[m.id]
        return {
          homeTeam:  m.homeTeam,
          awayTeam:  m.awayTeam,
          homeScore: pred?.homeScore ?? null,
          awayScore: pred?.awayScore ?? null,
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

    // Backtracking assignment — guarantees all eligible slots are filled
    // even when greedy ordering would leave some empty.
    const used   = new Set()
    const btResult = {}
    function bt(i) {
      if (i === r32ThirdCodes.length) return true
      const eligible = r32ThirdCodes[i].slice(1).split('')
      for (const team of qualified) {
        if (!used.has(team.teamId) && eligible.includes(team.group)) {
          used.add(team.teamId)
          btResult[r32ThirdCodes[i]] = team.teamId
          if (bt(i + 1)) return true
          used.delete(team.teamId)
          delete btResult[r32ThirdCodes[i]]
        }
      }
      return false
    }
    bt(0)
    Object.assign(map, btResult)

    return map
  }, [myPicksByMatchId])

  // ── Actual group slot map (from real match results) ───────────────────────
  // Same backtracking algorithm as slotMap, but uses admin-entered results
  // instead of the user's picks. Used to power pre-result entry status dots.
  const { actualGroupSlotMap, groupsWithAllResults, allGroupsComplete } = useMemo(() => {
    const groupsWithAllResults = new Set()
    const map = {}
    const allThirdPlace = []

    GROUP_LETTERS.forEach(group => {
      const groupMatchList = GROUP_MATCHES.filter(m => m.group === group)
      const complete = groupMatchList.every(m => {
        const r = resultsByMatchId?.[m.id]
        return r?.status === 'final' && r?.homeScore != null && r?.awayScore != null
      })
      if (!complete) return

      groupsWithAllResults.add(group)
      const picks = groupMatchList.map(m => {
        const r = resultsByMatchId[m.id]
        return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: r.homeScore, awayScore: r.awayScore }
      })
      const standings = computeGroupStandings(group, picks)
      standings.forEach((s, idx) => { map[`${idx + 1}${group}`] = s.teamId })
      if (standings[2]) allThirdPlace.push({ group, ...standings[2] })
    })

    const allGroupsComplete = groupsWithAllResults.size === GROUP_LETTERS.length

    if (allGroupsComplete && allThirdPlace.length >= 8) {
      allThirdPlace.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      const qualified = allThirdPlace.slice(0, 8)

      const r32ThirdCodes = []
      KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
        if (/^3[A-L]{2,}/.test(m.homeSlot) && !r32ThirdCodes.includes(m.homeSlot)) r32ThirdCodes.push(m.homeSlot)
        if (/^3[A-L]{2,}/.test(m.awaySlot) && !r32ThirdCodes.includes(m.awaySlot)) r32ThirdCodes.push(m.awaySlot)
      })
      const used = new Set()
      const btResult = {}
      function bt(i) {
        if (i === r32ThirdCodes.length) return true
        const eligible = r32ThirdCodes[i].slice(1).split('')
        for (const team of qualified) {
          if (!used.has(team.teamId) && eligible.includes(team.group)) {
            used.add(team.teamId)
            btResult[r32ThirdCodes[i]] = team.teamId
            if (bt(i + 1)) return true
            used.delete(team.teamId)
            delete btResult[r32ThirdCodes[i]]
          }
        }
        return false
      }
      bt(0)
      Object.assign(map, btResult)
    }

    return { actualGroupSlotMap: map, groupsWithAllResults, allGroupsComplete }
  }, [resultsByMatchId])

  // ── Actual knockout stage winners (per stage) ──────────────────────────────
  const actualStageWinnersMap = useMemo(() => {
    const map = { r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set(), final: new Set() }
    KNOCKOUT_MATCHES.forEach(m => {
      const r = resultsByMatchId?.[m.id]
      if (r?.status === 'final' && r?.homeTeam) map[m.stage]?.add(r.homeTeam)
    })
    return map
  }, [resultsByMatchId])

  // ── Stable callback for per-team entry status ──────────────────────────────
  // Returns the team's overall real-world tournament status, propagated through
  // every round: alive-correct / alive-different / eliminated / unknown.
  // computeTeamOverallStatus walks group qualification THEN every knockout stage,
  // so a green dot earned in R32 turns red the moment that team loses R16, and
  // that red dot appears in every later column where the user still has them picked.
  const getTeamEntryStatus = useCallback((teamId) => {
    if (!teamId) return null
    return computeTeamOverallStatus(teamId, {
      actualGroupSlotMap,
      groupsWithAllResults,
      allGroupsComplete,
      resultsByMatchId,
      slotMap,
    })
  }, [actualGroupSlotMap, groupsWithAllResults, allGroupsComplete, resultsByMatchId, slotMap])

  // ── Re-initialize bracket picks whenever a new picks load completes ──────────
  // picksVersion increments in the hook each time picks are fetched (initial load
  // or entry switch). Using it as the trigger guarantees we always have the correct
  // entry's data before rebuilding bracketPicks — no stale-closure race condition.
  useEffect(() => {
    if (picksVersion === lastInitVersionRef.current) return
    const r16Set      = new Set(myPlayoffPicksByRound.r16?.teamIds      || [])
    const qfSet       = new Set(myPlayoffPicksByRound.qf?.teamIds       || [])
    const sfSet       = new Set(myPlayoffPicksByRound.sf?.teamIds       || [])
    const finalistSet = new Set(myPlayoffPicksByRound.finalist?.teamIds || [])
    const winnerSet   = new Set(myPlayoffPicksByRound.winner?.teamIds   || [])
    const hasAny = r16Set.size || qfSet.size || sfSet.size || finalistSet.size || winnerSet.size

    // Wait until we have group picks or saved playoff picks to build the bracket
    if (!myPicks.length && !hasAny) return

    const newPicks = {}

    // R32 → r16: who won each R32 match (= teams advancing to R16)
    KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, {})
      const away = resolveSlot(m.awaySlot, slotMap, {})
      if (home && r16Set.has(home)) newPicks[m.id] = home
      else if (away && r16Set.has(away)) newPicks[m.id] = away
    })
    // R16 → qf: who won each R16 match (= teams advancing to QF)
    KNOCKOUT_MATCHES.filter(m => m.stage === 'r16').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, newPicks)
      const away = resolveSlot(m.awaySlot, slotMap, newPicks)
      if (home && qfSet.has(home)) newPicks[m.id] = home
      else if (away && qfSet.has(away)) newPicks[m.id] = away
    })
    // QF → sf: who won each QF match (= teams advancing to SF)
    KNOCKOUT_MATCHES.filter(m => m.stage === 'qf').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, newPicks)
      const away = resolveSlot(m.awaySlot, slotMap, newPicks)
      if (home && sfSet.has(home)) newPicks[m.id] = home
      else if (away && sfSet.has(away)) newPicks[m.id] = away
    })
    // SF → final: who won each SF match (= the 2 finalists).
    // Use finalistSet (2 teams), NOT winnerSet (1 team) — the champion's
    // semi-final was restorable before, but the other finalist was always lost.
    const finalMatch = KNOCKOUT_MATCHES.find(m => m.stage === 'final')
    KNOCKOUT_MATCHES.filter(m => m.stage === 'sf').forEach(m => {
      const home = resolveSlot(m.homeSlot, slotMap, newPicks)
      const away = resolveSlot(m.awaySlot, slotMap, newPicks)
      if (home && finalistSet.has(home)) newPicks[m.id] = home
      else if (away && finalistSet.has(away)) newPicks[m.id] = away
    })
    // Final: the champion
    if (finalMatch) {
      const home = resolveSlot(finalMatch.homeSlot, slotMap, newPicks)
      const away = resolveSlot(finalMatch.awaySlot, slotMap, newPicks)
      if (home && winnerSet.has(home)) newPicks[finalMatch.id] = home
      else if (away && winnerSet.has(away)) newPicks[finalMatch.id] = away
    }

    setBracketPicks(newPicks)
    lastInitVersionRef.current = picksVersion
  }, [picksVersion, myPlayoffPicksByRound, slotMap, myPicks.length])

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

        const r16Teams      = KNOCKOUT_MATCHES.filter(m => m.stage === 'r32')
        .map(m => bracketPicks[m.id]).filter(Boolean)
      const qfTeams       = KNOCKOUT_MATCHES.filter(m => m.stage === 'r16')
        .map(m => bracketPicks[m.id]).filter(Boolean)
      const sfTeams       = KNOCKOUT_MATCHES.filter(m => m.stage === 'qf')
        .map(m => bracketPicks[m.id]).filter(Boolean)
      // "finalist" = the 2 SF match winners who advance to the Final.
      // This round is critical for restoring SF bracket picks on reload —
      // winnerSet only has 1 team (the champion), so without this the other
      // semi-final pick is permanently lost after navigating away.
      const finalistTeams = KNOCKOUT_MATCHES.filter(m => m.stage === 'sf')
        .map(m => bracketPicks[m.id]).filter(Boolean)
      const finalM        = KNOCKOUT_MATCHES.find(m => m.stage === 'final')
      const winner        = finalM && bracketPicks[finalM.id] ? [bracketPicks[finalM.id]] : []

      const saves = [
        savePlayoffPick({ userId: user.uid, round: 'r32',      teamIds: r32Teams,      entryNumber: activeEntryNum }),
        savePlayoffPick({ userId: user.uid, round: 'r16',      teamIds: r16Teams,      entryNumber: activeEntryNum }),
        savePlayoffPick({ userId: user.uid, round: 'qf',       teamIds: qfTeams,       entryNumber: activeEntryNum }),
        savePlayoffPick({ userId: user.uid, round: 'sf',       teamIds: sfTeams,       entryNumber: activeEntryNum }),
        savePlayoffPick({ userId: user.uid, round: 'finalist', teamIds: finalistTeams, entryNumber: activeEntryNum }),
        savePlayoffPick({ userId: user.uid, round: 'winner',   teamIds: winner,        entryNumber: activeEntryNum }),
      ]
      const goalsVal = parseInt(totalGoalsGuess, 10)
      if (!isNaN(goalsVal) && goalsVal >= 0) {
        saves.push(updateWCPlayer(user.uid, { totalGoalsGuess: goalsVal }))
      }
      await Promise.all(saves)
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
          <p className="text-xs text-blue-700 mt-0.5">
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

      {/* Entry switcher — only shown when user has 2 entries */}
      {myEntries.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {myEntries.map((entry) => (
            <button
              key={entry.entryNumber}
              onClick={() => switchEntry(entry.entryNumber ?? 1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all ${
                activeEntryNum === (entry.entryNumber ?? 1)
                  ? 'bg-yellow-600 border-yellow-600 text-white'
                  : 'bg-f1dark border-f1light text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              <span className="text-base leading-none">🎯</span>
              {entry.entryName ?? `Entry ${entry.entryNumber ?? 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Champion banner */}
      {champion && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-900/30 border border-yellow-600/40">
          <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Your Predicted Champion</p>
            <p className="text-white font-bold flex items-center gap-2"><CountryFlag cc={champion.cc} size={20} alt={champion.name} /> {champion.name}</p>
          </div>
        </div>
      )}

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
                getTeamEntryStatus={getTeamEntryStatus}
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

      {/* Tiebreaker */}
      <div className="card border-yellow-700/40 bg-gray-900">
        <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">
          Tiebreaker — Total Tournament Goals
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Predict the total goals scored across all <span className="text-white font-semibold">104 games</span> of
          the 2026 Soccer Tournament (72 group stage + 32 knockout). Used as the 3rd tiebreaker.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            min="0"
            max="500"
            value={totalGoalsGuess}
            onChange={(e) => setTotalGoalsGuess(e.target.value)}
            disabled={locked}
            placeholder="e.g. 170"
            className="input-field w-24 text-center font-bold text-white"
          />
          {myPlayer?.totalGoalsGuess != null && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Saved: {myPlayer.totalGoalsGuess}
            </span>
          )}
          {!locked && (
            <span className="text-xs text-gray-500 italic">Saved with the bracket above ↑</span>
          )}
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
