// Pro Football Win League Admin — weekly results feed + season status
import { useState } from 'react'
import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings, Users, Trophy, ChevronDown, ChevronUp,
  AlertTriangle, CalendarDays, RotateCcw, Plus, X,
} from 'lucide-react'
import TeamLogo from '@/components/FootballWinLeague/TeamLogo'
import { NFL_WL_TEAMS, FWL_RANKED_TEAMS, FWL_WEEKS } from '@/data/nflWinLeagueTeams'
import { recordResult, removeResult } from '@/services/footballWinLeague/footballWinLeagueService'

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

// ── Weekly Results Feed ────────────────────────────────────────────────────────

const OUTCOMES = [
  { id: 'win',  label: 'W', cls: 'bg-green-600 border-green-500' },
  { id: 'tie',  label: 'T', cls: 'bg-yellow-600 border-yellow-500' },
  { id: 'loss', label: 'L', cls: 'bg-red-600 border-red-500' },
]

// Small colored pill for a recorded outcome.
function OutcomeBadge({ outcome }) {
  const map = {
    win:  ['W', 'bg-green-600'],
    tie:  ['T', 'bg-yellow-600'],
    loss: ['L', 'bg-red-600'],
  }
  const [label, bg] = map[outcome] || ['?', 'bg-gray-600']
  return <span className={`${bg} text-white text-[10px] font-black w-5 h-5 rounded flex items-center justify-center flex-shrink-0`}>{label}</span>
}

