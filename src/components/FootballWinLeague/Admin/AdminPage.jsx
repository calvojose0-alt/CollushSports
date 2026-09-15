// Pro Football Win League Admin — weekly results feed + season status
import { useState } from 'react'
import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings, Users, Trophy, ChevronDown, ChevronUp,
  AlertTriangle, CalendarDays, RotateCcw,
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

function WeeklyResults({ rosterTeams, results, reload }) {
  const [saving, setSaving] = useState(null)
  const [week,   setWeek]   = useState(1)

  // Rostered teams in draft-board order
  const teams = [...rosterTeams]
    .map((id) => NFL_WL_TEAMS[id])
    .filter(Boolean)
    .sort((a, b) => FWL_RANKED_TEAMS.indexOf(a.id) - FWL_RANKED_TEAMS.indexOf(b.id))

  const byKey = {}
  for (const r of results) byKey[`${r.teamId}_${r.week}`] = r.outcome

  const weekCount = results.filter((r) => r.week === week).length

  const setOutcome = async (teamId, outcome) => {
    const key = `${teamId}_${week}`
    setSaving(key)
    try {
      if (byKey[key] === outcome) await removeResult({ teamId, week })   // tap active → clear
      else                        await recordResult({ teamId, week, outcome })
      await reload()
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
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
        Set each team's result for <strong className="text-white">Week {week}</strong>{' '}
        ({weekCount}/{teams.length} recorded — tap the active one again to clear):
      </p>

      <div className="space-y-2">
        {teams.map((team) => {
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
                        current === o.id ? `${o.cls} text-white` : 'border-f1light bg-f1dark text-gray-500 hover:text-white'
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
