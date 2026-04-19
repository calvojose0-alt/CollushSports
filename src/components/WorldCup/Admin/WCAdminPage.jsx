// Admin page — enter World Cup match results and trigger scoring
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGame } from '@/hooks/useWCGame'
import {
  saveMatchResult,
  deleteMatchResult,
  updateTournamentMeta,
  getWCGroupsForUser,
  clearGroupStageResultsAndPicks,
  clearKnockoutResults,
} from '@/services/firebase/wc2026Service'
import {
  processMatchResult,
  recalculateAllPlayerTotals,
  recalculatePlayoffPoints,
  markGroupStageLeader,
  computeGroupStandings,
} from '@/services/gameEngine/wc2026Engine'
import { SCORING, GROUP_LETTERS, WC_TEAMS, PLAYOFF_ROUNDS } from '@/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES, getGroupMatches } from '@/data/wc2026Schedule'

// ── Bracket layout constants (shared with visual bracket) ─────────────────────
const B_CARD_H  = 80
const B_GAP     = 6
const B_UNIT    = B_CARD_H + B_GAP
const B_TOTAL_H = 16 * B_UNIT
const B_COL_W   = 186
const B_CONN_W  = 44
const B_HDR_H   = 36

const B_STAGE_IDX    = { r32: 0, r16: 1, qf: 2, sf: 3, final: 4 }
const B_STAGE_LABELS = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarterfinals', sf: 'Semifinals', final: 'Final' }

function bCardTop(roundIdx, matchIdx) {
  const step   = B_UNIT * Math.pow(2, roundIdx)
  const offset = roundIdx === 0 ? 0 : (step - B_UNIT) / 2
  return matchIdx * step + offset
}

function bResolveSlot(slot, slotMap, picks) {
  if (!slot) return null
  if (slot.startsWith('W_')) return picks['ko_' + slot.slice(2)] || null
  if (slot.startsWith('3rd') || slot.startsWith('L_')) return null
  return slotMap[slot] || null  // handles 1X, 2X, 3X, and 3XXXX (best-3rd) slots
}

// Backtracking assignment of top-8 3rd-place teams to R32 slot codes.
// Greedy ordering can leave slots empty when teams shared across slots get
// consumed early. Backtracking finds a valid assignment whenever one exists,
// while still preferring higher-ranked teams (qualified is sorted best-first).
function assignBestThird(qualified, r32ThirdCodes) {
  const result = {}
  const used   = new Set()
  function bt(i) {
    if (i === r32ThirdCodes.length) return true
    const eligible = r32ThirdCodes[i].slice(1).split('')
    for (const team of qualified) {
      if (!used.has(team.teamId) && eligible.includes(team.group)) {
        used.add(team.teamId)
        result[r32ThirdCodes[i]] = team.teamId
        if (bt(i + 1)) return true
        used.delete(team.teamId)
        delete result[r32ThirdCodes[i]]
      }
    }
    return false
  }
  bt(0)
  return result
}

// Rank all 12 third-place teams and assign the top 8 to the R32 "3XXXX" slot codes.
// Mutates `map` in place; call after the group standings loop.
function computeThirdPlaceAssignments(map, resultsById) {
  const allThirdPlace = []
  GROUP_LETTERS.forEach((group) => {
    const groupMatchList = GROUP_MATCHES.filter((m) => m.group === group)
    const picks = groupMatchList.map((m) => {
      const r = resultsById[m.id]
      return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: r?.homeScore ?? null, awayScore: r?.awayScore ?? null }
    })
    const standings = computeGroupStandings(group, picks)
    if (standings[2]) allThirdPlace.push({ group, ...standings[2] })
  })
  // Rank all 12 third-place teams; top 8 advance to R32.
  allThirdPlace.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  const qualified = allThirdPlace.slice(0, 8)
  // Collect the unique 3XXXX slot codes from R32 matches.
  const r32ThirdCodes = []
  KNOCKOUT_MATCHES.filter((m) => m.stage === 'r32').forEach((m) => {
    if (/^3[A-L]{2,}/.test(m.homeSlot) && !r32ThirdCodes.includes(m.homeSlot)) r32ThirdCodes.push(m.homeSlot)
    if (/^3[A-L]{2,}/.test(m.awaySlot) && !r32ThirdCodes.includes(m.awaySlot)) r32ThirdCodes.push(m.awaySlot)
  })
  // Use backtracking to guarantee all eligible slots are filled.
  const assigned = assignBestThird(qualified, r32ThirdCodes)
  Object.assign(map, assigned)
}

function bFormatSlot(slot) {
  if (!slot || slot.startsWith('W_')) return 'TBD'
  if (/^3[A-L]{2,}/.test(slot)) return `Best 3rd · ${slot.slice(1)}`
  if (slot.startsWith('3rd') || slot.startsWith('L_')) return 'TBD'
  return slot
}

function bCascadeClear(matchId, removedTeam, picks) {
  const nextStage =
    matchId.includes('_r32_') ? 'r16'   :
    matchId.includes('_r16_') ? 'qf'    :
    matchId.includes('_qf_')  ? 'sf'    :
    matchId.includes('_sf_')  ? 'final' : null
  if (!nextStage) return
  const num = matchId.match(/_(\d+)$/)?.[1]
  if (!num) return
  const nextId = `ko_${nextStage}_${Math.ceil(parseInt(num) / 2)}`
  if (picks[nextId] === removedTeam) { picks[nextId] = null; bCascadeClear(nextId, removedTeam, picks) }
}

