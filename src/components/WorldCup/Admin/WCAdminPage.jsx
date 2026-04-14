// Admin page — enter World Cup match results and trigger scoring
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGame } from '@/hooks/useWCGame'
import {
  saveMatchResult,
  deleteMatchResult,
  updateTournamentMeta,
  getWCGroupsForUser,
} from '@/services/firebase/wc2026Service'
import {
  processMatchResult,
  recalculateAllPlayerTotals,
  recalculatePlayoffPoints,
  markGroupStageLeader,
} from '@/services/gameEngine/wc2026Engine'
import { SCORING, GROUP_LETTERS, WC_TEAMS, PLAYOFF_ROUNDS } from '@/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES, getGroupMatches } from '@/data/wc2026Schedule'
import {
  Settings, CheckCircle2, AlertCircle, Loader, Trash2, Pencil,
  Lock, Trophy, Globe, Flag,
} from 'lucide-react'

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

// ── Playoff Results Admin ──────────────────────────────────────────────────────
function PlayoffAdmin({ onRefresh }) {
  const { matchResults, resultsByMatchId } = useWCGame()
  const [selectedRound, setSelectedRound] = useState('r32')
  const [roundTeams, setRoundTeams] = useState({})  // { roundId: [teamId, ...] }
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState(null)

  const roundMatches = KNOCKOUT_MATCHES.filter((m) => m.stage === selectedRound)

  const handleSavePlayoffRound = async () => {
    setProcessing(true)
    setMsg(null)
    try {
      const actualRounds = {}
      PLAYOFF_ROUNDS.forEach((r) => {
        actualRounds[r.id] = new Set(roundTeams[r.id] || [])
      })
      await recalculatePlayoffPoints(actualRounds)
      await onRefresh()
      setMsg({ type: 'success', text: 'Playoff points recalculated.' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setProcessing(false)
    }
  }

  const toggleTeam = (roundId, teamId) => {
    setRoundTeams((prev) => {
      const arr = prev[roundId] || []
      return {
        ...prev,
        [roundId]: arr.includes(teamId) ? arr.filter((t) => t !== teamId) : [...arr, teamId],
      }
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Globe className="w-4 h-4 text-yellow-400" /> Playoff — Teams that Advanced
      </h3>
      <p className="text-xs text-gray-400">
        Select which teams actually advanced to each round. This scores all playoff pick predictions.
      </p>

      {/* Round tabs */}
      <div className="flex gap-1 flex-wrap">
        {PLAYOFF_ROUNDS.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRound(r.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
              r.id === selectedRound ? 'bg-yellow-600 text-white' : 'bg-f1dark border border-f1light text-gray-400'
            }`}
          >
            {r.shortLabel} <span className="text-xs opacity-70">({r.teamsNeeded})</span>
          </button>
        ))}
      </div>

      {/* Team grid for selected round */}
      <div className="card">
        <p className="text-xs text-gray-500 mb-3">
          Select the {PLAYOFF_ROUNDS.find((r) => r.id === selectedRound)?.teamsNeeded} teams that reached this round:
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.values(WC_TEAMS).map((team) => {
            const sel = (roundTeams[selectedRound] || []).includes(team.id)
            return (
              <button
                key={team.id}
                onClick={() => toggleTeam(selectedRound, team.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  sel
                    ? 'bg-yellow-600/30 border-yellow-500 text-yellow-200'
                    : 'bg-f1dark border-f1light text-gray-400 hover:border-yellow-600'
                }`}
              >
                <span>{team.flag}</span>
                <span>{team.shortName}</span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Selected: {(roundTeams[selectedRound] || []).length} / {PLAYOFF_ROUNDS.find((r) => r.id === selectedRound)?.teamsNeeded}
        </p>
      </div>

      <button
        onClick={handleSavePlayoffRound}
        disabled={processing}
        className="btn-primary flex items-center gap-2"
      >
        {processing ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {processing ? 'Processing…' : 'Score All Playoff Picks'}
      </button>

      {msg && <MessageBox msg={msg} />}
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

      <div className="card bg-yellow-900/20 border-yellow-700/40 text-xs text-yellow-300">
        <strong>Admin only.</strong> Enter match results to automatically score all player picks. Use "Update" to correct mistakes.
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        {[
          { id: 'group',    label: 'Group Stage' },
          { id: 'playoff',  label: 'Playoff Rounds' },
          { id: 'settings', label: 'Tournament' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-yellow-600 text-white'
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
    </div>
  )
}
