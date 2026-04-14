import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGame } from '@/hooks/useWCGame'
import { savePlayoffPick } from '@/services/firebase/wc2026Service'
import { WC_TEAMS, GROUP_LETTERS, PLAYOFF_ROUNDS, isPicksLocked, SCORING } from '@/data/wc2026Teams'
import { Globe, Save, CheckCircle2, AlertCircle, Loader, Lock, Info } from 'lucide-react'

const ALL_TEAM_IDS = Object.keys(WC_TEAMS)

// ── Team selector chip ─────────────────────────────────────────────────────────
function TeamChip({ teamId, selected, onClick, disabled, correct, incorrect }) {
  const team = WC_TEAMS[teamId]
  if (!team) return null

  let chipClass = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none '
  if (disabled && !selected) {
    chipClass += 'opacity-40 cursor-not-allowed bg-f1dark border-f1light text-gray-500'
  } else if (correct) {
    chipClass += 'bg-green-900/40 border-green-600 text-green-300'
  } else if (incorrect) {
    chipClass += 'bg-red-900/30 border-red-900/60 text-red-400 line-through opacity-60'
  } else if (selected) {
    chipClass += 'bg-yellow-600/30 border-yellow-500 text-yellow-200 shadow-sm shadow-yellow-600/20'
  } else {
    chipClass += 'bg-f1dark border-f1light text-gray-300 hover:border-yellow-600 hover:text-white'
  }

  return (
    <button onClick={disabled ? undefined : onClick} className={chipClass} disabled={disabled && !selected}>
      <span className="text-base leading-none">{team.flag}</span>
      <span>{team.shortName}</span>
      {correct && <CheckCircle2 className="w-3 h-3 text-green-400" />}
    </button>
  )
}