// ── Admin bracket sub-components ─────────────────────────────────────────────
function AdminConnector({ fromRoundIdx, pairCount }) {
  const elems = []
  for (let i = 0; i < pairCount; i++) {
    const y0 = bCardTop(fromRoundIdx, i * 2)     + B_CARD_H / 2
    const y1 = bCardTop(fromRoundIdx, i * 2 + 1) + B_CARD_H / 2
    const yd = bCardTop(fromRoundIdx + 1, i)      + B_CARD_H / 2
    const mx = B_CONN_W / 2
    elems.push(
      <g key={i} stroke="#374151" strokeWidth="1.5" fill="none">
        <line x1="0"       y1={y0} x2={mx}      y2={y0} />
        <line x1="0"       y1={y1} x2={mx}      y2={y1} />
        <line x1={mx}      y1={y0} x2={mx}      y2={y1} />
        <line x1={mx}      y1={yd} x2={B_CONN_W} y2={yd} />
      </g>
    )
  }
  return (
    <svg width={B_CONN_W} height={B_TOTAL_H + B_HDR_H}
      style={{ flexShrink: 0, marginTop: B_HDR_H }} aria-hidden="true">
      {elems}
    </svg>
  )
}

function AdminTeamSlot({ teamId, slotLabel, selected, onClick }) {
  const team = teamId ? WC_TEAMS[teamId] : null
  return (
    <div
      onClick={teamId ? onClick : undefined}
      className={`flex items-center gap-1.5 px-2 transition-colors
        ${teamId ? 'cursor-pointer' : 'cursor-default'}
        ${selected ? 'bg-green-600/30 text-white' : team ? 'hover:bg-white/5 text-gray-200' : 'text-gray-500'}
      `}
      style={{ height: (B_CARD_H - 28) / 2 }}
    >
      {team ? (
        <>
          <span className="text-[13px] leading-none flex-shrink-0">{team.flag}</span>
          <span className={`text-[11px] font-semibold truncate ${selected ? 'text-white' : ''}`}>
            {team.shortName}
          </span>
          {selected && <span className="ml-auto text-green-400 text-[9px]">✓</span>}
        </>
      ) : (
        <>
          <span className="w-3.5 h-3.5 rounded-full bg-gray-700 flex-shrink-0" />
          <span className="text-[9px] text-gray-600 truncate">{bFormatSlot(slotLabel)}</span>
        </>
      )}
    </div>
  )
}

function AdminMatchCard({ match, homeTeamId, awayTeamId, picked, saved, onPick, onSave, saving }) {
  const fmtDate = (d) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
  const isDirty = picked && picked !== saved
  return (
    <div className="border rounded overflow-hidden flex flex-col select-none"
      style={{ height: B_CARD_H, borderColor: saved ? '#16a34a' : picked ? '#ca8a04' : '#4B5563', background: '#1F2937' }}>
      {/* Venue / save button row */}
      <div className="px-2 flex items-center justify-between flex-shrink-0 bg-gray-900/60 border-b border-gray-700/50"
        style={{ height: 16 }}>
        <span className="text-[8px] text-gray-500 uppercase tracking-wide truncate flex-1 mr-1">{match.venue || ''}</span>
        {isDirty && (
          <button
            onClick={(e) => { e.stopPropagation(); onSave() }}
            disabled={saving}
            className="flex items-center gap-0.5 bg-green-700 hover:bg-green-600 text-white rounded px-1 py-px text-[8px] font-bold leading-none flex-shrink-0 transition-colors disabled:opacity-50"
          >
            {saving ? '…' : '✓ Save'}
          </button>
        )}
        {saved && !isDirty && (
          <span className="text-[8px] text-green-500 font-bold flex-shrink-0">✓</span>
        )}
      </div>
      <AdminTeamSlot
        teamId={homeTeamId} slotLabel={match.homeSlot}
        selected={picked === homeTeamId && !!homeTeamId}
        onClick={() => onPick(homeTeamId)}
      />
      <div className="border-t border-gray-700/40 flex-shrink-0" />
      <AdminTeamSlot
        teamId={awayTeamId} slotLabel={match.awaySlot}
        selected={picked === awayTeamId && !!awayTeamId}
        onClick={() => onPick(awayTeamId)}
      />
      <div className="px-2 flex items-center justify-between flex-shrink-0 bg-gray-900/40 border-t border-gray-700/40"
        style={{ height: 12 }}>
        <span className="text-[8px] text-gray-600">{fmtDate(match.date)}</span>
        <span className="text-[8px] text-gray-600">{match.time || ''}</span>
      </div>
    </div>
  )
}

