// Pro Football Win League Admin — per-game weekly results + season status
import { useState } from 'react'
import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings, Users, Trophy, ChevronDown, ChevronUp,
  AlertTriangle, CalendarDays, RotateCcw, Check,
} from 'lucide-react'
import TeamLogo from '@/components/FootballWinLeague/TeamLogo'
import { NFL_WL_TEAMS, FWL_WEEKS } from '@/data/nflWinLeagueTeams'
import { NFL_2026_SCHEDULE } from '@/data/nflWinLeagueSchedule'
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

// ── Weekly Results (per real game) ─────────────────────────────────────────────

function WeeklyResults({ rosterTeams, results, reload }) {
  const [saving, setSaving] = useState(null)   // "AWAY@HOME" key being saved
  const [week,   setWeek]   = useState(1)
  const rosterSet = new Set(rosterTeams)

  // Only games involving at least one rostered team matter for scoring.
  const games = (NFL_2026_SCHEDULE[week] || []).filter(([a, h]) => rosterSet.has(a) || rosterSet.has(h))

  const byTeam = {}
  for (const r of results) if (r.week === week) byTeam[r.teamId] = r.outcome

  // Which side is recorded as the winner for a game: 'away' | 'home' | 'tie' | null
  const decide = (a, h) => {
    const oa = rosterSet.has(a) ? byTeam[a] : undefined
    const oh = rosterSet.has(h) ? byTeam[h] : undefined
    if (oa === 'tie' || oh === 'tie') return 'tie'
    if (oa === 'win' || oh === 'loss') return 'away'
    if (oh === 'win' || oa === 'loss') return 'home'
    return null
  }

  const decidedCount = games.filter(([a, h]) => decide(a, h) !== null).length

  // choice: 'away' | 'home' | 'tie' | null(clear). Records only rostered teams.
  const setGame = async (a, h, choice) => {
    const key = `${a}@${h}`
    setSaving(key)
    try {
      for (const [team, side] of [[a, 'away'], [h, 'home']]) {
        if (!rosterSet.has(team)) continue
        if (choice === null) { await removeResult({ teamId: team, week }); continue }
        const outcome = choice === 'tie' ? 'tie' : (choice === side ? 'win' : 'loss')
        await recordResult({ teamId: team, week, outcome })
      }
      await reload()
    } catch (e) { alert(e.message) }
    finally { setSaving(null) }
  }

  const TeamButton = ({ id, side, dec, onPick, disabled }) => {
    const team = NFL_WL_TEAMS[id] || { id, abbr: id, shortName: id, name: id }
    const rostered = rosterSet.has(id)
    const isWinner = dec === side
    const isTie = dec === 'tie'
    const isLoser = dec && !isTie && !isWinner
    return (
      <button
        onClick={() => onPick(isWinner ? null : side)}
        disabled={disabled}
        title={rostered ? team.name : `${team.name} (not on any roster)`}
        className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-bold transition-all ${
          isWinner ? 'border-green-500 bg-green-900/40 text-white'
          : isTie   ? 'border-yellow-600/50 bg-f1dark text-gray-300'
          : isLoser ? 'border-f1light bg-f1dark text-gray-600'
          : 'border-f1light bg-f1dark text-gray-200 hover:border-gray-500'
        } ${!rostered ? 'opacity-60' : ''}`}
      >
        <TeamLogo team={team} size="sm" />
        <span className="truncate">{team.shortName}</span>
        {isWinner && <Check className="w-3.5 h-3.5 text-green-400 ml-auto flex-shrink-0" />}
      </button>
    )
  }

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
        <strong className="text-white">Week {week}</strong> — tap each game's winner ({decidedCount}/{games.length} decided).
        Tap the winner again to clear; use <span className="text-yellow-300 font-bold">T</span> for a tie.
      </p>

      {/* Games */}
      <div className="space-y-2">
        {games.map(([a, h]) => {
          const key = `${a}@${h}`
          const dec = decide(a, h)
          const isSaving = saving === key
          const pick = (choice) => setGame(a, h, choice)
          return (
            <div key={key} className={`flex items-center gap-2 ${isSaving ? 'opacity-50' : ''}`}>
              <TeamButton id={a} side="away" dec={dec} onPick={pick} disabled={!!saving} />
              <button
                onClick={() => pick(dec === 'tie' ? null : 'tie')}
                disabled={!!saving}
                title="Tie"
                className={`w-8 h-9 rounded-lg border text-xs font-black flex-shrink-0 transition-all ${
                  dec === 'tie' ? 'border-yellow-500 bg-yellow-600 text-white' : 'border-f1light bg-f1dark text-gray-500 hover:text-white'
                }`}
              >
                T
              </button>
              <TeamButton id={h} side="home" dec={dec} onPick={pick} disabled={!!saving} />
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-gray-600">
        Home team shown on the right. Teams on a bye this week aren't listed and score nothing. Faded teams aren't on any roster (kept so the matchup reads correctly).
      </p>
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
          Each week's real matchups are pre-loaded. Tap the <strong className="text-white">winner</strong> of each game —
          the loser is set automatically. <strong className="text-white">Win = +1</strong>,
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
