// Pro Football Win League Admin — draft management + weekly results feed
import { useState } from 'react'
import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings, Users, Zap, Trophy, ChevronDown, ChevronUp,
  Play, Lock, SkipForward, Trash2, RefreshCw, AlertTriangle, CalendarDays,
} from 'lucide-react'
import TeamLogo from '@/components/FootballWinLeague/TeamLogo'
import {
  NFL_WL_TEAMS, FWL_RANKED_TEAMS, FWL_WEEKS, generateDraftOrder,
} from '@/data/nflWinLeagueTeams'
import {
  updateSession,
  removeFWLPlayer,
  undraftTeam,
  recordResult,
  removeResult,
} from '@/services/footballWinLeague/footballWinLeagueService'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card p-0 overflow-hidden">
      <button
        className="w-full px-4 py-3 border-b border-f1light flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

// ── Draft Controls ─────────────────────────────────────────────────────────────

function DraftControls({ session, players, picks, reload }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const act = async (fn) => {
    setLoading(true); setError(null)
    try { await fn(); await reload() }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const generateOrder = async () => {
    if (players.length < 2) throw new Error('Need at least 2 players registered.')
    const ids = players.map((p) => p.userId)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]]
    }
    const draftOrder = generateDraftOrder(ids, session?.picksPerPlayer ?? 3)
    await updateSession({ draftOrder, currentPick: 0, status: 'open' })
  }

  const startDraft = async () => {
    if (!session?.draftOrder?.length) throw new Error('Generate a draft order first.')
    await updateSession({ status: 'drafting', currentPick: 0 })
  }

  const lockDraft = async () => { await updateSession({ status: 'locked' }) }

  const resetDraft = async () => {
    if (!window.confirm('This will delete ALL picks and reset the draft. Are you sure?')) return
    for (const pick of picks) { await undraftTeam(pick.teamId) }
    await updateSession({ status: 'setup', draftOrder: [], currentPick: 0 })
  }

  const openRegistration = async () => { await updateSession({ status: 'open' }) }
  const markComplete     = async () => { await updateSession({ status: 'complete' }) }

  const advancePick = async () => {
    if (!session) return
    const next = (session.currentPick ?? 0) + 1
    const total = session.draftOrder?.length ?? 0
    const newStatus = next >= total ? 'locked' : 'drafting'
    await updateSession({ currentPick: next, status: newStatus })
  }

  const status = session?.status ?? 'setup'

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center justify-between bg-f1dark rounded-xl px-4 py-3">
        <span className="text-sm text-gray-400">Current Status</span>
        <span className={`text-sm font-bold capitalize ${
          status === 'drafting' ? 'text-yellow-400' :
          status === 'locked'   ? 'text-green-400'  :
          status === 'open'     ? 'text-blue-400'   :
          status === 'complete' ? 'text-yellow-300' :
          'text-gray-500'
        }`}>{status}</span>
      </div>

      <div className="flex items-center justify-between bg-f1dark rounded-xl px-4 py-3">
        <span className="text-sm text-gray-400">Registered Players</span>
        <span className="text-sm font-bold text-white">{players.length} / {session?.maxPlayers ?? 10}</span>
      </div>

      {session?.draftOrder?.length > 0 && (
        <div className="flex items-center justify-between bg-f1dark rounded-xl px-4 py-3">
          <span className="text-sm text-gray-400">Draft Progress</span>
          <span className="text-sm font-bold text-white">
            {Math.min(session.currentPick, session.draftOrder.length)} / {session.draftOrder.length} picks
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {(status === 'setup' || status === 'open') && (
          <button
            onClick={() => act(generateOrder)}
            disabled={loading || players.length < 2}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {status === 'open' && session?.draftOrder?.length ? 'Regenerate Order' : 'Generate & Open'}
          </button>
        )}

        {status === 'setup' && session?.draftOrder?.length > 0 && (
          <button
            onClick={() => act(openRegistration)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Open Registration
          </button>
        )}

        {status === 'open' && session?.draftOrder?.length > 0 && (
          <button
            onClick={() => act(startDraft)}
            disabled={loading || players.length < 2}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Start Draft
          </button>
        )}

        {status === 'drafting' && (
          <>
            <button
              onClick={() => act(advancePick)}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip Pick
            </button>
            <button
              onClick={() => act(lockDraft)}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Draft
            </button>
          </>
        )}

        {(status === 'locked' || status === 'active') && (
          <button
            onClick={() => act(markComplete)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors col-span-2"
          >
            <Trophy className="w-3.5 h-3.5" />
            Mark Season Complete
          </button>
        )}

        {status !== 'complete' && (
          <button
            onClick={() => act(resetDraft)}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-800 bg-red-900/20 text-red-400 hover:bg-red-900/40 text-xs font-semibold transition-colors col-span-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Draft (Delete All Picks)
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          Saving…
        </div>
      )}
    </div>
  )
}

// ── Draft Order Display ────────────────────────────────────────────────────────

function DraftOrderDisplay({ session, players }) {
  const playerById = {}
  for (const p of players) playerById[p.userId] = p

  const order      = session?.draftOrder ?? []
  const currentIdx = session?.currentPick ?? 0

  if (!order.length) return <p className="text-sm text-gray-500 italic">No draft order generated yet.</p>

  const rounds = []
  const picksEach = session?.picksPerPlayer ?? 3
  for (let r = 0; r < picksEach; r++) {
    rounds.push(order.slice(r * players.length, (r + 1) * players.length))
  }

  return (
    <div className="space-y-3">
      {rounds.map((round, rIdx) => (
        <div key={rIdx}>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Round {rIdx + 1} {rIdx === 0 ? '(forward)' : rIdx === 1 ? '(reverse snake)' : '(middle-out balance)'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {round.map((uid, i) => {
              const globalIdx = rIdx * players.length + i
              const p = playerById[uid]
              const isCur  = globalIdx === currentIdx && session?.status === 'drafting'
              const isPast = globalIdx < currentIdx

              return (
                <div
                  key={globalIdx}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs border ${
                    isCur  ? 'border-green-500 bg-green-900/40 text-green-300 font-bold' :
                    isPast ? 'border-f1light bg-f1dark text-gray-600'                    :
                             'border-f1light bg-f1dark text-gray-300'
                  }`}
                >
                  <span className="text-gray-600">#{globalIdx + 1}</span>
                  <span>{p?.displayName?.split(' ')[0] || '?'}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Players Manager ────────────────────────────────────────────────────────────

function PlayersManager({ players, picks, session, reload }) {
  const [removing, setRemoving] = useState(null)

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this player and all their picks?')) return
    setRemoving(userId)
    try {
      const playerPicks = picks.filter((p) => p.userId === userId)
      for (const pick of playerPicks) { await undraftTeam(pick.teamId) }
      await removeFWLPlayer(userId)
      await reload()
    } catch (e) { alert(e.message) }
    finally { setRemoving(null) }
  }

  if (!players.length) return <p className="text-sm text-gray-500 italic">No players registered yet.</p>

  return (
    <div className="divide-y divide-f1light">
      {players.map((p) => {
        const playerPicks = picks
          .filter((pk) => pk.userId === p.userId)
          .sort((a, b) => a.pickNumber - b.pickNumber)

        return (
          <div key={p.id} className="py-3 flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {p.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{p.displayName}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {playerPicks.map((pick) => {
                  const team = NFL_WL_TEAMS[pick.teamId]
                  return team ? (
                    <span key={pick.teamId} className="text-xs text-gray-400">
                      #{pick.pickNumber + 1} {team.shortName}
                    </span>
                  ) : null
                })}
                {playerPicks.length === 0 && (
                  <span className="text-xs text-gray-600 italic">No picks</span>
                )}
              </div>
            </div>
            {session?.status !== 'locked' && session?.status !== 'complete' && (
              <button
                onClick={() => handleRemove(p.userId)}
                disabled={removing === p.userId}
                className="flex-shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-900/30 transition-colors"
                title="Remove player"
              >
                {removing === p.userId
                  ? <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Weekly Results Feed ────────────────────────────────────────────────────────

const OUTCOMES = [
  { id: 'win',  label: 'W', cls: 'bg-green-600 border-green-500' },
  { id: 'tie',  label: 'T', cls: 'bg-yellow-600 border-yellow-500' },
  { id: 'loss', label: 'L', cls: 'bg-red-600 border-red-500' },
]

function WeeklyResults({ picks, results, reload }) {
  const [saving, setSaving] = useState(null)
  const [week,   setWeek]   = useState(1)

  // Drafted teams, in draft-board order
  const draftedTeams = [...new Set(picks.map((p) => p.teamId))]
    .map((id) => NFL_WL_TEAMS[id])
    .filter(Boolean)
    .sort((a, b) => FWL_RANKED_TEAMS.indexOf(a.id) - FWL_RANKED_TEAMS.indexOf(b.id))

  // Map of "teamId_week" -> outcome
  const byKey = {}
  for (const r of results) byKey[`${r.teamId}_${r.week}`] = r.outcome

  const setOutcome = async (teamId, outcome) => {
    const key = `${teamId}_${week}`
    setSaving(key)
    try {
      if (byKey[key] === outcome) {
        await removeResult({ teamId, week })      // toggling the active one clears it
      } else {
        await recordResult({ teamId, week, outcome })
      }
      await reload()
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
  }

  if (draftedTeams.length === 0) {
    return <p className="text-sm text-gray-500 italic">No teams drafted yet.</p>
  }

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Select week to record:</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: FWL_WEEKS }, (_, i) => i + 1).map((w) => {
            const recorded = results.some((r) => r.week === w)
            return (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`w-9 h-9 rounded-lg text-xs font-bold border transition-colors relative ${
                  week === w
                    ? 'border-green-500 bg-green-900/40 text-green-300'
                    : 'border-f1light bg-f1dark text-gray-400 hover:text-white'
                }`}
              >
                {w}
                {recorded && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Set each drafted team's result for <strong className="text-white">Week {week}</strong> (tap the active one again to clear):
      </p>

      <div className="space-y-2">
        {draftedTeams.map((team) => {
          const key     = `${team.id}_${week}`
          const current = byKey[key]
          const isSaving = saving === key
          return (
            <div key={team.id} className="flex items-center gap-3 bg-f1dark border border-f1light rounded-xl px-3 py-2">
              <TeamLogo team={team} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{team.shortName}</p>
                <p className="text-[10px] text-gray-500 truncate">{team.name}</p>
              </div>
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : (
                <div className="flex gap-1 flex-shrink-0">
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setOutcome(team.id, o.id)}
                      disabled={!!saving}
                      className={`w-8 h-8 rounded-lg border text-xs font-black transition-all ${
                        current === o.id
                          ? `${o.cls} text-white`
                          : 'border-f1light bg-f1dark text-gray-500 hover:text-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth()
  const { session, players, picks, results, reload } = useFootballWinLeague()

  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-gray-400">Admin access only.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-white">Pro Football Win-League Admin</h2>
      </div>

      <SectionCard title="Draft Controls" icon={Play}>
        <DraftControls session={session} players={players} picks={picks} reload={reload} />
      </SectionCard>

      <SectionCard title="Draft Order" icon={Zap} defaultOpen={false}>
        <DraftOrderDisplay session={session} players={players} />
      </SectionCard>

      <SectionCard title="Registered Players" icon={Users} defaultOpen={false}>
        <PlayersManager session={session} players={players} picks={picks} reload={reload} />
      </SectionCard>

      <SectionCard title="Weekly Results" icon={CalendarDays}>
        <div className="text-xs text-gray-400 mb-3 bg-f1dark rounded-lg px-3 py-2.5">
          Record each drafted team's result for every NFL week. <strong className="text-white">Win = +1</strong>,
          <strong className="text-white"> Tie = +0.5</strong>, <strong className="text-white">Loss = 0</strong>. Scores update live on the Leaderboard.
        </div>
        <WeeklyResults picks={picks} results={results} reload={reload} />
      </SectionCard>
    </div>
  )
}
