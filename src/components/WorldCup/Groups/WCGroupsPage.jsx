import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGameContext as useWCGame } from '@/contexts/WCGameContext'
import {
  createGroup, joinGroupByCode, getWCGroupsForUser, removeGroupMember,
  renameGroup, deleteGroup, searchProfiles, addUserToWCGroup,
} from '@/services/firebase/wc2026Service'
import {
  Users, Plus, LogIn, Copy, CheckCircle2, AlertCircle, ChevronDown,
  ChevronUp, Trophy, Calendar, Link2, Settings, Trash2, Pencil,
  UserPlus, Search, X,
} from 'lucide-react'
import { WC_TEAMS, GROUP_LETTERS, SCORING, getMatchKickoff } from '@/data/wc2026Teams'
import { GROUP_MATCHES, getGroupMatches, KNOCKOUT_MATCHES } from '@/data/wc2026Schedule'
import { computeGroupStandings } from '@/services/gameEngine/wc2026Engine'
import CountryFlag from '@/components/shared/CountryFlag'

const WC_GAME_ID = 'wc2026'

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// ── Match Picks Explorer ──────────────────────────────────────────────────────
function MatchPicksExplorer({ memberPlayers, allPicks, resultsByMatchId, currentUserId }) {
  const { allPlayoffPicks } = useWCGame()

  const [open, setOpen]             = useState(true)
  const [explorerTab, setExplorerTab] = useState('group') // 'group' | 'bracket'
  const [selectedMatchId, setSelectedMatchId] = useState(null)
  const [bracketRound, setBracketRound] = useState('r16')

  // ── Date-based group-match selection (recent & upcoming) ──────────────────────
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const parseYmd = (s) => new Date(s + 'T12:00:00')

  // Default focus = the group-match day closest to today.
  const defaultFocus = useMemo(() => {
    const today = new Date(); today.setHours(12, 0, 0, 0)
    let best = today, diff = Infinity
    ;[...new Set(GROUP_MATCHES.map((m) => m.date))].forEach((ds) => {
      const delta = Math.abs(parseYmd(ds) - today)
      if (delta < diff) { diff = delta; best = parseYmd(ds) }
    })
    return best
  }, [])
  const [focusDate, setFocusDate] = useState(defaultFocus)
  const shiftFocus = (days) => setFocusDate((d) => { const n = new Date(d); n.setDate(n.getDate() + days); return n })

  // 3-day window: previous, current, next.
  const windowDays = useMemo(
    () => [-1, 0, 1].map((off) => { const d = new Date(focusDate); d.setDate(d.getDate() + off); return d }),
    [focusDate]
  )
  const rangeLabel = `${windowDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${windowDays[2].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  // Matches grouped by day within the window, sorted by kickoff.
  const daySections = useMemo(() => {
    const todayStr = ymd(new Date())
    const yStr = ymd(new Date(Date.now() - 864e5))
    const tStr = ymd(new Date(Date.now() + 864e5))
    return windowDays.map((d) => {
      const ds = ymd(d)
      const matches = GROUP_MATCHES
        .filter((m) => m.date === ds)
        .sort((a, b) => (getMatchKickoff(a)?.getTime() || 0) - (getMatchKickoff(b)?.getTime() || 0))
      const base = parseYmd(ds).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const prefix = ds === todayStr ? 'Today · ' : ds === yStr ? 'Yesterday · ' : ds === tStr ? 'Tomorrow · ' : ''
      return { ds, label: prefix + base, matches }
    }).filter((s) => s.matches.length > 0)
  }, [windowDays])

  const selectedMatch = GROUP_MATCHES.find((m) => m.id === selectedMatchId) || null

  // Auto-select a sensible default match on first open.
  useEffect(() => {
    if (selectedMatchId) return
    const firstDay = daySections.find((s) => s.matches.length)
    if (firstDay) setSelectedMatchId(firstDay.matches[0].id)
  }, [daySections, selectedMatchId])

  const picksByUser = useMemo(() => {
    if (!selectedMatchId) return {}
    const map = {}
    allPicks.forEach((p) => {
      if (p.matchId === selectedMatchId) map[`${p.userId}_${p.entryNumber ?? 1}`] = p
    })
    return map
  }, [selectedMatchId, allPicks])

  const result = selectedMatch ? resultsByMatchId[selectedMatch.id] : null

  const fmtDate = (d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const getPickColor = (pick, res) => {
    if (!pick || pick.homeScore == null || !res || res.status !== 'final') return 'text-white'
    const isExact = pick.homeScore === res.homeScore && pick.awayScore === res.awayScore
    if (isExact) return 'text-green-400'
    const outcome = (h, a) => h > a ? 'home' : h < a ? 'away' : 'draw'
    return outcome(pick.homeScore, pick.awayScore) === outcome(res.homeScore, res.awayScore)
      ? 'text-blue-400' : 'text-red-400'
  }

  // ── Bracket tab data ───────────────────────────────────────────────────────
  const r32Matches = useMemo(() => KNOCKOUT_MATCHES.filter((m) => m.stage === 'r32'),  [])
  const r16Matches = useMemo(() => KNOCKOUT_MATCHES.filter((m) => m.stage === 'r16'),  [])
  const qfMatches  = useMemo(() => KNOCKOUT_MATCHES.filter((m) => m.stage === 'qf'),   [])
  const sfMatches  = useMemo(() => KNOCKOUT_MATCHES.filter((m) => m.stage === 'sf'),   [])
  const finalMatch = useMemo(() => KNOCKOUT_MATCHES.filter((m) => m.stage === 'final'), [])

  const actualR16      = useMemo(() => new Set(r32Matches.flatMap((m) => resultsByMatchId[m.id]?.homeTeam ? [resultsByMatchId[m.id].homeTeam] : [])), [r32Matches, resultsByMatchId])
  const actualQF       = useMemo(() => new Set(r16Matches.flatMap((m) => resultsByMatchId[m.id]?.homeTeam ? [resultsByMatchId[m.id].homeTeam] : [])), [r16Matches, resultsByMatchId])
  const actualSF       = useMemo(() => new Set(qfMatches.flatMap((m)  => resultsByMatchId[m.id]?.homeTeam ? [resultsByMatchId[m.id].homeTeam] : [])), [qfMatches,  resultsByMatchId])
  const actualFinalist = useMemo(() => new Set(sfMatches.flatMap((m)  => resultsByMatchId[m.id]?.homeTeam ? [resultsByMatchId[m.id].homeTeam] : [])), [sfMatches,  resultsByMatchId])
  const actualWinner   = useMemo(() => new Set(finalMatch.flatMap((m) => resultsByMatchId[m.id]?.homeTeam ? [resultsByMatchId[m.id].homeTeam] : [])), [finalMatch, resultsByMatchId])

  const roundMeta = {
    r16:      { label: 'Round of 16',  actualSet: actualR16,      decided: r32Matches.every((m) => resultsByMatchId[m.id]?.homeTeam), pts: SCORING.PLAYOFF_R16       },
    qf:       { label: 'Quarterfinals', actualSet: actualQF,      decided: r16Matches.every((m) => resultsByMatchId[m.id]?.homeTeam), pts: SCORING.PLAYOFF_QF        },
    sf:       { label: 'Semifinals',    actualSet: actualSF,      decided: qfMatches.every((m)  => resultsByMatchId[m.id]?.homeTeam), pts: SCORING.PLAYOFF_SF        },
    finalist: { label: 'Final',         actualSet: actualFinalist, decided: sfMatches.every((m)  => resultsByMatchId[m.id]?.homeTeam), pts: SCORING.PLAYOFF_FINALIST  },
    winner:   { label: 'Champion',      actualSet: actualWinner,  decided: finalMatch.every((m) => resultsByMatchId[m.id]?.homeTeam), pts: SCORING.PLAYOFF_WINNER    },
  }

  // Build a per-entry map of playoff picks: { "userId_entryNum": { r16: [...], ... } }
  const playoffPicksByUser = useMemo(() => {
    const memberKeys = new Set(memberPlayers.map((p) => `${p.userId}_${p.entryNumber ?? 1}`))
    const map = {}
    allPlayoffPicks
      .filter((p) => memberKeys.has(`${p.userId}_${p.entryNumber ?? 1}`))
      .forEach((p) => {
        const key = `${p.userId}_${p.entryNumber ?? 1}`
        if (!map[key]) map[key] = {}
        map[key][p.round] = p.teamIds || []
      })
    return map
  }, [allPlayoffPicks, memberPlayers])

  const currentRound = roundMeta[bracketRound]

  // ── Positions tab: predicted vs actual group standings ──────────────────────
  const [posGroup, setPosGroup] = useState('A')
  const [comparePlayerKey, setComparePlayerKey] = useState(null)

  // Actual standings per group (from results) + actual best-3rd qualifiers.
  const { actualByGroup, bestThirdSet, groupComplete, groupStarted, allGroupsComplete } = useMemo(() => {
    const actualByGroup = {}, thirds = [], complete = {}, started = {}
    GROUP_LETTERS.forEach((g) => {
      const ms = getGroupMatches(g)
      const picks = ms.map((m) => {
        const r = resultsByMatchId[m.id]
        return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: r?.homeScore ?? null, awayScore: r?.awayScore ?? null }
      })
      complete[g] = ms.every((m) => resultsByMatchId[m.id]?.status === 'final')
      started[g] = ms.some((m) => resultsByMatchId[m.id]?.status === 'final')
      const st = computeGroupStandings(g, picks)
      actualByGroup[g] = st
      if (complete[g] && st[2]) thirds.push({ group: g, ...st[2] })
    })
    thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    // Best-3rd qualification is only known once EVERY group is final — otherwise
    // the top-8 third-place ranking is incomplete and shouldn't be shown.
    const allGroupsComplete = GROUP_LETTERS.every((g) => complete[g])
    const bestThirdSet = allGroupsComplete ? new Set(thirds.slice(0, 8).map((t) => t.teamId)) : new Set()
    return { actualByGroup, bestThirdSet, groupComplete: complete, groupStarted: started, allGroupsComplete }
  }, [resultsByMatchId])

  // A player/entry's predicted standings for a group (from their saved picks).
  const predictedStandings = (group, userId, entryNumber) => {
    const ms = getGroupMatches(group)
    const picks = ms.map((m) => {
      const p = allPicks.find((pp) => pp.matchId === m.id && pp.userId === userId && (pp.entryNumber ?? 1) === entryNumber)
      return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: p?.homeScore ?? null, awayScore: p?.awayScore ?? null }
    })
    return computeGroupStandings(group, picks)
  }

  return (
    <div className="bg-f1dark rounded-xl overflow-hidden border border-f1light">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-yellow-400" />
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Member Picks Explorer</p>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {open && (
        <div className="border-t border-f1light">

          {/* Explorer tab strip */}
          <div className="flex border-b border-f1light">
            {[['group', 'Group Stage'], ['positions', 'Group Positions'], ['bracket', 'Bracket']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setExplorerTab(key)}
                className={`px-4 py-2 text-xs font-semibold transition-colors ${
                  explorerTab === key
                    ? 'text-yellow-400 border-b-2 border-yellow-500 -mb-px'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Group Stage tab ────────────────────────────────────────────── */}
          {explorerTab === 'group' && (
            <div className="space-y-3 p-3">
              {/* Day-window navigator (previous / current / next day) */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => shiftFocus(-1)}
                  className="px-2.5 py-1 rounded-lg bg-gray-800 border border-f1light text-gray-300 hover:text-white text-xs font-semibold"
                >
                  ‹ Prev
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-yellow-300 bg-yellow-900/20 border border-yellow-700/40 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                    {rangeLabel}
                  </span>
                  <button
                    onClick={() => setFocusDate(defaultFocus)}
                    className="text-[10px] text-gray-500 hover:text-gray-300 underline"
                  >
                    Now
                  </button>
                </div>
                <button
                  onClick={() => shiftFocus(1)}
                  className="px-2.5 py-1 rounded-lg bg-gray-800 border border-f1light text-gray-300 hover:text-white text-xs font-semibold"
                >
                  Next ›
                </button>
              </div>

              {/* Matches grouped by day */}
              {daySections.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No matches in this window — use Prev / Next.</p>
              ) : daySections.map((sec) => (
                <div key={sec.ds} className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-0.5">{sec.label}</p>
                  <div className="space-y-1">
                    {sec.matches.map((match) => {
                      const home = WC_TEAMS[match.homeTeam]
                      const away = WC_TEAMS[match.awayTeam]
                      const isSelected = match.id === selectedMatchId
                      const res = resultsByMatchId[match.id]
                      const done = res?.status === 'final'
                      return (
                        <button
                          key={match.id}
                          onClick={() => setSelectedMatchId(match.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-yellow-600/20 border-yellow-500'
                              : 'bg-gray-800/60 border-f1light hover:border-gray-500'
                          }`}
                        >
                          <span className={`text-[9px] font-bold w-12 flex-shrink-0 text-left whitespace-nowrap ${done ? 'text-green-400' : 'text-gray-500'}`}>
                            {done ? 'FT' : (match.time?.replace(' ET', '') || '')}
                          </span>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center text-xs font-semibold">
                            <span className={isSelected ? 'text-white' : 'text-gray-300'}>{home?.shortName}</span>
                            <CountryFlag cc={home?.cc} size={16} alt={home?.name} />
                            <span className="text-gray-500 mx-0.5 tabular-nums">{done ? `${res.homeScore}–${res.awayScore}` : 'vs'}</span>
                            <CountryFlag cc={away?.cc} size={16} alt={away?.name} />
                            <span className={isSelected ? 'text-white' : 'text-gray-300'}>{away?.shortName}</span>
                          </div>
                          <span className="w-12 flex-shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Selected match — member picks */}
              {selectedMatch && (
                <div className="rounded-xl overflow-hidden border border-f1light">
                  <div className="px-3 py-2 bg-gray-900/70 flex items-center justify-between border-b border-f1light">
                    <div className="flex items-center gap-2">
                      <CountryFlag cc={WC_TEAMS[selectedMatch.homeTeam]?.cc} size={20} alt={WC_TEAMS[selectedMatch.homeTeam]?.name} />
                      <span className="text-sm font-bold text-white">{WC_TEAMS[selectedMatch.homeTeam]?.shortName}</span>
                      <span className="text-xs text-gray-500">vs</span>
                      <span className="text-sm font-bold text-white">{WC_TEAMS[selectedMatch.awayTeam]?.shortName}</span>
                      <CountryFlag cc={WC_TEAMS[selectedMatch.awayTeam]?.cc} size={20} alt={WC_TEAMS[selectedMatch.awayTeam]?.name} />
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      {result?.status === 'final' ? (
                        <span className="text-xs text-green-400 font-bold">
                          Final: {result.homeScore}–{result.awayScore}
                        </span>
                      ) : (
                        <>
                          <p className="text-[10px] text-gray-400">{fmtDate(selectedMatch.date)}</p>
                          {selectedMatch.time && <p className="text-[10px] text-gray-500">{selectedMatch.time}</p>}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-f1light/60">
                    {memberPlayers.map((player) => {
                      const pick = picksByUser[`${player.userId}_${player.entryNumber ?? 1}`]
                      const hasPick = pick?.homeScore != null && pick?.awayScore != null
                      const isMe = player.userId === currentUserId
                      const pickColor = hasPick ? getPickColor(pick, result) : ''
                      const userCount = memberPlayers.filter(p => p.userId === player.userId).length
                      const showEntry = userCount > 1 && player.entryName
                      return (
                        <div key={`${player.userId}_${player.entryNumber ?? 1}`} className={`flex items-center gap-3 px-3 py-2.5 ${isMe ? 'bg-yellow-900/10' : ''}`}>
                          <div className="w-6 h-6 rounded-full bg-yellow-700/60 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {player.displayName?.[0]?.toUpperCase()}
                          </div>
                          <span className={`text-sm flex-1 min-w-0 truncate ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                            {player.displayName}
                            {showEntry && <span className="text-gray-500 font-normal"> — {player.entryName}</span>}
                            {isMe && <span className="text-xs text-yellow-400 ml-1">(You)</span>}
                          </span>
                          {hasPick ? (
                            <div className={`flex items-center gap-1 flex-shrink-0 font-black text-lg tabular-nums ${pickColor}`}>
                              <span>{pick.homeScore}</span>
                              <span className="text-gray-500 font-bold text-sm">–</span>
                              <span>{pick.awayScore}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600 italic flex-shrink-0">No pick</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Bracket tab ───────────────────────────────────────────────── */}
          {explorerTab === 'bracket' && (
            <div className="space-y-3 p-3">
              {/* Round selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {Object.entries(roundMeta).map(([key, { label, pts }]) => (
                  <button
                    key={key}
                    onClick={() => setBracketRound(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all ${
                      bracketRound === key
                        ? 'bg-yellow-600 text-white shadow-lg'
                        : 'bg-gray-800 border border-f1light text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {label}
                    <span className="ml-1 text-[9px] opacity-70">+{pts}pts</span>
                  </button>
                ))}
              </div>

              {/* Round status badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  currentRound.decided
                    ? 'bg-green-900/40 text-green-400 border border-green-700'
                    : 'bg-gray-800 text-gray-500 border border-f1light'
                }`}>
                  {currentRound.decided ? '✓ Results in' : '⏳ Pending'}
                </span>
                <span className="text-[10px] text-gray-600">{currentRound.label} · +{currentRound.pts} pts per correct pick</span>
              </div>

              {/* Per-member bracket picks */}
              <div className="rounded-xl overflow-hidden border border-f1light">
                <div className="divide-y divide-f1light/60">
                  {memberPlayers.map((player) => {
                    const isMe     = player.userId === currentUserId
                    const teamIds  = playoffPicksByUser[`${player.userId}_${player.entryNumber ?? 1}`]?.[bracketRound] || []
                    const correct  = teamIds.filter((id) => currentRound.actualSet.has(id)).length
                    const hasPicks = teamIds.length > 0
                    const userCount = memberPlayers.filter(p => p.userId === player.userId).length
                    const showEntry = userCount > 1 && player.entryName
                    return (
                      <div key={`${player.userId}_${player.entryNumber ?? 1}`} className={`px-3 py-2.5 ${isMe ? 'bg-yellow-900/10' : ''}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-yellow-700/60 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                            {player.displayName?.[0]?.toUpperCase()}
                          </div>
                          <span className={`text-xs flex-1 font-semibold ${isMe ? 'text-white' : 'text-gray-300'}`}>
                            {player.displayName}
                            {showEntry && <span className="text-gray-500 font-normal"> — {player.entryName}</span>}
                            {isMe && <span className="text-yellow-400 ml-1">(You)</span>}
                          </span>
                          {hasPicks && currentRound.decided && (
                            <span className={`text-[10px] font-bold ${correct > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                              {correct}/{teamIds.length} ✓
                            </span>
                          )}
                          {hasPicks && !currentRound.decided && (
                            <span className="text-[10px] text-gray-600">{teamIds.length} picked</span>
                          )}
                        </div>
                        {hasPicks ? (
                          <div className="flex flex-wrap gap-1">
                            {teamIds.map((teamId) => {
                              const team = WC_TEAMS[teamId]
                              const isCorrect = currentRound.actualSet.has(teamId)
                              const chipCls = currentRound.decided
                                ? isCorrect
                                  ? 'bg-green-900/40 border-green-600 text-green-300'
                                  : 'bg-gray-800 border-gray-700 text-gray-500 line-through decoration-red-500'
                                : 'bg-gray-800/60 border-gray-700 text-gray-300'
                              return (
                                <span key={teamId} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${chipCls}`}>
                                  <CountryFlag cc={team?.cc} size={10} alt={team?.name} />
                                  {team?.shortName || teamId}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-600 italic">No bracket picks</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Positions tab ─────────────────────────────────────────────── */}
          {explorerTab === 'positions' && (() => {
            const actual = actualByGroup[posGroup] || []
            const complete = groupComplete[posGroup]
            const started = groupStarted[posGroup]
            const qualSet = new Set()
            if (actual[0]) qualSet.add(actual[0].teamId)
            if (actual[1]) qualSet.add(actual[1].teamId)
            if (actual[2] && bestThirdSet.has(actual[2].teamId)) qualSet.add(actual[2].teamId)

            const meEntry = memberPlayers.find((p) => p.userId === currentUserId) || null
            const meKey = meEntry ? `${meEntry.userId}_${meEntry.entryNumber ?? 1}` : null
            const fallback = memberPlayers.find((p) => `${p.userId}_${p.entryNumber ?? 1}` !== meKey) || memberPlayers[0] || null
            const cmpKey = comparePlayerKey || (fallback ? `${fallback.userId}_${fallback.entryNumber ?? 1}` : null)
            const cmpEntry = memberPlayers.find((p) => `${p.userId}_${p.entryNumber ?? 1}` === cmpKey) || null

            const youStd = meEntry ? predictedStandings(posGroup, meEntry.userId, meEntry.entryNumber ?? 1) : []
            const cmpStd = cmpEntry ? predictedStandings(posGroup, cmpEntry.userId, cmpEntry.entryNumber ?? 1) : []

            const statusOf = (team, i) => {
              if (!team) return 'empty'
              if (!started) return 'neutral'
              if (actual[i]?.teamId === team) {
                // An exact 3rd-place match is held until best-3rd qualification is decided.
                return (i === 2 && !allGroupsComplete) ? 'neutral' : 'exact'
              }
              // qualSet only contains decided qualifiers (1st/2nd, plus 3rd once best-3rd known),
              // so a team placed in the wrong spot still scores as a right-team-wrong-spot pick.
              if (qualSet.has(team)) return 'wrong'
              return 'miss'
            }
            // Count green (exact) cells — naturally skips 3rd until best-3rd resolves.
            const exactCount = (std) => started ? [0, 1, 2, 3].filter((i) => statusOf(std[i]?.teamId, i) === 'exact').length : null
            // Qualification points per predicted cell: 4 exact, 2 right-team-wrong-spot,
            // 0 for 4th place and for 3rd until best-3rd is decided (driven by statusOf).
            const qptsFor = (status, i) => i === 3 ? 0
              : status === 'exact' ? SCORING.GROUP_QUALIFY_EXACT
              : status === 'wrong' ? SCORING.GROUP_QUALIFY_POSITION
              : 0
            const totalPts = (std) => started ? [0, 1, 2, 3].reduce((s, i) => s + qptsFor(statusOf(std[i]?.teamId, i), i), 0) : null

            const cell = (team, status, opts = {}) => {
              const t = team ? WC_TEAMS[team] : null
              const box = status === 'exact' ? 'bg-green-900/30 border-green-700/50'
                : status === 'wrong' ? 'bg-yellow-500/15 border-yellow-500/50'
                : status === 'ref' ? 'bg-gray-800/50 border-f1light'
                : 'bg-gray-800/30 border-f1light/60'
              const txt = status === 'exact' ? 'text-green-300' : status === 'wrong' ? 'text-yellow-300' : 'text-gray-300'
              return (
                <div className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border ${box} min-w-0`}>
                  {t ? (
                    <>
                      <CountryFlag cc={t.cc} size={13} alt={t.name} />
                      <span className={`text-[11px] font-bold truncate ${txt}`}>{t.shortName}</span>
                      {opts.badge && <span className="ml-0.5 text-[7px] bg-blue-900/60 text-blue-300 px-1 rounded font-bold flex-shrink-0">3Q</span>}
                      {opts.pts != null && <span className="ml-auto text-[9px] text-gray-500 font-semibold flex-shrink-0">{opts.pts}p</span>}
                      {opts.qpts ? <span className={`ml-auto text-[10px] font-bold flex-shrink-0 ${status === 'exact' ? 'text-green-400' : 'text-yellow-400'}`}>+{opts.qpts}</span> : null}
                    </>
                  ) : <span className="text-gray-600 text-[11px]">—</span>}
                </div>
              )
            }

            return (
              <div className="space-y-3 p-3">
                {/* Group selector */}
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {GROUP_LETTERS.map((g) => (
                    <button key={g} onClick={() => setPosGroup(g)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 transition-all ${
                        g === posGroup ? 'bg-yellow-600 text-white shadow-lg' : 'bg-gray-800 border border-f1light text-gray-400 hover:text-white hover:border-gray-500'
                      }`}>{g}</button>
                  ))}
                </div>

                {/* Legend / status */}
                <div className="flex items-center gap-3 flex-wrap text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-700/70 border border-green-600" /> Right team &amp; spot</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-500 border border-yellow-400" /> Right team, wrong spot</span>
                  {!started
                    ? <span className="ml-auto text-[9px] text-gray-500 font-semibold">Not started</span>
                    : !complete
                      ? <span className="ml-auto text-[9px] text-yellow-500 font-semibold">⏳ Live — not final</span>
                      : <span className="ml-auto text-[9px] text-green-500 font-semibold">✓ Final</span>}
                </div>

                {/* Comparison grid */}
                <div className="space-y-1">
                  <div className="grid grid-cols-[18px_1fr_1fr_1fr] gap-1 items-center px-0.5">
                    <span />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Actual</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">
                      You {totalPts(youStd) != null && <span className="text-green-400">{totalPts(youStd)}p · {exactCount(youStd)}✓</span>}
                    </span>
                    <select
                      value={cmpKey || ''}
                      onChange={(e) => setComparePlayerKey(e.target.value)}
                      className="text-[10px] bg-gray-800 border border-f1light rounded px-1 py-0.5 text-gray-300 min-w-0 w-full"
                    >
                      {memberPlayers.map((p) => {
                        const k = `${p.userId}_${p.entryNumber ?? 1}`
                        const dup = memberPlayers.filter((x) => x.userId === p.userId).length > 1
                        return <option key={k} value={k}>{p.displayName}{dup ? ` (${p.entryName})` : ''}</option>
                      })}
                    </select>
                  </div>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`grid grid-cols-[18px_1fr_1fr_1fr] gap-1 items-stretch ${i === 3 ? 'opacity-60' : ''}`}>
                      <span className="flex items-center justify-center text-[11px] font-bold text-gray-500">{i + 1}</span>
                      {cell(actual[i]?.teamId, 'ref', { pts: actual[i]?.pts, badge: i === 2 && actual[2] && bestThirdSet.has(actual[2].teamId) })}
                      {cell(youStd[i]?.teamId, statusOf(youStd[i]?.teamId, i), { qpts: qptsFor(statusOf(youStd[i]?.teamId, i), i) })}
                      {cell(cmpStd[i]?.teamId, statusOf(cmpStd[i]?.teamId, i), { qpts: qptsFor(statusOf(cmpStd[i]?.teamId, i), i) })}
                    </div>
                  ))}
                </div>

                {cmpEntry && exactCount(cmpStd) != null && (
                  <p className="text-[10px] text-gray-500 text-center">
                    {cmpEntry.displayName}: <span className="text-green-400 font-semibold">{totalPts(cmpStd)} pts</span> · {exactCount(cmpStd)} exact
                  </p>
                )}
              </div>
            )
          })()}

        </div>
      )}
    </div>
  )
}

// ── Group viewer (detail + management) ───────────────────────────────────────
function GroupViewer({ groups, currentUserId, players, allPicks, resultsByMatchId, onGroupsChanged, reloadPlayers }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '')
  const [copied, setCopied]     = useState(null) // 'code' | 'link' | null
  const [managing, setManaging] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName]   = useState('')
  const [savingName, setSavingName] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [manageError, setManageError] = useState(null)

  // ── Add-member state ──
  const [addQuery, setAddQuery]       = useState('')
  const [addResults, setAddResults]   = useState([])
  const [addSearching, setAddSearching] = useState(false)
  const [addingId, setAddingId]       = useState(null)
  const [addNotice, setAddNotice]     = useState(null)

  const group = groups.find((g) => g.id === selectedGroupId) || groups[0]

  // Debounced profile search (min 2 chars)
  useEffect(() => {
    const q = addQuery.trim()
    if (q.length < 2) { setAddResults([]); setAddSearching(false); return }
    setAddSearching(true)
    const t = setTimeout(async () => {
      try {
        const results = await searchProfiles(q)
        setAddResults(results)
      } catch {
        setAddResults([])
      } finally {
        setAddSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [addQuery])

  if (!group) return null

  const isCreator = group.createdBy === currentUserId
  const memberPlayers = players.filter((p) =>
    group.members?.some(m => m.userId === p.userId && (m.entryNumber ?? 1) === (p.entryNumber ?? 1))
  )
  const sorted = [...memberPlayers].sort(
    (a, b) => (b.totalPoints || 0) - (a.totalPoints || 0) || (b.exactHits || 0) - (a.exactHits || 0)
  )

  const inviteLink = `${window.location.origin}/join/${group.inviteCode}`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied('code')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied('link')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from the group?')) return
    setRemoving(userId)
    try {
      await removeGroupMember(group.id, userId)
      await onGroupsChanged()
    } finally {
      setRemoving(null)
    }
  }

  const handleAddUser = async (profile, entry) => {
    const en = entry?.entryNumber ?? 1
    const label = entry?.entryName || `Entry ${en}`
    const addKey = `${profile.id}_${en}`
    setAddingId(addKey)
    setManageError(null)
    setAddNotice(null)
    try {
      const { alreadyMember } = await addUserToWCGroup({
        groupId: group.id,
        userId: profile.id,
        displayName: profile.displayName,
        entryNumber: en,
        entryName: label,
      })
      await onGroupsChanged()
      if (reloadPlayers) await reloadPlayers()
      // Keep the search open so the creator can add the user's other entries.
      setAddNotice(
        alreadyMember
          ? `${profile.displayName} — ${label} is already in this group.`
          : `Added ${profile.displayName} — ${label}.`
      )
    } catch (err) {
      setManageError(err.message || 'Failed to add member.')
    } finally {
      setAddingId(null)
    }
  }

  const handleRename = async () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === group.name) { setRenaming(false); return }
    setSavingName(true)
    setManageError(null)
    try {
      await renameGroup(group.id, trimmed)
      await onGroupsChanged()
      setRenaming(false)
    } catch (err) {
      setManageError(err.message || 'Failed to rename group.')
    } finally {
      setSavingName(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${group.name}"? This will remove all members and cannot be undone.`)) return
    setDeleting(true)
    setManageError(null)
    try {
      await deleteGroup(group.id)
      await onGroupsChanged()
      setManaging(false)
    } catch (err) {
      setManageError(err.message || 'Failed to delete group.')
      setDeleting(false)
    }
  }

  return (
    <div className="card space-y-4">
      {/* Group selector + invite actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <select
            value={selectedGroupId}
            onChange={(e) => { setSelectedGroupId(e.target.value); setCopied(null); setManaging(false) }}
            className="w-full appearance-none bg-f1dark border border-f1light rounded-xl px-4 py-2.5 pr-9 text-white font-bold text-base focus:outline-none focus:border-yellow-500 cursor-pointer"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 font-mono bg-f1dark border border-f1light px-2 py-1 rounded-lg">
            {group.inviteCode}
          </span>
          <button onClick={handleCopyCode} className="btn-secondary p-2 text-xs" title="Copy invite code">
            {copied === 'code' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={handleCopyLink} className="btn-secondary p-2 text-xs" title="Copy invite link">
            {copied === 'link' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
          </button>
          {isCreator && (
            <button
              onClick={() => setManaging((v) => !v)}
              className={`p-2 rounded-lg border text-xs transition-colors ${managing ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'btn-secondary'}`}
              title="Manage group"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {copied === 'link' && (
        <p className="text-xs text-green-400 -mt-2">✓ Invite link copied! Share it with friends.</p>
      )}

      <div className="flex items-center gap-2 flex-wrap -mt-2">
        <p className="text-xs text-gray-400">
          {group.members?.length || 1} member{(group.members?.length || 1) !== 1 ? 's' : ''}
          {isCreator && <span className="text-gray-600 ml-1">(you created this group)</span>}
        </p>
        {(group.members || []).filter(m => m.userId === currentUserId).map(m => {
          const p = players.find(pl => pl.userId === m.userId && (pl.entryNumber ?? 1) === (m.entryNumber ?? 1))
          const label = p?.entryName ?? `Entry ${m.entryNumber ?? 1}`
          return (
            <span key={`${m.userId}_${m.entryNumber ?? 1}`} className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-medium">
              🎯 {label}
            </span>
          )
        })}
      </div>

      {/* Manage panel — creator only */}
      {isCreator && managing && (
        <div className="bg-f1dark rounded-xl overflow-hidden border border-yellow-700/30 space-y-0">
          <div className="px-3 py-2 border-b border-f1light flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-yellow-400" />
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Manage Group</p>
          </div>

          {/* Error banner */}
          {manageError && (
            <div className="flex items-center gap-2 text-xs text-red-300 bg-red-900/30 border-b border-red-700/50 px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{manageError}
            </div>
          )}

          {/* ── Rename section ─────────────────────────────────── */}
          <div className="px-3 py-3 border-b border-f1light">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Pencil className="w-3 h-3 text-blue-400" /> Rename Group
            </p>
            {renaming ? (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className="flex-1 bg-gray-800 border border-f1light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={40}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
                />
                <button
                  onClick={handleRename}
                  disabled={savingName || !newName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setRenaming(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setNewName(group.name); setRenaming(true); setManageError(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-700/50 text-blue-400 hover:bg-blue-900/20 text-xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Rename "{group.name}"
              </button>
            )}
          </div>

          {/* ── Add member section ─────────────────────────────── */}
          <div className="px-3 py-3 border-b border-f1light">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3 h-3 text-green-400" /> Add Member
            </p>
            <p className="text-[11px] text-gray-500 mb-2">
              Search an existing Collush account by name or email and add them directly — no invite link needed.
            </p>

            {addNotice && (
              <div className="flex items-center gap-2 text-xs text-green-300 bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />{addNotice}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                className="w-full bg-gray-800 border border-f1light rounded-lg pl-8 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
                placeholder="Name or email…"
                value={addQuery}
                onChange={(e) => { setAddQuery(e.target.value); setAddNotice(null) }}
              />
              {addQuery && (
                <button
                  onClick={() => { setAddQuery(''); setAddResults([]) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results */}
            {addQuery.trim().length >= 2 && (
              <div className="mt-2 rounded-lg border border-f1light divide-y divide-f1light overflow-hidden">
                {addSearching ? (
                  <p className="text-xs text-gray-500 px-3 py-2">Searching…</p>
                ) : addResults.length === 0 ? (
                  <p className="text-xs text-gray-500 px-3 py-2">No matching accounts found.</p>
                ) : (
                  addResults.map((profile) => {
                    // A user's entries come from their wc_players rows. If none
                    // exist yet, treat them as a single Entry 1 to be created.
                    const found = players
                      .filter((p) => p.userId === profile.id)
                      .sort((a, b) => (a.entryNumber ?? 1) - (b.entryNumber ?? 1))
                    const entryList = found.length > 0
                      ? found
                      : [{ userId: profile.id, entryNumber: 1, entryName: 'Entry 1' }]
                    const multiEntry = entryList.length > 1

                    return (
                      <div key={profile.id} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-700 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                            {profile.displayName[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate">{profile.displayName}</p>
                            {profile.email && <p className="text-[11px] text-gray-500 truncate">{profile.email}</p>}
                          </div>
                          {/* Single-entry users: Add button inline on the name row */}
                          {!multiEntry && (() => {
                            const e = entryList[0]
                            const en = e.entryNumber ?? 1
                            const isMember = (group.members || []).some(
                              (m) => m.userId === profile.id && (m.entryNumber ?? 1) === en
                            )
                            return isMember ? (
                              <span className="text-[11px] text-gray-500 flex items-center gap-1 flex-shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> In group
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddUser(profile, e)}
                                disabled={addingId === `${profile.id}_${en}`}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-green-700/50 text-green-400 hover:bg-green-900/30 text-xs transition-colors disabled:opacity-50 flex-shrink-0"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                {addingId === `${profile.id}_${en}` ? 'Adding…' : 'Add'}
                              </button>
                            )
                          })()}
                        </div>

                        {/* Multi-entry users: one row per entry */}
                        {multiEntry && (
                          <div className="mt-1.5 ml-8 space-y-1">
                            {entryList.map((e) => {
                              const en = e.entryNumber ?? 1
                              const label = e.entryName || `Entry ${en}`
                              const isMember = (group.members || []).some(
                                (m) => m.userId === profile.id && (m.entryNumber ?? 1) === en
                              )
                              const addKey = `${profile.id}_${en}`
                              return (
                                <div key={addKey} className="flex items-center gap-2">
                                  <span className="text-xs text-yellow-400 flex-1 flex items-center gap-1">
                                    🎯 {label}
                                  </span>
                                  {isMember ? (
                                    <span className="text-[11px] text-gray-500 flex items-center gap-1 flex-shrink-0">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> In group
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleAddUser(profile, e)}
                                      disabled={addingId === addKey}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-green-700/50 text-green-400 hover:bg-green-900/30 text-xs transition-colors disabled:opacity-50 flex-shrink-0"
                                    >
                                      <UserPlus className="w-3.5 h-3.5" />
                                      {addingId === addKey ? 'Adding…' : 'Add'}
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Members section ────────────────────────────────── */}
          <div className="border-b border-f1light">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-gray-400" /> Members
            </p>
            <div className="divide-y divide-f1light">
              {(group.members || []).map((member) => {
                const uid = typeof member === 'string' ? member : member.userId
                const entryNum = typeof member === 'string' ? 1 : (member.entryNumber ?? 1)
                const player = players.find((p) => p.userId === uid && (p.entryNumber ?? 1) === entryNum)
                const displayName = player?.displayName || uid.slice(0, 8) + '…'
                const entryLabel = player?.entryName ?? (entryNum > 1 ? ` (Entry ${entryNum})` : '')
                const isMe = uid === currentUserId
                const memberKey = `${uid}_${entryNum}`
                return (
                  <div key={memberKey} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {displayName[0]?.toUpperCase()}
                    </div>
                    <span className={`text-sm flex-1 ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                      {displayName}
                      {entryNum > 1 && <span className="text-xs text-gray-500 ml-1">{entryLabel}</span>}
                      {isMe && <span className="text-xs text-yellow-400 ml-1">(You · Creator)</span>}
                    </span>
                    {!isMe && (
                      <button
                        onClick={() => handleRemove(uid)}
                        disabled={removing === uid}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-700/50 text-red-400 hover:bg-red-900/30 text-xs transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {removing === uid ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Delete group ───────────────────────────────────── */}
          <div className="px-3 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Trash2 className="w-3 h-3 text-red-400" /> Danger Zone
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-700/50 bg-red-900/10 text-red-400 hover:bg-red-900/30 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Deleting…' : `Delete "${group.name}"`}
            </button>
            <p className="text-[10px] text-gray-600 mt-1.5">This will permanently remove the group and all its members.</p>
          </div>
        </div>
      )}

      {/* Group leaderboard */}
      {sorted.length > 0 ? (
        <div className="bg-f1dark rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-f1light flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Group Leaderboard</p>
          </div>
          <div className="divide-y divide-f1light">
            {sorted.map((player, idx) => {
              const isMe = player.userId === currentUserId
              // Show entry name when the same user appears more than once (multi-entry)
              const userCount = sorted.filter(p => p.userId === player.userId).length
              const showEntry = userCount > 1 && player.entryName
              return (
                <div
                  key={`${player.userId}_${player.entryNumber ?? 1}`}
                  className={`flex items-center gap-3 px-3 py-2.5 ${isMe ? 'bg-yellow-900/10' : ''}`}
                >
                  <span className="w-5 text-center font-semibold flex-shrink-0 flex items-center justify-center">
                    {idx === 0 ? <span className="text-lg">🥇</span>
                      : idx === 1 ? <span className="text-lg">🥈</span>
                      : idx === 2 ? <span className="text-lg">🥉</span>
                      : <span className="text-xs text-gray-500">{idx + 1}</span>}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {player.displayName?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                        {player.displayName}
                        {showEntry && <span className="text-gray-500 font-normal"> — {player.entryName}</span>}
                      </span>
                      {isMe && <span className="text-xs text-yellow-400">(You)</span>}
                    </div>
                    <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">
                        Exact: <strong className="text-green-400">{player.exactHits || 0}</strong>
                      </span>
                      <span className="text-xs text-gray-500">
                        Outcome: <strong className="text-blue-400">{player.outcomeHits || 0}</strong>
                      </span>
                      {(player.qualificationPoints || 0) > 0 && (
                        <span className="text-xs text-gray-500">
                          Group Qualif.: <strong className="text-orange-400">+{player.qualificationPoints}</strong>
                        </span>
                      )}
                      {(player.playoffPoints || 0) > 0 && (
                        <span className="text-xs text-gray-500">
                          Knockout: <strong className="text-yellow-400">+{player.playoffPoints}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-yellow-400">{player.totalPoints || 0}</div>
                    <div className="text-xs text-gray-500">pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No players have joined the game yet or no picks scored.
        </p>
      )}

      {/* Match Picks Explorer — below leaderboard */}
      <MatchPicksExplorer
        memberPlayers={memberPlayers}
        allPicks={allPicks}
        resultsByMatchId={resultsByMatchId}
        currentUserId={currentUserId}
      />

      <p className="text-xs text-gray-500">
        Share invite code <strong className="text-gray-400 font-mono">{group.inviteCode}</strong> or copy the invite link to add friends.
      </p>
    </div>
  )
}

// ── Groups summary (top card) ─────────────────────────────────────────────────
function MySummary({ groups, currentUserId, players }) {
  if (!groups.length) return null
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-400" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Groups I've Joined</p>
      </div>
      <div className="divide-y divide-f1light">
        {groups.map((group) => {
          const memberPlayers = players.filter((p) =>
            group.members?.some(m => m.userId === p.userId && (m.entryNumber ?? 1) === (p.entryNumber ?? 1))
          )
          const sorted = [...memberPlayers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
          const myRank = sorted.findIndex((p) => p.userId === currentUserId) + 1
          const me = sorted.find((p) => p.userId === currentUserId)
          return (
            <div key={group.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{group.name}</p>
                <p className="text-xs text-gray-500">{group.members?.length || 1} members</p>
                {/* Entry chips — show which entry the current user has in this group */}
                {(() => {
                  const myMemberships = (group.members || []).filter(m => m.userId === currentUserId)
                  if (myMemberships.length === 0) return null
                  return (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {myMemberships.map(m => {
                        const p = players.find(pl => pl.userId === m.userId && (pl.entryNumber ?? 1) === (m.entryNumber ?? 1))
                        const label = p?.entryName ?? `Entry ${m.entryNumber ?? 1}`
                        return (
                          <span key={`${m.userId}_${m.entryNumber ?? 1}`} className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-medium">
                            🎯 {label}
                          </span>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {myRank > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Rank</p>
                    <p className="text-sm font-black text-white">#{myRank}</p>
                  </div>
                )}
                {me && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Pts</p>
                    <p className="text-sm font-black text-yellow-400">{me.totalPoints || 0}</p>
                  </div>
                )}
                <span className="text-xs font-mono text-gray-500 bg-f1dark border border-f1light px-2 py-1 rounded-lg">
                  {group.inviteCode}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WCGroupsPage() {
  const { user } = useAuth()
  const { players, allPicks, resultsByMatchId, myEntries, activeEntryNum, reload } = useWCGame()

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(false)
  const [joinEntryNum, setJoinEntryNum] = useState(1)

  const loadGroups = async () => {
    if (!user) return
    const g = await getWCGroupsForUser(user.uid)
    setGroups(g)
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [user])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setWorking(true)
    setError(null)
    try {
      await createGroup({ name: groupName.trim(), createdBy: user.uid, gameId: WC_GAME_ID, inviteCode: generateCode(), entryNumber: joinEntryNum })
      setGroupName('')
      setMode(null)
      await loadGroups()
    } catch (err) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setWorking(true)
    setError(null)
    try {
      await joinGroupByCode(inviteCode.trim().toUpperCase(), user.uid, joinEntryNum)
      setInviteCode('')
      setMode(null)
      await loadGroups()
    } catch (err) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-blue-800">My Groups</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setMode(mode === 'create' ? null : 'create'); setError(null) }}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
          <button
            onClick={() => { setMode(mode === 'join' ? null : 'join'); setError(null) }}
            className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"
          >
            <LogIn className="w-4 h-4" /> Join
          </button>
        </div>
      </div>

      {/* Create form */}
      {mode === 'create' && (
        <div className="card border-yellow-700/40">
          <h3 className="font-semibold text-white mb-3">Create New Group</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text" className="input-field"
              placeholder="Group name (e.g. Office Champions)"
              value={groupName} onChange={(e) => setGroupName(e.target.value)}
              maxLength={40} required autoFocus
            />
            {myEntries.length > 1 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Join with which entry?</p>
                <div className="flex gap-2">
                  {myEntries.map(e => (
                    <button key={e.entryNumber} type="button"
                      onClick={() => setJoinEntryNum(e.entryNumber ?? 1)}
                      className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                        joinEntryNum === (e.entryNumber ?? 1)
                          ? 'bg-yellow-600 border-yellow-600 text-white'
                          : 'bg-f1dark border-f1light text-gray-400'
                      }`}
                    >{e.entryName ?? `Entry ${e.entryNumber ?? 1}`}</button>
                  ))}
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={working}>
                {working ? 'Creating…' : 'Create Group'}
              </button>
              <button type="button" className="btn-secondary px-4" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <div className="card border-blue-700/40">
          <h3 className="font-semibold text-white mb-3">Join a Group</h3>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text" className="input-field uppercase tracking-widest font-mono"
              placeholder="Enter 6-digit code (e.g. AB12CD)"
              value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6} required autoFocus
            />
            {myEntries.length > 1 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Join with which entry?</p>
                <div className="flex gap-2">
                  {myEntries.map(e => (
                    <button key={e.entryNumber} type="button"
                      onClick={() => setJoinEntryNum(e.entryNumber ?? 1)}
                      className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                        joinEntryNum === (e.entryNumber ?? 1)
                          ? 'bg-yellow-600 border-yellow-600 text-white'
                          : 'bg-f1dark border-f1light text-gray-400'
                      }`}
                    >{e.entryName ?? `Entry ${e.entryNumber ?? 1}`}</button>
                  ))}
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={working}>
                {working ? 'Joining…' : 'Join Group'}
              </button>
              <button type="button" className="btn-secondary px-4" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Groups viewer */}
      {loading ? (
        <div className="card text-center py-10 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading groups…
        </div>
      ) : groups.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">No groups yet</h3>
          <p className="text-gray-400 text-sm">Create a group or join one with an invite code to compete with friends.</p>
        </div>
      ) : (
        <>
          <MySummary groups={groups} currentUserId={user.uid} players={players} />
          <GroupViewer
            groups={groups}
            currentUserId={user.uid}
            players={players}
            allPicks={allPicks}
            resultsByMatchId={resultsByMatchId}
            onGroupsChanged={loadGroups}
            reloadPlayers={reload}
          />
        </>
      )}
    </div>
  )
}
