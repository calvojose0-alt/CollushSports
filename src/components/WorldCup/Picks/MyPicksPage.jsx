import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useWCGame } from '@/hooks/useWCGame'
import { saveGroupPick, updateWCPlayer } from '@/services/firebase/wc2026Service'
import { computeGroupStandings } from '@/services/gameEngine/wc2026Engine'
import { GROUP_LETTERS, WC_TEAMS, WC_GROUPS, isPicksLocked, PICK_LOCK_TIME, SCORING } from '@/data/wc2026Teams'
import { getGroupMatches } from '@/data/wc2026Schedule'
import { Flag, Lock, Save, CheckCircle2, AlertCircle, Loader, Trophy, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Users, RefreshCw } from 'lucide-react'
import TournamentCountdown from '@/components/WorldCup/TournamentCountdown'

// ── Score input component ────────────────────────────────────────────────────
function ScoreInput({ value, onChange, disabled }) {
  return (
    <input
      type="number"
      min="0"
      max="20"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : Math.max(0, Math.min(20, parseInt(v, 10) || 0)))
      }}
      disabled={disabled}
      className={`w-10 h-10 text-center text-base font-bold rounded-lg border transition-colors focus:outline-none
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${disabled
          ? 'bg-f1dark border-f1light text-gray-500 cursor-not-allowed'
          : 'bg-f1dark border-f1light text-white focus:border-yellow-500 hover:border-gray-500'
        }`}
    />
  )
}