function AdminBracketColumn({ stage, matches, slotMap, adminPicks, savedPicks, savingMatch, onPick, onSave }) {
  const roundIdx = B_STAGE_IDX[stage]
  return (
    <div style={{ width: B_COL_W, flexShrink: 0 }}>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center border-b border-gray-700/60"
        style={{ height: B_HDR_H, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
        {B_STAGE_LABELS[stage]}
      </div>
      <div className="relative" style={{ height: B_TOTAL_H }}>
        {matches.map((match, matchIdx) => {
          const homeTeamId = bResolveSlot(match.homeSlot, slotMap, adminPicks)
          const awayTeamId = bResolveSlot(match.awaySlot, slotMap, adminPicks)
          return (
            <div key={match.id}
              style={{ position: 'absolute', top: bCardTop(roundIdx, matchIdx), left: 0, right: 0 }}>
              <AdminMatchCard
                match={match}
                homeTeamId={homeTeamId}
                awayTeamId={awayTeamId}
                picked={adminPicks[match.id] || null}
                saved={savedPicks[match.id] || null}
                saving={savingMatch === match.id}
                onPick={(teamId) => onPick(match.id, teamId)}
                onSave={() => onSave(match.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
import {
  Settings, CheckCircle2, AlertCircle, Loader, Trash2, Pencil,
  Lock, Trophy, Globe, Flag, FlaskConical,
} from 'lucide-react'
import { seedTestUsers, removeTestUsers, TEST_USERS } from '@/services/firebase/wcTestSeeder'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

// ── Group Stage Admin ─────────────────────────────────────────────────────────
function GroupStageAdmin({ matchResults, onRefresh, resultsByMatchId }) {
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [scores, setScores] = useState({}) // { matchId: { home, away } }
  const [processing, setProcessing] = useState(null)
  const [msg, setMsg] = useState(null)

  const groupMatches = getGroupMatches(selectedGroup)

  const getVal = (matchId, side) => {
    if (scores[matchId]?.[side] !== undefined) return scores[matchId][side]
    const r = resultsByMatchId[matchId]
    return r ? (side === 'home' ? r.homeScore : r.awayScore) : ''
  }

  const handleChange = (matchId, side, val) => {
    setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: val } }))
  }

  const handleSaveAndScore = async (match) => {
    const hs = parseInt(getVal(match.id, 'home'), 10)
    const as = parseInt(getVal(match.id, 'away'), 10)
    if (isNaN(hs) || isNaN(as)) {
      setMsg({ type: 'error', text: 'Enter valid scores for both teams.' })
      return
    }
    setProcessing(match.id)
    setMsg(null)
    try {
      const result = { homeScore: hs, awayScore: as, status: 'final' }
      await saveMatchResult({ matchId: match.id, homeScore: hs, awayScore: as })
      await processMatchResult(match.id, result)
      await onRefresh()
      setMsg({ type: 'success', text: `${match.id} saved and scored.` })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setProcessing(null)
    }
  }

  const handleDelete = async (matchId) => {
    if (!confirm('Delete this result? Player points will be recalculated.')) return
    setProcessing(matchId)
    setMsg(null)
    try {
      await deleteMatchResult(matchId)
      // Clear local score state for this match
      setScores((prev) => { const n = { ...prev }; delete n[matchId]; return n })
      await recalculateAllPlayerTotals()
      await onRefresh()
      setMsg({ type: 'success', text: 'Result deleted and points recalculated.' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Flag className="w-4 h-4 text-yellow-400" /> Group Stage Results
      </h3>

      {/* Group tabs */}
      <div className="flex gap-1 flex-wrap">
        {GROUP_LETTERS.map((g) => {
          const done = getGroupMatches(g).filter((m) => resultsByMatchId[m.id]).length
          const total = getGroupMatches(g).length
          return (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                g === selectedGroup ? 'bg-yellow-600 text-white' : 'bg-f1dark border border-f1light text-gray-400'
              }`}
            >
              {g}
              {done > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold ${
                  done === total ? 'bg-green-500 text-white' : 'bg-yellow-600 text-white'
                }`}>
                  {done}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {[1,2,3].map((md) => (
          <div key={md}>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Matchday {md}</p>
            {groupMatches.filter((m) => m.matchday === md).map((match) => {
              const ht = WC_TEAMS[match.homeTeam]
              const at = WC_TEAMS[match.awayTeam]
              const existing = resultsByMatchId[match.id]
              const isProcessing = processing === match.id
              return (
                <div key={match.id} className={`card mb-2 ${existing ? 'border-green-700/30 bg-green-900/10' : ''}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Teams */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg">{ht?.flag}</span>
                      <span className="text-sm font-semibold text-white">{ht?.shortName}</span>
                      <span className="text-gray-500 text-sm">vs</span>
                      <span className="text-sm font-semibold text-white">{at?.shortName}</span>
                      <span className="text-lg">{at?.flag}</span>
                    </div>
                    {/* Score inputs */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number" min="0" max="20"
                        value={getVal(match.id, 'home')}
                        onChange={(e) => handleChange(match.id, 'home', e.target.value)}
                        className="w-12 h-9 text-center font-bold bg-f1dark border border-f1light rounded-lg text-white focus:outline-none focus:border-yellow-500"
                        placeholder="–"
                      />
                      <span className="text-gray-500 font-bold">–</span>
                      <input
                        type="number" min="0" max="20"
                        value={getVal(match.id, 'away')}
                        onChange={(e) => handleChange(match.id, 'away', e.target.value)}
                        className="w-12 h-9 text-center font-bold bg-f1dark border border-f1light rounded-lg text-white focus:outline-none focus:border-yellow-500"
                        placeholder="–"
                      />
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSaveAndScore(match)}
                        disabled={!!processing}
                        className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold text-xs px-3 py-2 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        {isProcessing
                          ? <Loader className="w-3.5 h-3.5 animate-spin" />
                          : existing ? <Pencil className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />
                        }
                        {existing ? 'Update' : 'Save & Score'}
                      </button>
                      {existing && (
                        <button
                          onClick={() => handleDelete(match.id)}
                          disabled={!!processing}
                          className="flex items-center gap-1 bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {existing && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {existing.homeScore}–{existing.awayScore}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {msg && <MessageBox msg={msg} />}
    </div>
  )
}

// ── Playoff Results Admin — Visual Bracket ────────────────────────────────────
function PlayoffAdmin({ onRefresh }) {
  const { resultsByMatchId, completedGroupMatches, totalGroupMatches } = useWCGame()
  // adminPicks: working UI state (selected but maybe not saved yet)
  const [adminPicks, setAdminPicks] = useState({})
  // savedPicks: confirmed/scored results { matchId: teamId }
  const [savedPicks, setSavedPicks] = useState({})
  const [savingMatch, setSavingMatch] = useState(null) // matchId currently being saved
  const [msg, setMsg] = useState(null)
  const initializedRef = useRef(false)

  // ── Initialize admin bracket from previously saved knockout results in DB ──
  useEffect(() => {
    if (initializedRef.current) return
    const koIds = KNOCKOUT_MATCHES.map((m) => m.id)
    const hasKo = koIds.some((id) => resultsByMatchId[id]?.status === 'final' && resultsByMatchId[id]?.homeTeam)
    if (!hasKo) return
    initializedRef.current = true
    const loaded = {}
    koIds.forEach((id) => {
      const r = resultsByMatchId[id]
      if (r?.status === 'final' && r?.homeTeam) loaded[id] = r.homeTeam
    })
    setSavedPicks(loaded)
    setAdminPicks(loaded)
  }, [resultsByMatchId])

  // Build slot map from actual group stage results
  const slotMap = useMemo(() => {
    const map = {}
    GROUP_LETTERS.forEach((group) => {
      const groupMatchList = GROUP_MATCHES.filter((m) => m.group === group)
      const picks = groupMatchList.map((m) => {
        const r = resultsByMatchId[m.id]
        return {
          homeTeam: m.homeTeam, awayTeam: m.awayTeam,
          homeScore: r?.homeScore ?? null, awayScore: r?.awayScore ?? null,
        }
      })
      const standingsMap = computeGroupStandings(group, picks)
      const sorted = Object.values(standingsMap).sort((a, b) =>
        b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
      )
      sorted.forEach((s, idx) => { map[`${idx + 1}${group}`] = s.teamId })
    })
    // Assign the 8 best 3rd-place teams to their R32 slots (e.g. "3ABCDF")
    computeThirdPlaceAssignments(map, resultsByMatchId)
    return map
  }, [resultsByMatchId])

  // Build actualRounds sets from a given picks object
  const groupStageComplete = completedGroupMatches >= totalGroupMatches && totalGroupMatches > 0

  const buildRounds = useCallback((picks) => {
    const r32Set = new Set()
    // Only award R32 points once ALL group matches are complete — prevents
    // premature scoring when the admin saves knockout results mid-group-stage.
    if (groupStageComplete) {
      KNOCKOUT_MATCHES.filter((m) => m.stage === 'r32').forEach((m) => {
        const home = bResolveSlot(m.homeSlot, slotMap, {})
        const away = bResolveSlot(m.awaySlot, slotMap, {})
        if (home) r32Set.add(home)
        if (away) r32Set.add(away)
      })
    }
    const r16Set = new Set(KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').map(m => picks[m.id]).filter(Boolean))
    const qfSet  = new Set(KNOCKOUT_MATCHES.filter(m => m.stage === 'r16').map(m => picks[m.id]).filter(Boolean))
    const sfSet  = new Set(KNOCKOUT_MATCHES.filter(m => m.stage === 'qf') .map(m => picks[m.id]).filter(Boolean))
    const finalM = KNOCKOUT_MATCHES.find(m => m.stage === 'final')
    const winnerSet = new Set(finalM && picks[finalM.id] ? [picks[finalM.id]] : [])
    return { r32: r32Set, r16: r16Set, qf: qfSet, sf: sfSet, winner: winnerSet }
  }, [slotMap, groupStageComplete])

  const handlePick = useCallback((matchId, teamId) => {
    setAdminPicks((prev) => {
      const next = { ...prev }
      const prevWinner = next[matchId]
      if (prevWinner === teamId) {
        next[matchId] = null
        bCascadeClear(matchId, teamId, next)
      } else {
        if (prevWinner) bCascadeClear(matchId, prevWinner, next)
        next[matchId] = teamId
      }
      return next
    })
  }, [])

  // Save & score a single match result
  const handleSaveMatch = useCallback(async (matchId) => {
    const winner = adminPicks[matchId]
    if (!winner) return
    setSavingMatch(matchId)
    setMsg(null)
    try {
      // Merge this match into saved picks and score
      const newSaved = { ...savedPicks, [matchId]: winner }
      setSavedPicks(newSaved)
      await recalculatePlayoffPoints(buildRounds(newSaved))

      // Persist winner to wc_match_results so the player bracket overlay can read it
      const koMatch = KNOCKOUT_MATCHES.find((m) => m.id === matchId)
      const homeResolved = koMatch ? bResolveSlot(koMatch.homeSlot, slotMap, adminPicks) : null
      const awayResolved = koMatch ? bResolveSlot(koMatch.awaySlot, slotMap, adminPicks) : null
      const loser = winner === homeResolved ? awayResolved : homeResolved
      await saveMatchResult({ matchId, homeScore: 1, awayScore: 0, homeTeam: winner, awayTeam: loser || null })

      await onRefresh()
      setMsg({ type: 'success', text: `${WC_TEAMS[winner]?.shortName || winner} saved & scored.` })
      setTimeout(() => setMsg(null), 3000)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSavingMatch(null)
    }
  }, [adminPicks, savedPicks, buildRounds, slotMap, onRefresh])

  const savedCount = Object.values(savedPicks).filter(Boolean).length
  const totalMatches = 31
  const finalMatch = KNOCKOUT_MATCHES.find((m) => m.stage === 'final')
  const champion   = finalMatch && savedPicks[finalMatch.id] ? WC_TEAMS[savedPicks[finalMatch.id]] : null
  const columns    = ['r32', 'r16', 'qf', 'sf', 'final'].map((stage) => ({
    stage,
    matches: KNOCKOUT_MATCHES.filter((m) => m.stage === stage),
  }))

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Globe className="w-4 h-4 text-green-400" /> Knockout — Enter Actual Results
      </h3>
      <p className="text-xs text-gray-400">
        Click the winning team, then press <strong className="text-green-400">✓ Save</strong> on each card to score that match individually.
      </p>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.round((savedCount / totalMatches) * 100)}%` }} />
        </div>
        <span className="text-xs text-gray-400">{savedCount}/{totalMatches} results saved</span>
        <button
          onClick={async () => {
            try {
              await recalculatePlayoffPoints(buildRounds(savedPicks))
              await onRefresh()
              setMsg({ type: 'success', text: 'All knockout points recalculated.' })
              setTimeout(() => setMsg(null), 3000)
            } catch (err) {
              setMsg({ type: 'error', text: err.message })
            }
          }}
          className="text-xs text-yellow-400 hover:text-yellow-300 underline transition-colors flex-shrink-0"
        >
          ↺ Recalculate
        </button>
      </div>

      {/* Warning: R32 points only awarded when group stage is complete */}
      {!groupStageComplete && (
        <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            R32 qualification points (+{SCORING.PLAYOFF_R32}/team) will only be awarded once all {totalGroupMatches} group stage matches are entered
            ({completedGroupMatches}/{totalGroupMatches} done).
          </span>
        </div>
      )}

      {/* Champion banner */}
      {champion && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-900/30 border border-green-600/40">
          <Trophy className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-sm font-bold text-white">
            {champion.flag} {champion.name}
            <span className="text-green-400 font-normal text-xs ml-2">— Champion</span>
          </p>
        </div>
      )}

      {/* Save message */}
      {msg && <MessageBox msg={msg} />}

      {/* Visual bracket */}
      <div className="overflow-x-auto pb-4">
        <div
          className="flex items-start"
          style={{ minWidth: columns.length * B_COL_W + (columns.length - 1) * B_CONN_W + 8 }}
        >
          {columns.map(({ stage, matches }, colIdx) => (
            <div key={stage} className="flex items-start">
              <AdminBracketColumn
                stage={stage}
                matches={matches}
                slotMap={slotMap}
                adminPicks={adminPicks}
                savedPicks={savedPicks}
                savingMatch={savingMatch}
                onPick={handlePick}
                onSave={handleSaveMatch}
              />
              {colIdx < columns.length - 1 && (
                <AdminConnector
                  fromRoundIdx={B_STAGE_IDX[stage]}
                  pairCount={matches.length}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Tournament Settings Admin ──────────────────────────────────────────────────
function TournamentSettingsAdmin({ tournamentMeta, onRefresh }) {
  const [actualGoals, setActualGoals] = useState(tournamentMeta?.actualTotalGoals ?? '')
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleMarkGroupStageDone = async () => {
    if (!confirm('Mark group stage as finalized? This will set the Group Stage Leader (G) badge.')) return
    setProcessing(true)
    setMsg(null)
    try {
      await markGroupStageLeader()
      await onRefresh()
      setMsg({ type: 'success', text: 'Group stage finalized. Group Stage Leader marked.' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveGoals = async () => {
    const v = parseInt(actualGoals, 10)
    if (isNaN(v)) {
      setMsg({ type: 'error', text: 'Enter a valid number.' })
      return
    }
    setProcessing(true)
    setMsg(null)
    try {
      await updateTournamentMeta({ actualTotalGoals: v })
      await onRefresh()
      setMsg({ type: 'success', text: `Total goals set to ${v}.` })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setProcessing(false)
    }
  }

  const handleFinishTournament = async () => {
    if (!confirm('Mark tournament as finished? This will finalize the champion.')) return
    setProcessing(true)
    setMsg(null)
    try {
      await updateTournamentMeta({ tournamentFinished: true })
      await onRefresh()
      setMsg({ type: 'success', text: 'Tournament marked as finished.' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" /> Tournament Settings
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Actual total goals */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-1">Actual Total Goals (Tiebreaker 3)</p>
          <p className="text-xs text-gray-400 mb-3">Enter total goals scored across the tournament for tie-breaking.</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="999"
              value={actualGoals}
              onChange={(e) => setActualGoals(e.target.value)}
              className="input-field w-24 text-center font-bold"
              placeholder="e.g. 172"
            />
            <button onClick={handleSaveGoals} disabled={processing} className="btn-primary text-sm flex items-center gap-1.5">
              {processing ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save
            </button>
          </div>
          {tournamentMeta?.actualTotalGoals !== null && tournamentMeta?.actualTotalGoals !== undefined && (
            <p className="text-xs text-green-400 mt-2">Current: {tournamentMeta.actualTotalGoals}</p>
          )}
        </div>

        {/* Group stage finalization */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-1">Group Stage Leader (G Badge)</p>
          <p className="text-xs text-gray-400 mb-3">
            Sets the "G" badge on the player with most points after group stage ends.
          </p>
          <button
            onClick={handleMarkGroupStageDone}
            disabled={processing || tournamentMeta?.groupStageFinalized}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            {processing ? <Loader className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
            {tournamentMeta?.groupStageFinalized ? 'Already Finalized ✓' : 'Finalize Group Stage'}
          </button>
        </div>
      </div>

      {/* Finish tournament */}
      <div className="card border-red-700/30">
        <p className="text-sm font-semibold text-white mb-1">End Tournament</p>
        <p className="text-xs text-gray-400 mb-3">Mark tournament as finished to display the Champion banner.</p>
        <button
          onClick={handleFinishTournament}
          disabled={processing || tournamentMeta?.tournamentFinished}
          className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white font-semibold text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Trophy className="w-4 h-4" />
          {tournamentMeta?.tournamentFinished ? 'Tournament Finished ✓' : 'Mark Tournament Finished'}
        </button>
      </div>

      {msg && <MessageBox msg={msg} />}
    </div>
  )
}

function MessageBox({ msg }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm border ${
      msg.type === 'success'
        ? 'bg-green-900/30 border-green-700 text-green-300'
        : 'bg-red-900/30 border-red-700 text-red-300'
    }`}>
      {msg.type === 'success'
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      }
      {msg.text}
    </div>
  )
}

// ── Random Score Fill ─────────────────────────────────────────────────────────
function RandomFillAdmin({ onRefresh, resultsByMatchId }) {
  const [status, setStatus] = useState([])
  const [running, setRunning] = useState(false)

  const randScore = () => Math.floor(Math.random() * 4) // 0–3

  const resolveSlot = (slot, slotMap, koWinners) => {
    if (!slot) return null
    if (slot.startsWith('W_')) return koWinners['ko_' + slot.slice(2)] || null
    if (slot.startsWith('3rd') || slot.startsWith('L_')) return null
    return slotMap[slot] || null  // handles 1X, 2X, and 3XXXX (best-3rd) slots
  }

  const buildSlotMap = (localResults) => {
    const map = {}
    GROUP_LETTERS.forEach((group) => {
      const groupMatchList = GROUP_MATCHES.filter((m) => m.group === group)
      const picks = groupMatchList.map((m) => {
        const r = localResults[m.id]
        return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: r?.homeScore ?? null, awayScore: r?.awayScore ?? null }
      })
      const standingsMap = computeGroupStandings(group, picks)
      const sorted = Object.values(standingsMap).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      sorted.forEach((s, idx) => { map[`${idx + 1}${group}`] = s.teamId })
    })
    // Assign the 8 best 3rd-place teams to their R32 slots (e.g. "3ABCDF")
    computeThirdPlaceAssignments(map, localResults)
    return map
  }

  const fillGroupMatches = async (matches, localResults, log) => {
    for (const match of matches) {
      const hs = randScore()
      const as = randScore()
      await saveMatchResult({ matchId: match.id, homeScore: hs, awayScore: as })
      await processMatchResult(match.id, { homeScore: hs, awayScore: as, status: 'final' })
      localResults[match.id] = { homeScore: hs, awayScore: as, homeTeam: match.homeTeam, awayTeam: match.awayTeam, status: 'final' }
      log(`✓ ${match.id}: ${WC_TEAMS[match.homeTeam]?.shortName} ${hs}–${as} ${WC_TEAMS[match.awayTeam]?.shortName}`)
    }
  }

  const fillKnockoutStage = async (stage, slotMap, koWinners, log) => {
    const matches = KNOCKOUT_MATCHES.filter((m) => m.stage === stage)
    for (const match of matches) {
      const homeTeam = resolveSlot(match.homeSlot, slotMap, koWinners)
      const awayTeam = resolveSlot(match.awaySlot, slotMap, koWinners)
      if (!homeTeam || !awayTeam) {
        log(`⚠ ${match.id}: Could not resolve teams (${match.homeSlot} vs ${match.awaySlot})`)
        continue
      }
      const winner = Math.random() < 0.5 ? homeTeam : awayTeam
      const loser  = winner === homeTeam ? awayTeam : homeTeam
      koWinners[match.id] = winner
      await saveMatchResult({ matchId: match.id, homeScore: null, awayScore: null, homeTeam: winner, awayTeam: loser })
      log(`✓ ${match.id}: ${WC_TEAMS[winner]?.shortName} wins`)
    }
  }

  const buildRoundsFromWinners = (koWinners, slotMap) => {
    const r32Set = new Set()
    // All 32 R32 teams: 1st + 2nd from each group + 8 best 3rd-place qualifiers
    KNOCKOUT_MATCHES.filter((m) => m.stage === 'r32').forEach((m) => {
      const home = resolveSlot(m.homeSlot, slotMap, {})
      const away = resolveSlot(m.awaySlot, slotMap, {})
      if (home) r32Set.add(home)
      if (away) r32Set.add(away)
    })
    const r16Set   = new Set(KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').map(m => koWinners[m.id]).filter(Boolean))
    const qfSet    = new Set(KNOCKOUT_MATCHES.filter(m => m.stage === 'r16').map(m => koWinners[m.id]).filter(Boolean))
    const sfSet    = new Set(KNOCKOUT_MATCHES.filter(m => m.stage === 'qf') .map(m => koWinners[m.id]).filter(Boolean))
    const finalM   = KNOCKOUT_MATCHES.find(m => m.stage === 'final')
    const winnerSet = new Set(finalM && koWinners[finalM.id] ? [koWinners[finalM.id]] : [])
    return { r32: r32Set, r16: r16Set, qf: qfSet, sf: sfSet, winner: winnerSet }
  }

  const handleFill = async (mode) => {
    setStatus([])
    setRunning(true)
    const log = (msg) => setStatus((prev) => [...prev, msg])
    const localResults = { ...resultsByMatchId }
    const koWinners = {}

    try {
      if (mode === 1) {
        log('— Filling first 31 group stage games —')
        await fillGroupMatches(GROUP_MATCHES.slice(0, 31), localResults, log)
      } else if (mode === 2) {
        log('— Filling all 72 group stage games —')
        await fillGroupMatches(GROUP_MATCHES, localResults, log)
      } else if (mode === 3) {
        log('— Filling all 72 group stage games —')
        await fillGroupMatches(GROUP_MATCHES, localResults, log)
        const slotMap = buildSlotMap(localResults)
        log('— Filling Round of 32 —')
        await fillKnockoutStage('r32', slotMap, koWinners, log)
        log('— Filling Round of 16 —')
        await fillKnockoutStage('r16', slotMap, koWinners, log)
        log('— Filling Quarterfinals —')
        await fillKnockoutStage('qf', slotMap, koWinners, log)
        await recalculatePlayoffPoints(buildRoundsFromWinners(koWinners, slotMap))
      } else if (mode === 4) {
        log('— Filling all 72 group stage games —')
        await fillGroupMatches(GROUP_MATCHES, localResults, log)
        const slotMap = buildSlotMap(localResults)
        log('— Filling Round of 32 —')
        await fillKnockoutStage('r32', slotMap, koWinners, log)
        log('— Filling Round of 16 —')
        await fillKnockoutStage('r16', slotMap, koWinners, log)
        log('— Filling Quarterfinals —')
        await fillKnockoutStage('qf', slotMap, koWinners, log)
        log('— Filling Semifinals —')
        await fillKnockoutStage('sf', slotMap, koWinners, log)
        log('— Filling Final —')
        await fillKnockoutStage('final', slotMap, koWinners, log)
        await recalculatePlayoffPoints(buildRoundsFromWinners(koWinners, slotMap))
      }

      log('🎉 Done! Refreshing data...')
      await onRefresh()
    } catch (err) {
      log(`❌ Error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const handleClearGroupStage = async () => {
    setStatus([])
    setRunning(true)
    const log = (msg) => setStatus((prev) => [...prev, msg])
    try {
      log('— Clearing all group stage results —')
      await clearGroupStageResultsAndPicks()
      log('✓ Deleted group stage results & reset pick scores')
      await recalculateAllPlayerTotals()
      log('✓ Player totals recalculated')
      log('🎉 Done!')
      await onRefresh()
    } catch (err) {
      log(`❌ Error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const handleClearKnockoutStage = async () => {
    setStatus([])
    setRunning(true)
    const log = (msg) => setStatus((prev) => [...prev, msg])
    try {
      log('— Clearing all knockout stage results —')
      await clearKnockoutResults()
      log('✓ Deleted knockout match results')
      await recalculatePlayoffPoints({ r32: new Set(), r16: new Set(), qf: new Set(), sf: new Set(), winner: new Set() })
      log('✓ Playoff points reset to 0')
      await recalculateAllPlayerTotals()
      log('✓ Player totals recalculated')
      log('🎉 Done!')
      await onRefresh()
    } catch (err) {
      log(`❌ Error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const FILL_BUTTONS = [
    { mode: 1, label: 'Fill 31 Games',    color: 'bg-blue-700 hover:bg-blue-600' },
    { mode: 2, label: 'Fill 72 Games',    color: 'bg-green-700 hover:bg-green-600' },
    { mode: 3, label: 'Fill Through QF',  color: 'bg-orange-700 hover:bg-orange-600' },
    { mode: 4, label: 'Fill Entire',      color: 'bg-red-700 hover:bg-red-600' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Random Score Fill</p>
      <div className="card bg-yellow-900/60 border-yellow-600 text-xs text-yellow-200">
        Fills matches with random scores (0–3 each team) and saves + scores them. Existing results will be overwritten.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {FILL_BUTTONS.map(({ mode, label, color }) => (
          <button
            key={mode}
            onClick={() => handleFill(mode)}
            disabled={running}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${color} text-white`}
          >
            {label}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-600 mx-1" />

        <button
          onClick={handleClearGroupStage}
          disabled={running}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 bg-gray-700 hover:bg-red-900 border border-gray-600 hover:border-red-700 text-gray-200"
        >
          Clear Group Stage
        </button>
        <button
          onClick={handleClearKnockoutStage}
          disabled={running}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 bg-gray-700 hover:bg-red-900 border border-gray-600 hover:border-red-700 text-gray-200"
        >
          Clear Knockout Stage
        </button>
      </div>

      {status.length > 0 && (
        <div className="card bg-gray-900 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
          {running && <div className="text-yellow-400 flex items-center gap-1"><Loader className="w-3 h-3 animate-spin" /> Running...</div>}
          {status.map((line, i) => (
            <div key={i} className={
              line.startsWith('✓') || line.startsWith('🎉') ? 'text-green-400' :
              line.startsWith('❌') ? 'text-red-400' :
              line.startsWith('⚠') ? 'text-yellow-400' : 'text-gray-500'
            }>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dev Tools — test data seeder ─────────────────────────────────────────────
function DevToolsAdmin({ onRefresh, resultsByMatchId }) {
  const [status, setStatus] = useState([])
  const [running, setRunning] = useState(false)

  const log = (msg) => setStatus((prev) => [...prev, msg])

  const handleSeed = async () => {
    setStatus([])
    setRunning(true)
    try {
      await seedTestUsers(log)
    } catch (err) {
      log(`❌ Error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const handleRemove = async () => {
    setStatus([])
    setRunning(true)
    try {
      await removeTestUsers(log)
    } catch (err) {
      log(`❌ Error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <RandomFillAdmin onRefresh={onRefresh} resultsByMatchId={resultsByMatchId} />

      <div className="border-t border-f1light pt-4 space-y-4">
        <div className="card bg-purple-900/20 border-purple-700/40 text-xs text-black">
          <strong>Dev only.</strong> Inserts 3 simulated players with full picks. Safe to run multiple times (upserts). Remove cleans up all test data.
        </div>

        {/* Test users summary */}
        <div className="card space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Test Users</p>
          {TEST_USERS.map((u) => (
            <div key={u.userId} className="flex items-center gap-3 text-sm">
              <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {u.displayName[0]}
              </div>
              <div>
                <span className="text-white font-semibold">{u.displayName}</span>
                <span className="ml-2 text-gray-500 text-xs font-mono">{u.userId}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-700 hover:bg-purple-600 text-white disabled:opacity-50 transition-colors"
          >
            {running ? <Loader className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Seed Test Users
          </button>
          <button
            onClick={handleRemove}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-f1dark border border-red-800 text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
          >
            {running ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remove Test Users
          </button>
        </div>

        {/* Log output */}
        {status.length > 0 && (
          <div className="card bg-gray-900 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
            {status.map((line, i) => (
              <div key={i} className={
                line.startsWith('✓') || line.startsWith('🎉') ? 'text-green-400' :
                line.startsWith('❌') ? 'text-red-400' :
                line.startsWith('⚠') ? 'text-yellow-400' : 'text-gray-400'
              }>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────────────────
export default function WCAdminPage() {
  const { user } = useAuth()
  const { matchResults, resultsByMatchId, tournamentMeta, refreshResults, reload } = useWCGame()
  const [activeTab, setActiveTab] = useState('group')

  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="card text-center py-16">
        <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-white font-bold">Admin only</p>
      </div>
    )
  }

  const handleRefresh = async () => {
    await refreshResults()
    await reload()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-blue-800">World Cup Admin</h2>
      </div>

      <div className="card bg-gray-900 border-yellow-700/60 text-xs text-yellow-300">
        <strong>Admin only.</strong> Enter match results to automatically score all player picks. Use "Update" to correct mistakes.
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'group',    label: 'Group Stage' },
          { id: 'playoff',  label: 'Knockout Rounds' },
          { id: 'settings', label: 'Tournament' },
          { id: 'devtools', label: '🧪 Dev Tools' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? tab.id === 'devtools' ? 'bg-purple-700 text-white' : 'bg-yellow-600 text-white'
                : 'bg-f1dark border border-f1light text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'group'    && <GroupStageAdmin matchResults={matchResults} onRefresh={handleRefresh} resultsByMatchId={resultsByMatchId} />}
      {activeTab === 'playoff'  && <PlayoffAdmin onRefresh={handleRefresh} />}
      {activeTab === 'settings' && <TournamentSettingsAdmin tournamentMeta={tournamentMeta} onRefresh={handleRefresh} />}
      {activeTab === 'devtools' && <DevToolsAdmin onRefresh={handleRefresh} resultsByMatchId={resultsByMatchId} />}
    </div>
  )
}