// ── Round panel ────────────────────────────────────────────────────────────────
function RoundPanel({ round, selectedTeams, onToggle, locked, actualTeams, maxTeams }) {
  const selected = selectedTeams || []
  const remaining = maxTeams - selected.length
  const isWinner  = round.id === 'winner'

  // Group teams by confederation for easier selection
  const confeds = {}
  ALL_TEAM_IDS.forEach((id) => {
    const t = WC_TEAMS[id]
    if (!confeds[t.confed]) confeds[t.confed] = []
    confeds[t.confed].push(id)
  })

  // For winner round, sort by group/region
  const orderedGroups = [
    { label: 'CONCACAF', ids: confeds['CONCACAF'] || [] },
    { label: 'CONMEBOL', ids: confeds['CONMEBOL'] || [] },
    { label: 'UEFA',     ids: confeds['UEFA']     || [] },
    { label: 'CAF',      ids: confeds['CAF']      || [] },
    { label: 'AFC / OFC',ids: [...(confeds['AFC'] || []), ...(confeds['OFC'] || [])] },
  ]

  const actualSet = new Set(actualTeams || [])
  const selectedSet = new Set(selected)

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white">{round.label}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Pick {maxTeams} team{maxTeams !== 1 ? 's' : ''} · <span className="text-yellow-400">+{round.points} pts</span> each correct
          </p>
        </div>
        <div className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${
          selected.length === maxTeams
            ? 'bg-green-900/40 border-green-700 text-green-300'
            : 'bg-f1dark border-f1light text-gray-400'
        }`}>
          {selected.length}/{maxTeams}
        </div>
      </div>

      {/* Team grid */}
      {orderedGroups.map(({ label, ids }) => {
        if (!ids.length) return null
        return (
          <div key={label}>
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
              {ids.map((id) => {
                const sel = selectedSet.has(id)
                const cor = actualTeams && actualSet.has(id) && sel
                const inc = actualTeams && !actualSet.has(id) && sel
                const maxReached = !sel && selected.length >= maxTeams
                return (
                  <TeamChip
                    key={id}
                    teamId={id}
                    selected={sel}
                    correct={cor}
                    incorrect={inc}
                    disabled={locked || maxReached}
                    onClick={() => onToggle(round.id, id, maxTeams)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

      {!locked && remaining > 0 && (
        <p className="text-xs text-gray-500 italic">
          Select {remaining} more team{remaining !== 1 ? 's' : ''}…
        </p>
      )}
      {!locked && selected.length === maxTeams && (
        <p className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> All {maxTeams} picks selected
        </p>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BracketPage() {
  const { user } = useAuth()
  const { myPlayoffPicksByRound, tournamentMeta, refreshPicks } = useWCGame()

  const locked = isPicksLocked()

  // Local draft state: { r32: Set<teamId>, r16: Set<teamId>, ... }
  const [draft, setDraft] = useState(() => {
    const init = {}
    PLAYOFF_ROUNDS.forEach((r) => { init[r.id] = new Set() })
    return init
  })

  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving]   = useState(null) // round id being saved, or null
  const [msg, setMsg]         = useState(null)

  // Pre-fill draft from saved picks (once)
  useMemo(() => {
    if (initialized) return
    const hasAny = Object.values(myPlayoffPicksByRound).some((p) => p?.teamIds?.length)
    if (!hasAny) return
    const newDraft = {}
    PLAYOFF_ROUNDS.forEach((r) => {
      const saved = myPlayoffPicksByRound[r.id]?.teamIds || []
      newDraft[r.id] = new Set(saved)
    })
    setDraft(newDraft)
    setInitialized(true)
  }, [myPlayoffPicksByRound, initialized])

  const handleToggle = (roundId, teamId, maxTeams) => {
    if (locked) return
    setDraft((prev) => {
      const set = new Set(prev[roundId])
      if (set.has(teamId)) {
        set.delete(teamId)
      } else if (set.size < maxTeams) {
        set.add(teamId)
      }
      return { ...prev, [roundId]: set }
    })
  }

  const handleSaveRound = async (roundId) => {
    setSaving(roundId)
    setMsg(null)
    try {
      await savePlayoffPick({
        userId: user.uid,
        round: roundId,
        teamIds: Array.from(draft[roundId]),
      })
      await refreshPicks()
      setMsg({ type: 'success', text: `${PLAYOFF_ROUNDS.find((r) => r.id === roundId)?.label} picks saved!` })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(null)
    }
  }

  const handleSaveAll = async () => {
    setSaving('all')
    setMsg(null)
    try {
      await Promise.all(
        PLAYOFF_ROUNDS.map((r) =>
          savePlayoffPick({ userId: user.uid, round: r.id, teamIds: Array.from(draft[r.id]) })
        )
      )
      await refreshPicks()
      setMsg({ type: 'success', text: 'All playoff picks saved!' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(null)
    }
  }

  // Calculate potential points
  const potentialPoints = PLAYOFF_ROUNDS.reduce((total, r) => {
    return total + (draft[r.id]?.size || 0) * r.points
  }, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-blue-800">Playoff Bracket Picks</h2>
        </div>
        {locked && (
          <span className="flex items-center gap-1.5 text-xs text-red-300 bg-red-900/30 border border-red-700 px-3 py-1.5 rounded-lg">
            <Lock className="w-3 h-3" /> Picks Locked
          </span>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-f1dark border border-f1light rounded-xl px-4 py-3 text-xs text-gray-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>Pick which teams you think will <strong className="text-white">advance to each knockout round</strong>. Points are awarded for every correct team placement.</p>
          <div className="flex flex-wrap gap-3 mt-2">
            {PLAYOFF_ROUNDS.map((r) => (
              <span key={r.id} className="text-yellow-400 font-semibold">{r.shortLabel}: +{r.points}pts each</span>
            ))}
          </div>
        </div>
      </div>

      {/* Potential points */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="col-span-2 md:col-span-2 card bg-yellow-900/20 border-yellow-700/40 text-center">
          <div className="text-2xl font-black text-yellow-400">{potentialPoints}</div>
          <div className="text-xs text-gray-400">Max Playoff Pts (if all correct)</div>
        </div>
        {PLAYOFF_ROUNDS.map((r) => (
          <div key={r.id} className="card text-center p-2">
            <div className="text-base font-bold text-white">{draft[r.id]?.size || 0}/{r.teamsNeeded}</div>
            <div className="text-xs text-gray-500">{r.shortLabel}</div>
          </div>
        ))}
      </div>

      {/* Round panels */}
      {PLAYOFF_ROUNDS.map((round) => (
        <div key={round.id}>
          <RoundPanel
            round={round}
            selectedTeams={Array.from(draft[round.id] || [])}
            onToggle={handleToggle}
            locked={locked}
            actualTeams={null /* admin fills in actual teams — show scoring post-tournament */}
            maxTeams={round.teamsNeeded}
          />
          {!locked && (
            <button
              onClick={() => handleSaveRound(round.id)}
              disabled={!!saving}
              className="mt-2 btn-secondary flex items-center gap-2 text-sm py-1.5 px-4"
            >
              {saving === round.id
                ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save {round.shortLabel} Picks</>
              }
            </button>
          )}
        </div>
      ))}

      {/* Save all */}
      {!locked && (
        <button
          onClick={handleSaveAll}
          disabled={!!saving}
          className="w-full py-3 font-bold flex items-center justify-center gap-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-50 transition-colors"
        >
          {saving === 'all'
            ? <><Loader className="w-5 h-5 animate-spin" /> Saving All…</>
            : <><Save className="w-5 h-5" /> Save All Playoff Picks</>
          }
        </button>
      )}

      {msg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
          msg.type === 'success'
            ? 'bg-green-900/30 border-green-700 text-green-300'
            : 'bg-red-900/30 border-red-700 text-red-300'
        }`}>
          {msg.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          {msg.text}
        </div>
      )}

      {locked && (
        <div className="card text-center py-8 text-gray-500">
          <Lock className="w-8 h-8 mx-auto mb-3 text-gray-600" />
          <p className="font-semibold text-white mb-1">Picks are locked</p>
          <p className="text-sm">Your playoff picks are saved and will be scored as the tournament progresses.</p>
        </div>
      )}
    </div>
  )
}