// Enter results one GAME at a time: pick the two teams and it sets both
// (winner + loser, or a tie). A single-team fallback handles the rare game
// against a non-rostered team.
function WeeklyResults({ rosterTeams, results, reload }) {
  const [saving, setSaving] = useState(false)
  const [week,   setWeek]   = useState(1)
  const [winner, setWinner] = useState('')
  const [loser,  setLoser]  = useState('')
  const [isTie,  setIsTie]  = useState(false)
  const [single, setSingle] = useState('')

  // Rostered teams in draft-board order
  const teams = [...rosterTeams]
    .map((id) => NFL_WL_TEAMS[id])
    .filter(Boolean)
    .sort((a, b) => FWL_RANKED_TEAMS.indexOf(a.id) - FWL_RANKED_TEAMS.indexOf(b.id))

  const rankIdx = (id) => FWL_RANKED_TEAMS.indexOf(id)
  const weekResults = results
    .filter((r) => r.week === week)
    .sort((a, b) => rankIdx(a.teamId) - rankIdx(b.teamId))
  const recordedIds = new Set(weekResults.map((r) => r.teamId))
  const remaining = teams.filter((t) => !recordedIds.has(t.id))

  const save = async (entries) => {
    setSaving(true)
    try {
      for (const e of entries) await recordResult({ teamId: e.teamId, week, outcome: e.outcome })
      await reload()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const addGame = async () => {
    if (!winner || !loser || winner === loser) return
    await save(isTie
      ? [{ teamId: winner, outcome: 'tie' }, { teamId: loser, outcome: 'tie' }]
      : [{ teamId: winner, outcome: 'win' }, { teamId: loser, outcome: 'loss' }])
    setWinner(''); setLoser('')
  }

  const addSingle = async (outcome) => {
    if (!single) return
    await save([{ teamId: single, outcome }])
    setSingle('')
  }

  const remove = async (teamId) => {
    setSaving(true)
    try { await removeResult({ teamId, week }); await reload() }
    catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const selectCls = 'bg-f1dark border border-f1light rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-green-500 disabled:opacity-40'
  const teamOptions = (exclude) => remaining
    .filter((t) => t.id !== exclude)
    .map((t) => <option key={t.id} value={t.id}>{t.shortName} — {t.name}</option>)

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Select week:</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: FWL_WEEKS }, (_, i) => i + 1).map((w) => {
            const recorded = results.some((r) => r.week === w)
            return (
              <button
                key={w}
                onClick={() => { setWeek(w); setWinner(''); setLoser(''); setSingle('') }}
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
        <strong className="text-white">Week {week}</strong> — {weekResults.length}/{teams.length} teams recorded, {remaining.length} left.
      </p>

      {/* Record a game (two rostered teams) */}
      {remaining.length >= 2 ? (
        <div className="bg-f1dark border border-f1light rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white">Record a game</p>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400 cursor-pointer">
              <input type="checkbox" checked={isTie} onChange={(e) => setIsTie(e.target.checked)} className="accent-yellow-500" />
              Tie game
            </label>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <select value={winner} onChange={(e) => setWinner(e.target.value)} disabled={saving} className={selectCls}>
              <option value="">{isTie ? 'Team…' : 'Winner…'}</option>
              {teamOptions(loser)}
            </select>
            <span className="text-[11px] font-bold text-gray-500 px-1">{isTie ? 'ties' : 'beat'}</span>
            <select value={loser} onChange={(e) => setLoser(e.target.value)} disabled={saving} className={selectCls}>
              <option value="">{isTie ? 'Team…' : 'Loser…'}</option>
              {teamOptions(winner)}
            </select>
          </div>
          <button
            onClick={addGame}
            disabled={saving || !winner || !loser || winner === loser}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add game
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-600 italic bg-f1dark border border-f1light rounded-xl px-3 py-2.5">
          {remaining.length === 0 ? 'All rostered teams have a result for this week.' : 'Only one team left — use the single-team option below (bye or non-roster opponent).'}
        </p>
      )}

      {/* Single-team fallback (played a non-rostered opponent) */}
      {remaining.length >= 1 && (
        <div className="bg-f1dark border border-f1light rounded-xl p-3 space-y-2">
          <p className="text-[11px] text-gray-400">Played a non-roster team? Set one team directly:</p>
          <div className="flex items-center gap-2">
            <select value={single} onChange={(e) => setSingle(e.target.value)} disabled={saving} className={`${selectCls} flex-1`}>
              <option value="">Team…</option>
              {remaining.map((t) => <option key={t.id} value={t.id}>{t.shortName} — {t.name}</option>)}
            </select>
            <div className="flex gap-1 flex-shrink-0">
              {OUTCOMES.map((o) => (
                <button
                  key={o.id}
                  onClick={() => addSingle(o.id)}
                  disabled={saving || !single}
                  className={`w-8 h-8 rounded-lg border text-xs font-black transition-all disabled:opacity-40 ${o.cls} text-white`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recorded this week */}
      {weekResults.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recorded — Week {week}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {weekResults.map((r) => {
              const team = NFL_WL_TEAMS[r.teamId]
              if (!team) return null
              return (
                <div key={r.teamId} className="flex items-center gap-2 bg-f1dark border border-f1light rounded-lg px-2 py-1.5">
                  <OutcomeBadge outcome={r.outcome} />
                  <TeamLogo team={team} size="xs" />
                  <span className="text-xs text-gray-200 font-semibold truncate flex-1">{team.shortName}</span>
                  <button onClick={() => remove(r.teamId)} disabled={saving} className="text-gray-500 hover:text-red-400 flex-shrink-0" title="Remove">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Remaining (bye or not yet entered) */}
      {remaining.length > 0 && weekResults.length > 0 && (
        <p className="text-[10px] text-gray-600">
          Not yet recorded: {remaining.map((t) => t.shortName).join(', ')} (leave teams on a bye unrecorded).
        </p>
      )}
    </div>
  )
}

// ── Season Status ──────────────────────────────────────────────────────────────

function SeasonStatus({ session, setStatus, reload }) {
  const [loading, setLoading] = useState(false)
  const status = session?.status ?? 'setup'
  const isComplete = status === 'complete'

  const act = async (s) => {
    setLoading(true)
    try { await setStatus(s); await reload() }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-f1dark rounded-xl px-4 py-3">
        <span className="text-sm text-gray-400">Current Status</span>
        <span className={`text-sm font-bold capitalize ${isComplete ? 'text-yellow-300' : 'text-green-400'}`}>
          {isComplete ? 'complete' : 'active'}
        </span>
      </div>
      {!isComplete ? (
        <button
          onClick={() => act('complete')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
        >
          <Trophy className="w-3.5 h-3.5" />
          Mark Season Complete (crowns the leader as Champion)
        </button>
      ) : (
        <button
          onClick={() => act('locked')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-f1light bg-f1dark text-gray-300 hover:text-white text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reopen Season (remove Champion banner)
        </button>
      )}
    </div>
  )
}

// ── Roster Reference ───────────────────────────────────────────────────────────

function RosterReference({ roster }) {
  return (
    <div className="divide-y divide-f1light">
      {roster.map((entry) => (
        <div key={entry.id} className="py-2.5 flex items-center gap-3">
          <p className="text-sm font-semibold text-white w-24 flex-shrink-0 truncate">{entry.manager}</p>
          <div className="flex flex-wrap gap-1.5">
            {entry.teams.map((tid) => {
              const team = NFL_WL_TEAMS[tid]
              return team ? (
                <span key={tid} className="inline-flex items-center gap-1 text-xs text-gray-300">
                  <TeamLogo team={team} size="xs" /> {team.shortName}
                </span>
              ) : null
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth()
  const { session, results, rosterTeams, roster, setStatus, reload } = useFootballWinLeague()

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

      <SectionCard title="Weekly Results" icon={CalendarDays}>
        <div className="text-xs text-gray-400 mb-3 bg-f1dark rounded-lg px-3 py-2.5">
          Record each rostered team's result for every NFL week. <strong className="text-white">Win = +1</strong>,
          <strong className="text-white"> Tie = +0.5</strong>, <strong className="text-white">Loss = 0</strong>. Standings update live.
        </div>
        <WeeklyResults rosterTeams={rosterTeams} results={results} reload={reload} />
      </SectionCard>

      <SectionCard title="Season Status" icon={Trophy} defaultOpen={false}>
        <SeasonStatus session={session} setStatus={setStatus} reload={reload} />
      </SectionCard>

      <SectionCard title="Rosters (reference)" icon={Users} defaultOpen={false}>
        <RosterReference roster={roster} />
      </SectionCard>
    </div>
  )
}