// ── Community picks breakdown bar ────────────────────────────────────────────
function CommunityBar({ stats }) {
  if (!stats || stats.total === 0) return (
    <p className="text-[10px] text-gray-600 italic">No community picks yet.</p>
  )
  const { homePct, drawPct, awayPct, homeTeam, awayTeam, total } = stats
  return (
    <div className="space-y-1">
      {/* Percentages row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-green-700">{homePct}%</span>
          <span className="text-[10px] text-gray-500">{homeTeam?.shortName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-yellow-600">{drawPct}%</span>
          <span className="text-[10px] text-gray-500">Draw</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-500">{awayTeam?.shortName}</span>
          <span className="text-[11px] font-bold text-red-700">{awayPct}%</span>
        </div>
      </div>
      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-1.5">
        {homePct > 0 && <div className="bg-green-700 transition-all" style={{ width: `${homePct}%` }} />}
        {drawPct > 0  && <div className="bg-yellow-600 transition-all" style={{ width: `${drawPct}%` }} />}
        {awayPct > 0  && <div className="bg-red-700 transition-all"    style={{ width: `${awayPct}%` }} />}
      </div>
      <p className="text-[10px] text-gray-600 text-right">{total} pick{total !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Single match pick row ─────────────────────────────────────────────────────
function MatchPickRow({ match, pick, homeScore, awayScore, onChange, locked, result, communityStats }) {
  const homeTeam = WC_TEAMS[match.homeTeam]
  const awayTeam = WC_TEAMS[match.awayTeam]
  const hasResult = result && result.status === 'final'
  const isPending = !hasResult
  const [showCommunity, setShowCommunity] = useState(false)

  let rowClass = 'bg-f1dark'
  if (hasResult) {
    const scored = pick?.pointsEarned !== null && pick?.pointsEarned !== undefined
    if (scored) {
      if (pick.isExact)                rowClass = 'bg-green-900/20 border-l-2 border-green-600'
      else if (pick.isCorrectOutcome)  rowClass = 'bg-blue-900/20 border-l-2 border-blue-600'
      else                             rowClass = 'bg-red-900/10 border-l-2 border-red-900'
    }
  }

  return (
    <div className={`rounded-xl px-4 py-3 ${rowClass} mb-2`}>
      {/* Teams + score inputs */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{homeTeam?.flag}</span>
          <span className="text-sm font-semibold text-white truncate">{homeTeam?.shortName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreInput value={homeScore} onChange={(v) => onChange(match.id, 'home', v)} disabled={locked} />
          <span className="text-gray-500 font-bold text-sm">–</span>
          <ScoreInput value={awayScore} onChange={(v) => onChange(match.id, 'away', v)} disabled={locked} />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-white truncate">{awayTeam?.shortName}</span>
          <span className="text-xl">{awayTeam?.flag}</span>
        </div>
      </div>

      {/* Result / score feedback */}
      {hasResult && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">Result: {result.homeScore}–{result.awayScore}</span>
          {pick?.pointsEarned !== null && pick?.pointsEarned !== undefined ? (
            <span className={`font-bold ${
              pick.isExact ? 'text-green-700' :
              pick.isCorrectOutcome ? 'text-blue-400' : 'text-gray-500'
            }`}>
              {pick.isExact ? `+${SCORING.GROUP_EXACT_SCORE} pts (exact!)` :
               pick.isCorrectOutcome ? `+${SCORING.GROUP_CORRECT_OUTCOME} pts (outcome ✓)` :
               '0 pts'}
            </span>
          ) : (
            <span className="text-gray-600">Scoring pending</span>
          )}
        </div>
      )}

      {/* Match date + time */}
      {isPending && (
        <div className="mt-1 text-xs text-gray-600 text-center">
          {new Date(match.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{match.time && ` · ${match.time}`} · {match.venue}
        </div>
      )}

      {/* Community picks toggle */}
      <div className="mt-2 border-t border-f1light/40 pt-2">
        <button
          onClick={() => setShowCommunity(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Users className="w-3 h-3" />
          Community Picks
          {communityStats?.total > 0 && (
            <span className="text-gray-600">· {communityStats.total}</span>
          )}
          {showCommunity ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showCommunity && (
          <div className="mt-2">
            <CommunityBar stats={communityStats} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Group standings table ─────────────────────────────────────────────────────
function GroupStandingsTable({ standings }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-f1light">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Simulated Standings</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-f1light bg-f1dark/60">
            <th className="px-2 py-1.5 text-left text-gray-500 font-semibold">Team</th>
            <th className="px-1 py-1.5 text-center text-gray-500 font-semibold w-7">W</th>
            <th className="px-1 py-1.5 text-center text-gray-500 font-semibold w-7">L</th>
            <th className="px-1 py-1.5 text-center text-gray-500 font-semibold w-7">T</th>
            <th className="px-1 py-1.5 text-center text-gray-500 font-semibold w-8">GD</th>
            <th className="px-1 py-1.5 text-center text-yellow-500 font-bold w-8">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-f1light/50">
          {standings.map((row, idx) => {
            const team = WC_TEAMS[row.teamId]
            const advancing = idx < 2 // top 2 advance automatically
            return (
              <tr key={row.teamId} className={advancing ? 'bg-green-900/10' : ''}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-600 w-3">{idx + 1}</span>
                    <span className="text-base">{team?.flag}</span>
                    <span className={`font-semibold ${advancing ? 'text-green-300' : 'text-gray-300'}`}>
                      {team?.shortName}
                    </span>
                    {advancing && <span className="text-green-600 text-xs ml-0.5">↑</span>}
                  </div>
                </td>
                <td className="px-1 py-1.5 text-center text-gray-300">{row.wins}</td>
                <td className="px-1 py-1.5 text-center text-gray-300">{row.losses}</td>
                <td className="px-1 py-1.5 text-center text-gray-300">{row.draws}</td>
                <td className={`px-1 py-1.5 text-center font-semibold ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="px-1 py-1.5 text-center font-bold text-yellow-400">{row.pts}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyPicksPage() {
  const { user } = useAuth()
  const {
    myPicks, myPicksByMatchId, resultsByMatchId,
    myPlayer, refreshPicks, reload, allPicks, loading, error,
  } = useWCGame()

  const locked = isPicksLocked()
  const [activeGroup, setActiveGroup] = useState('A')
  const [localScores, setLocalScores] = useState({}) // { matchId: { home, away } }
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState(null)
  const [totalGoalsGuess, setTotalGoalsGuess] = useState(myPlayer?.totalGoalsGuess ?? '')
  const [savingGoals, setSavingGoals] = useState(false)

  const groupMatches = useMemo(() => getGroupMatches(activeGroup), [activeGroup])

  // Build score state: prefer localScores, then saved picks
  const getScore = useCallback((matchId, side) => {
    if (localScores[matchId]?.[side] !== undefined) return localScores[matchId][side]
    const pick = myPicksByMatchId[matchId]
    if (!pick) return null
    return side === 'home' ? pick.homeScore : pick.awayScore
  }, [localScores, myPicksByMatchId])

  const handleScoreChange = (matchId, side, value) => {
    if (locked) return
    setLocalScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }))
  }

  // Build picks array for standings simulation (all 6 group matches)
  const standingsPicks = useMemo(() => {
    return groupMatches.map((m) => ({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: getScore(m.id, 'home'),
      awayScore: getScore(m.id, 'away'),
    }))
  }, [groupMatches, getScore])

  const standings = useMemo(
    () => computeGroupStandings(activeGroup, standingsPicks),
    [activeGroup, standingsPicks]
  )

  // Community pick stats per match: { matchId: { homePct, drawPct, awayPct, total, homeTeam, awayTeam } }
  const communityStatsByMatch = useMemo(() => {
    const stats = {}
    groupMatches.forEach((m) => {
      const picks = allPicks.filter((p) => p.matchId === m.id && p.homeScore !== null && p.awayScore !== null)
      const total = picks.length
      if (total === 0) { stats[m.id] = { total: 0 }; return }
      let homeWins = 0, draws = 0, awayWins = 0
      picks.forEach((p) => {
        if (p.homeScore > p.awayScore)       homeWins++
        else if (p.homeScore === p.awayScore) draws++
        else                                  awayWins++
      })
      stats[m.id] = {
        total,
        homePct: Math.round((homeWins / total) * 100),
        drawPct: Math.round((draws    / total) * 100),
        awayPct: Math.round((awayWins / total) * 100),
        homeTeam: WC_TEAMS[m.homeTeam],
        awayTeam: WC_TEAMS[m.awayTeam],
      }
    })
    return stats
  }, [groupMatches, allPicks])

  const handleSaveGroup = async () => {
    if (locked) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const toSave = groupMatches.map((m) => ({
        matchId:   m.id,
        homeScore: getScore(m.id, 'home'),
        awayScore: getScore(m.id, 'away'),
      })).filter((p) => p.homeScore !== null && p.awayScore !== null)

      if (toSave.length === 0) {
        setSaveMsg({ type: 'error', text: 'Enter at least one score before saving.' })
        return
      }

      await Promise.all(
        toSave.map((p) =>
          saveGroupPick({ userId: user.uid, matchId: p.matchId, homeScore: p.homeScore, awayScore: p.awayScore })
        )
      )
      // Clear local state for this group
      const cleared = { ...localScores }
      groupMatches.forEach((m) => { delete cleared[m.id] })
      setLocalScores(cleared)

      await refreshPicks()
      setSaveMsg({ type: 'success', text: `Group ${activeGroup} picks saved!` })
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveGoals = async () => {
    const v = parseInt(totalGoalsGuess, 10)
    if (isNaN(v) || v < 0) {
      setSaveMsg({ type: 'error', text: 'Enter a valid total goals prediction.' })
      return
    }
    setSavingGoals(true)
    try {
      await updateWCPlayer(user.uid, { totalGoalsGuess: v })
      await reload()
      setSaveMsg({ type: 'success', text: 'Total goals prediction saved!' })
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message })
    } finally {
      setSavingGoals(false)
    }
  }

  // Count saved picks per group
  const savedCountByGroup = useMemo(() => {
    const counts = {}
    GROUP_LETTERS.forEach((g) => {
      const matches = getGroupMatches(g)
      counts[g] = matches.filter((m) => {
        const p = myPicksByMatchId[m.id]
        return p && p.homeScore !== null && p.awayScore !== null
      }).length
    })
    return counts
  }, [myPicksByMatchId])

  // True once every group has all its picks saved
  const allGroupsComplete = useMemo(
    () => GROUP_LETTERS.every((g) => savedCountByGroup[g] === getGroupMatches(g).length),
    [savedCountByGroup]
  )

  const groupIdx   = GROUP_LETTERS.indexOf(activeGroup)
  const prevGroup  = groupIdx > 0 ? GROUP_LETTERS[groupIdx - 1] : null
  const nextGroup  = groupIdx < GROUP_LETTERS.length - 1 ? GROUP_LETTERS[groupIdx + 1] : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-7 h-7 animate-spin text-yellow-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-4 text-red-300 text-sm space-y-3">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Error loading picks
        </div>
        <p className="font-mono text-xs text-red-400">{error}</p>
        <button
          onClick={reload}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-800 hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-blue-800">My Group Stage Picks</h2>
        </div>
        {locked && (
          <span className="flex items-center gap-1.5 text-xs text-red-300 bg-red-900/30 border border-red-700 px-3 py-1.5 rounded-lg">
            <Lock className="w-3 h-3" /> Picks Locked
          </span>
        )}
      </div>

      {/* Countdown */}
      {!locked && <TournamentCountdown />}

      {/* Scoring legend */}
      <div className="bg-f1dark border border-f1light rounded-xl px-4 py-3 text-xs text-gray-400 flex flex-wrap gap-4">
        <span><span className="text-green-400 font-bold">+{SCORING.GROUP_EXACT_SCORE} pts</span> Exact score</span>
        <span><span className="text-blue-400 font-bold">+{SCORING.GROUP_CORRECT_OUTCOME} pts</span> Correct outcome (W/D/L)</span>
        <span className="text-gray-600">Knockout advancement points awarded separately (Bracket tab)</span>
      </div>

      {/* Group tabs */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max pb-1">
          {GROUP_LETTERS.map((g) => {
            const matches = getGroupMatches(g)
            const saved   = savedCountByGroup[g] || 0
            const total   = matches.length
            const complete = saved === total
            return (
              <button
                key={g}
                onClick={() => { setActiveGroup(g); setSaveMsg(null) }}
                className={`relative px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  g === activeGroup
                    ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/20'
                    : 'bg-f1dark border border-f1light text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                {g}
                {/* progress dot */}
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  complete ? 'bg-green-400' : saved > 0 ? 'bg-yellow-400' : 'bg-gray-700'
                }`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* All-groups-complete nudge */}
      {allGroupsComplete && !locked && (
        <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-green-900/25 border border-green-700/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-green-300">🎉 All group stage picks saved!</p>
            <p className="text-xs text-green-500 mt-0.5">
              Head over to <span className="font-semibold text-green-300">Knockout Bracket Picks</span> to predict the knockout rounds and pick your tournament winner.
            </p>
          </div>
          <Link
            to="/world-cup/bracket"
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
          >
            Go to Bracket →
          </Link>
        </div>
      )}

      {/* Two-column layout: picks left, standings right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Picks column */}
        <div className="lg:col-span-3 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">
              Group {activeGroup}
              <span className="text-gray-500 font-normal text-sm ml-2">
                ({savedCountByGroup[activeGroup] || 0}/{groupMatches.length} saved)
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {prevGroup && (
                <button onClick={() => setActiveGroup(prevGroup)} className="btn-secondary py-1 px-2 text-xs flex items-center gap-0.5">
                  <ChevronLeft className="w-3 h-3" /> {prevGroup}
                </button>
              )}
              {nextGroup && (
                <button onClick={() => setActiveGroup(nextGroup)} className="btn-secondary py-1 px-2 text-xs flex items-center gap-0.5">
                  {nextGroup} <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Matchday sections */}
          {[1, 2, 3].map((md) => {
            const mdMatches = groupMatches.filter((m) => m.matchday === md)
            return (
              <div key={md} className="mb-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                  Matchday {md}
                </p>
                {mdMatches.map((match) => (
                  <MatchPickRow
                    key={match.id}
                    match={match}
                    pick={myPicksByMatchId[match.id]}
                    homeScore={getScore(match.id, 'home')}
                    awayScore={getScore(match.id, 'away')}
                    onChange={handleScoreChange}
                    locked={locked}
                    result={resultsByMatchId[match.id]}
                    communityStats={communityStatsByMatch[match.id]}
                  />
                ))}
              </div>
            )
          })}

          {/* Save button */}
          {!locked && (
            <button
              onClick={handleSaveGroup}
              disabled={saving}
              className="w-full py-3 font-bold flex items-center justify-center gap-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-50 transition-colors"
            >
              {saving
                ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Group {activeGroup} Picks</>
              }
            </button>
          )}

          {saveMsg && (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
              saveMsg.type === 'success'
                ? 'bg-green-900/30 border-green-700 text-green-300'
                : 'bg-red-900/30 border-red-700 text-red-300'
            }`}>
              {saveMsg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {saveMsg.text}
            </div>
          )}
        </div>

        {/* Standings column */}
        <div className="lg:col-span-2 space-y-4">
          <GroupStandingsTable standings={standings} />

          {/* Progress summary */}
          <div className="card text-xs space-y-2">
            <p className="text-gray-500 font-semibold uppercase tracking-wider">Pick Progress</p>
            <div className="grid grid-cols-4 gap-1">
              {GROUP_LETTERS.map((g) => {
                const saved = savedCountByGroup[g] || 0
                const total = getGroupMatches(g).length
                const pct   = Math.round((saved / total) * 100)
                return (
                  <div key={g} className="text-center">
                    <div className="text-gray-400 font-bold">{g}</div>
                    <div className="h-1 bg-f1light rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-yellow-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-gray-600 mt-0.5">{saved}/{total}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Total Goals Tiebreaker */}
          <div className="card border-yellow-700/40 bg-gray-900">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
              Tiebreaker — Total Tournament Goals
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Predict the total goals scored in the entire 2026 World Cup. Used as the 3rd tiebreaker.
            </p>
            <div className="flex items-center gap-2">
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
              {!locked && (
                <button
                  onClick={handleSaveGoals}
                  disabled={savingGoals}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
                >
                  {savingGoals ? <Loader className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              )}
              {myPlayer?.totalGoalsGuess !== null && myPlayer?.totalGoalsGuess !== undefined && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Saved: {myPlayer.totalGoalsGuess}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
