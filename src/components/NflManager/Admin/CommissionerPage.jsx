import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Settings, ListChecks, Sliders, Users, Search, ClipboardList, Trophy,
  ChevronDown, ChevronUp, KeyRound, ShieldAlert, Dices, Gavel, RotateCcw,
} from 'lucide-react'
import { updateLeagueSettings, updateScoringProfile } from '@/services/nflManager/leagueService'
import { searchPlayers, updatePlayer, getLeagueRoster } from '@/services/nflManager/rosterService'
import { adjustBalance } from '@/services/nflManager/adminService'
import { recordPlayerWeekStats, finalizeWeek, simulateWeekStats, resetWeek } from '@/services/nflManager/scoringService'
import { lockLineupsForWeek } from '@/services/nflManager/lineupService'
import {
  getActiveCycle, getCycleListings, getListingBidCounts, openMarketCycle, executeCycle,
} from '@/services/nflManager/marketService'
import { formatMoney } from '@/components/NflManager/NflManagerLayout'
import MoneyInput from '@/components/shared/MoneyInput'

function SectionCard({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card p-0 overflow-hidden">
      <button className="w-full px-4 py-3 border-b border-f1light flex items-center justify-between" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

// ── League Setup ──────────────────────────────────────────────────────────

function LeagueSetupSection({ league, reload }) {
  const [form, setForm] = useState(league)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await updateLeagueSettings(league.id, {
        name: form.name, status: form.status, budgetAmount: Number(form.budgetAmount),
        maxMembers: Number(form.maxMembers), startWeek: Number(form.startWeek),
        endWeek: Number(form.endWeek), moneyPerPoint: Number(form.moneyPerPoint),
      })
      await reload()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      {league.inviteCode && (
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-f1dark border border-f1light rounded-lg px-3 py-2">
          <KeyRound className="w-3.5 h-3.5" /> Invite code: <span className="font-mono font-bold text-white">{league.inviteCode}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><input className="input-field py-1.5 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Status">
          <select className="input-field py-1.5 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="setup">Setup</option>
            <option value="roster_build">Roster Build</option>
            <option value="active">Active</option>
            <option value="complete">Complete</option>
          </select>
        </Field>
        <Field label="Budget"><MoneyInput className="input-field py-1.5 text-sm" value={form.budgetAmount} onChange={(v) => setForm({ ...form, budgetAmount: v })} /></Field>
        <Field label="Max Managers"><input type="number" className="input-field py-1.5 text-sm" value={form.maxMembers} onChange={(e) => setForm({ ...form, maxMembers: e.target.value })} /></Field>
        <Field label="Start Week"><input type="number" className="input-field py-1.5 text-sm" value={form.startWeek} onChange={(e) => setForm({ ...form, startWeek: e.target.value })} /></Field>
        <Field label="End Week"><input type="number" className="input-field py-1.5 text-sm" value={form.endWeek} onChange={(e) => setForm({ ...form, endWeek: e.target.value })} /></Field>
        <Field label="$ per Fantasy Point"><MoneyInput className="input-field py-1.5 text-sm" value={form.moneyPerPoint} onChange={(v) => setForm({ ...form, moneyPerPoint: v })} /></Field>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button className="btn-primary text-sm px-4 py-1.5" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save League Settings'}</button>
    </>
  )
}

// ── Roster Template ───────────────────────────────────────────────────────

function RosterTemplateSection({ league, reload }) {
  const [template, setTemplate] = useState(league.rosterTemplate)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await updateLeagueSettings(league.id, { rosterTemplate: template })
      await reload()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      <p className="text-xs text-gray-500">Applies to future random-draw builds. Lineup format is fixed: QB, RB, RB, WR, WR, TE, FLEX, D/ST, K.</p>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(template).map(([pos, count]) => (
          <Field key={pos} label={pos}>
            <input type="number" min={0} className="input-field py-1.5 text-sm" value={count} onChange={(e) => setTemplate({ ...template, [pos]: Number(e.target.value) })} />
          </Field>
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button className="btn-primary text-sm px-4 py-1.5" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save Roster Template'}</button>
    </>
  )
}

// ── Scoring Settings ──────────────────────────────────────────────────────

function ScoringSettingsSection({ league, scoringProfile, reload }) {
  const [form, setForm] = useState(scoringProfile)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setForm(scoringProfile) }, [scoringProfile])

  if (!form) return <p className="text-sm text-gray-500">Loading scoring profile...</p>

  const num = (field) => (e) => setForm({ ...form, [field]: Number(e.target.value) })
  const kicker = (field) => (e) => setForm({ ...form, kickerRules: { ...form.kickerRules, [field]: Number(e.target.value) } })
  const dst = (field) => (e) => setForm({ ...form, dstRules: { ...form.dstRules, [field]: Number(e.target.value) } })
  const bonus = (field) => (e) => setForm({ ...form, bonusRules: { ...form.bonusRules, [field]: Number(e.target.value) } })

  const save = async () => {
    setBusy(true); setError(null)
    try {
      await updateScoringProfile(league.id, form)
      await reload()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      <Field label="Reception Scoring (PPR)">
        <div className="flex gap-2">
          {[0, 0.5, 1].map((v) => (
            <button key={v} type="button" className={`flex-1 text-xs py-1.5 rounded-lg border ${form.pprValue === v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-f1dark border-f1light text-gray-400'}`} onClick={() => setForm({ ...form, pprValue: v })}>
              {v === 0 ? 'Standard' : v === 0.5 ? 'Half-PPR' : 'Full PPR'}
            </button>
          ))}
        </div>
      </Field>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-1">Offense</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pass Yd Rate (pts/yd)"><input type="number" step="0.01" className="input-field py-1.5 text-sm" value={form.passingYardRate} onChange={num('passingYardRate')} /></Field>
        <Field label="Pass TD"><input type="number" className="input-field py-1.5 text-sm" value={form.passingTdPoints} onChange={num('passingTdPoints')} /></Field>
        <Field label="Interception"><input type="number" className="input-field py-1.5 text-sm" value={form.interceptionPoints} onChange={num('interceptionPoints')} /></Field>
        <Field label="Rush Yd Rate"><input type="number" step="0.01" className="input-field py-1.5 text-sm" value={form.rushingYardRate} onChange={num('rushingYardRate')} /></Field>
        <Field label="Rec Yd Rate"><input type="number" step="0.01" className="input-field py-1.5 text-sm" value={form.receivingYardRate} onChange={num('receivingYardRate')} /></Field>
        <Field label="Rush/Rec TD"><input type="number" className="input-field py-1.5 text-sm" value={form.touchdownPoints} onChange={num('touchdownPoints')} /></Field>
        <Field label="Fumble Lost"><input type="number" className="input-field py-1.5 text-sm" value={form.fumbleLostPoints} onChange={num('fumbleLostPoints')} /></Field>
        <Field label="2-Pt Conversion"><input type="number" className="input-field py-1.5 text-sm" value={form.twoPointPoints} onChange={num('twoPointPoints')} /></Field>
      </div>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-1">Kicker</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="FG 0-39"><input type="number" className="input-field py-1.5 text-sm" value={form.kickerRules.fg_0_39} onChange={kicker('fg_0_39')} /></Field>
        <Field label="FG 40-49"><input type="number" className="input-field py-1.5 text-sm" value={form.kickerRules.fg_40_49} onChange={kicker('fg_40_49')} /></Field>
        <Field label="FG 50+"><input type="number" className="input-field py-1.5 text-sm" value={form.kickerRules.fg_50_plus} onChange={kicker('fg_50_plus')} /></Field>
        <Field label="Extra Point"><input type="number" className="input-field py-1.5 text-sm" value={form.kickerRules.xp} onChange={kicker('xp')} /></Field>
        <Field label="Missed FG"><input type="number" className="input-field py-1.5 text-sm" value={form.kickerRules.missed_fg} onChange={kicker('missed_fg')} /></Field>
      </div>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-1">D/ST</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Sack"><input type="number" className="input-field py-1.5 text-sm" value={form.dstRules.sack} onChange={dst('sack')} /></Field>
        <Field label="Interception"><input type="number" className="input-field py-1.5 text-sm" value={form.dstRules.interception} onChange={dst('interception')} /></Field>
        <Field label="Fumble Recovery"><input type="number" className="input-field py-1.5 text-sm" value={form.dstRules.fumble_recovery} onChange={dst('fumble_recovery')} /></Field>
        <Field label="Safety"><input type="number" className="input-field py-1.5 text-sm" value={form.dstRules.safety} onChange={dst('safety')} /></Field>
        <Field label="Blocked Kick"><input type="number" className="input-field py-1.5 text-sm" value={form.dstRules.blocked_kick} onChange={dst('blocked_kick')} /></Field>
        <Field label="D/ST Touchdown"><input type="number" className="input-field py-1.5 text-sm" value={form.dstRules.td} onChange={dst('td')} /></Field>
      </div>
      <p className="text-[11px] text-gray-500">Points-allowed tiers use ESPN standard defaults.</p>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide pt-1">Optional Bonuses (0 = off)</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="100+ Rush/Rec Yards"><input type="number" className="input-field py-1.5 text-sm" value={form.bonusRules.rush_rec_100} onChange={bonus('rush_rec_100')} /></Field>
        <Field label="300+ Passing Yards"><input type="number" className="input-field py-1.5 text-sm" value={form.bonusRules.pass_300} onChange={bonus('pass_300')} /></Field>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <button className="btn-primary text-sm px-4 py-1.5" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save Scoring Settings'}</button>
    </>
  )
}

// ── Managers ──────────────────────────────────────────────────────────────

function ManagersSection({ members, actorUserId, reload }) {
  const [edits, setEdits] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const save = async (member) => {
    const raw = edits[member.id]
    if (raw === undefined) return
    setBusyId(member.id); setError(null)
    try {
      await adjustBalance({ member, newBalance: Number(raw), actorUserId, reason: 'Commissioner manual adjustment' })
      await reload()
    } catch (err) { setError(err.message) } finally { setBusyId(null) }
  }

  return (
    <>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="divide-y divide-f1light -mx-4">
        {members.map((m) => (
          <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{m.teamName} {m.role === 'commissioner' && <span className="text-[10px] text-blue-400">(Commissioner)</span>}</p>
              <p className="text-xs text-gray-500">Season pts {m.seasonPoints.toFixed(1)}</p>
            </div>
            <MoneyInput
              className="input-field py-1.5 text-sm w-32"
              value={edits[m.id] ?? m.balance}
              onChange={(v) => setEdits((prev) => ({ ...prev, [m.id]: v }))}
            />
            <button className="btn-secondary text-xs px-3 py-1.5" disabled={busyId === m.id} onClick={() => save(m)}>
              {busyId === m.id ? '...' : 'Set Balance'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Market Cycles ─────────────────────────────────────────────────────────

function MarketCyclesSection({ league, actorUserId, reload }) {
  const [cycle, setCycle] = useState(null)
  const [listings, setListings] = useState([])
  const [bidCounts, setBidCounts] = useState({})
  const [listingCount, setListingCount] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const active = await getActiveCycle(league.id)
      setCycle(active)
      if (active) {
        const rows = await getCycleListings(active.id)
        setListings(rows)
        setBidCounts(await getListingBidCounts(rows.map((l) => l.id)))
      } else {
        setListings([]); setBidCounts({})
      }
    } catch (err) { setError(err.message) }
  }, [league.id])

  useEffect(() => { load() }, [load])

  const open = async () => {
    setBusy(true); setError(null); setResults(null)
    try {
      await openMarketCycle({ league, actorUserId, listingCount: Number(listingCount) })
      await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const execute = async () => {
    if (!cycle) return
    setBusy(true); setError(null)
    try {
      const res = await executeCycle({ league, cycleId: cycle.id, actorUserId })
      setResults(res)
      await load()
      await reload()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {!cycle && (
        <div className="flex items-center gap-2">
          <Field label="Listings"><input type="number" min={1} max={40} className="input-field py-1.5 text-sm w-20" value={listingCount} onChange={(e) => setListingCount(e.target.value)} /></Field>
          <button className="btn-primary text-sm px-4 py-1.5 self-end" disabled={busy} onClick={open}>{busy ? 'Opening...' : 'Open New Cycle'}</button>
        </div>
      )}

      {cycle && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300">Cycle #{cycle.cycleNumber} — {listings.filter((l) => l.status === 'open').length} open listing(s)</p>
            <button className="btn-primary text-sm px-4 py-1.5" disabled={busy} onClick={execute}>{busy ? 'Executing...' : 'Execute Cycle'}</button>
          </div>
          <div className="divide-y divide-f1light -mx-4 max-h-72 overflow-y-auto">
            {listings.map((l) => (
              <div key={l.id} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-gray-300">{l.player?.displayName} <span className="text-gray-500">({l.player?.position})</span></span>
                <span className="text-xs text-gray-500">Min {formatMoney(l.startingValue)} · {bidCounts[l.id] || 0} bid(s)</span>
              </div>
            ))}
          </div>
        </>
      )}

      {results && (
        <div className="bg-f1dark border border-f1light rounded-lg p-3 text-xs space-y-1 max-h-48 overflow-y-auto">
          {results.map((r) => (
            <div key={r.listing.id} className="flex justify-between">
              <span className="text-gray-300">{r.listing.player?.displayName}</span>
              <span className={r.winnerManagerId ? 'text-blue-300' : 'text-gray-500'}>
                {r.winnerManagerId ? `${r.teamName} — ${formatMoney(r.amount)}` : 'Unsold'}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Players ───────────────────────────────────────────────────────────────

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

function PlayersSection({ leagueId }) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('')
  const [players, setPlayers] = useState([])
  const [ownership, setOwnership] = useState({})
  const [loading, setLoading] = useState(false)
  const [edits, setEdits] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const search = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [results, roster] = await Promise.all([
        searchPlayers({ query, position: position || undefined }),
        getLeagueRoster(leagueId),
      ])
      setPlayers(results)
      setOwnership(Object.fromEntries(roster.map((r) => [r.playerId, r])))
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }, [query, position, leagueId])

  useEffect(() => { search() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (player) => {
    const edit = edits[player.id]
    if (!edit) return
    setBusyId(player.id); setError(null)
    try {
      await updatePlayer(player.id, edit)
      await search()
    } catch (err) { setError(err.message) } finally { setBusyId(null) }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input className="input-field py-1.5 text-sm" placeholder="Search player name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input-field py-1.5 text-sm w-28" value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">All positions</option>
          {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn-secondary text-xs px-3 py-1.5" onClick={search}>{loading ? '...' : 'Search'}</button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="divide-y divide-f1light -mx-4 max-h-96 overflow-y-auto">
        {players.map((p) => {
          const owned = ownership[p.id]
          const edit = edits[p.id] || {}
          return (
            <div key={p.id} className="px-4 py-2.5 flex items-center gap-2 flex-wrap text-sm">
              <div className="w-44 flex-shrink-0">
                <p className="font-semibold text-white truncate">{p.displayName}</p>
                <p className="text-xs text-gray-500">{p.position} · {p.nflTeam}{owned ? ' · owned' : ''}</p>
              </div>
              <input
                type="number" placeholder="Bye" className="input-field py-1 text-xs w-16"
                defaultValue={p.byeWeek ?? ''}
                onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], byeWeek: Number(e.target.value) } }))}
              />
              <select
                className="input-field py-1 text-xs w-28"
                defaultValue={p.status}
                onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], status: e.target.value } }))}
              >
                <option value="active">Active</option>
                <option value="injured">Injured</option>
                <option value="out">Out</option>
                <option value="bye">Bye</option>
              </select>
              <input
                type="text" placeholder="Injury note" className="input-field py-1 text-xs w-32"
                defaultValue={p.injuryStatus ?? ''}
                onChange={(e) => setEdits((prev) => ({ ...prev, [p.id]: { ...prev[p.id], injuryStatus: e.target.value } }))}
              />
              <button
                className="btn-secondary text-xs px-2.5 py-1"
                disabled={busyId === p.id || Object.keys(edit).length === 0}
                onClick={() => save(p)}
              >
                Save
              </button>
            </div>
          )
        })}
        {players.length === 0 && !loading && <p className="px-4 py-6 text-center text-gray-500 italic text-sm">No players found.</p>}
      </div>
    </>
  )
}

// ── Stats & Scoring ───────────────────────────────────────────────────────

function StatsScoringSection({ league, members, actorUserId, reload }) {
  const [week, setWeek] = useState(league.startWeek)
  const [playerQuery, setPlayerQuery] = useState('')
  const [players, setPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [stats, setStats] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [savedNotice, setSavedNotice] = useState(null)
  const [simNotice, setSimNotice] = useState(null)

  // Reset the stat form whenever the selected player (or week) changes —
  // otherwise stale field values from the previous player silently carry over.
  useEffect(() => {
    setStats({})
    setSavedNotice(null)
  }, [selectedPlayer?.id, week])

  const searchForStats = async () => {
    setError(null)
    try { setPlayers(await searchPlayers({ query: playerQuery })) }
    catch (err) { setError(err.message) }
  }

  const submitStats = async () => {
    if (!selectedPlayer) return
    setBusy(true); setError(null); setSavedNotice(null)
    try {
      await recordPlayerWeekStats({
        playerId: selectedPlayer.id, nflWeek: week, seasonYear: league.seasonYear,
        stats, enteredByUserId: actorUserId,
      })
      setSavedNotice(`Saved ${selectedPlayer.displayName}'s Week ${week} stat line.`)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const lockWeek = async () => {
    setBusy(true); setError(null)
    try { await lockLineupsForWeek({ leagueId: league.id, nflWeek: week }) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const simulateWeek = async () => {
    setBusy(true); setError(null); setSimNotice(null); setResults(null)
    try {
      const { count } = await simulateWeekStats({ leagueId: league.id, nflWeek: week, seasonYear: league.seasonYear, actorUserId })
      setSimNotice(`Generated random stats for ${count} rostered player${count === 1 ? '' : 's'} in Week ${week}. Ready to Finalize.`)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const finalize = async () => {
    setBusy(true); setError(null); setResults(null)
    try {
      const res = await finalizeWeek({ league, nflWeek: week, actorUserId })
      setResults(res)
      await reload()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const resetTheWeek = async () => {
    setBusy(true); setError(null); setResults(null); setSimNotice(null)
    try {
      await resetWeek({ league, nflWeek: week, actorUserId })
      await reload()
      setSimNotice(`Week ${week} reset — lineups reopened, any prior points/bonus undone. Ready to simulate + finalize again.`)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const num = (field) => (e) => setStats({ ...stats, [field]: Number(e.target.value) })
  const kickNum = (field) => (e) => setStats({ ...stats, kicking: { ...stats.kicking, [field]: Number(e.target.value) } })
  const dstNum = (field) => (e) => setStats({ ...stats, dst: { ...stats.dst, [field]: Number(e.target.value) } })

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Field label="Week"><input type="number" className="input-field py-1.5 text-sm w-20" value={week} onChange={(e) => setWeek(Number(e.target.value))} /></Field>
        <button className="btn-secondary text-xs px-3 py-1.5 self-end flex items-center gap-1.5" disabled={busy} onClick={simulateWeek}>
          <Dices className="w-3.5 h-3.5" /> Simulate Week {week}
        </button>
        <button className="btn-secondary text-xs px-3 py-1.5 self-end" disabled={busy} onClick={lockWeek}>Lock Lineups</button>
        <button className="btn-primary text-xs px-3 py-1.5 self-end" disabled={busy} onClick={finalize}>{busy ? 'Working...' : `Finalize Week ${week}`}</button>
        <button className="btn-secondary text-xs px-3 py-1.5 self-end flex items-center gap-1.5" disabled={busy} onClick={resetTheWeek}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset Week {week}
        </button>
      </div>
      <p className="text-[11px] text-gray-500">
        "Reset" reopens this week's lineups for editing and undoes any points/bonus a prior Finalize applied — use it to re-run Simulate + Finalize on the same week as many times as you want during testing.
      </p>
      <p className="text-[11px] text-gray-500">
        "Simulate" generates random stats for every rostered player that week — use it for testing instead of entering stat lines by hand. It overwrites any existing stats (manual or simulated) for that week.
      </p>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {simNotice && <p className="text-xs text-green-400">{simNotice}</p>}

      {results && (
        <div className="bg-f1dark border border-f1light rounded-lg p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
          {results.map((r) => (
            <div key={r.managerId} className="flex justify-between">
              <span className="text-gray-300">{r.teamName}</span>
              <span className={r.noScoreReason ? 'text-red-400' : 'text-blue-300'}>
                {r.noScoreReason ? r.noScoreReason.replace('_', ' ') : `${r.totalPoints.toFixed(1)} pts · +${formatMoney(r.bonus || 0)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-f1light pt-3 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Manual Stat Entry</p>
        <div className="flex items-center gap-2">
          <input className="input-field py-1.5 text-sm flex-1" placeholder="Search player" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} />
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={searchForStats}>Search</button>
        </div>
        {players.length > 0 && (
          <select className="input-field py-1.5 text-sm" value={selectedPlayer?.id || ''} onChange={(e) => setSelectedPlayer(players.find((p) => p.id === e.target.value) || null)}>
            <option value="">Select a player...</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.displayName} ({p.position} · {p.nflTeam})</option>)}
          </select>
        )}

        {selectedPlayer && (
          <div className="space-y-3" key={`${selectedPlayer.id}_${week}`}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Offense</p>
            <div className="grid grid-cols-4 gap-2">
              <Field label="Pass Yds"><input type="number" className="input-field py-1 text-xs" onChange={num('passing_yards')} /></Field>
              <Field label="Pass TD"><input type="number" className="input-field py-1 text-xs" onChange={num('passing_tds')} /></Field>
              <Field label="INT"><input type="number" className="input-field py-1 text-xs" onChange={num('interceptions')} /></Field>
              <Field label="Rush Yds"><input type="number" className="input-field py-1 text-xs" onChange={num('rushing_yards')} /></Field>
              <Field label="Rush TD"><input type="number" className="input-field py-1 text-xs" onChange={num('rushing_tds')} /></Field>
              <Field label="Rec Yds"><input type="number" className="input-field py-1 text-xs" onChange={num('receiving_yards')} /></Field>
              <Field label="Rec TD"><input type="number" className="input-field py-1 text-xs" onChange={num('receiving_tds')} /></Field>
              <Field label="Receptions"><input type="number" className="input-field py-1 text-xs" onChange={num('receptions')} /></Field>
              <Field label="Fumbles Lost"><input type="number" className="input-field py-1 text-xs" onChange={num('fumbles_lost')} /></Field>
              <Field label="2-Pt Conv"><input type="number" className="input-field py-1 text-xs" onChange={num('two_point_conversions')} /></Field>
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kicker</p>
            <div className="grid grid-cols-5 gap-2">
              <Field label="FG 0-39"><input type="number" className="input-field py-1 text-xs" onChange={kickNum('fg_0_39')} /></Field>
              <Field label="FG 40-49"><input type="number" className="input-field py-1 text-xs" onChange={kickNum('fg_40_49')} /></Field>
              <Field label="FG 50+"><input type="number" className="input-field py-1 text-xs" onChange={kickNum('fg_50_plus')} /></Field>
              <Field label="XP Made"><input type="number" className="input-field py-1 text-xs" onChange={kickNum('xp_made')} /></Field>
              <Field label="FG Missed"><input type="number" className="input-field py-1 text-xs" onChange={kickNum('fg_missed')} /></Field>
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">D/ST</p>
            <div className="grid grid-cols-4 gap-2">
              <Field label="Sacks"><input type="number" className="input-field py-1 text-xs" onChange={dstNum('sacks')} /></Field>
              <Field label="INT"><input type="number" className="input-field py-1 text-xs" onChange={dstNum('interceptions')} /></Field>
              <Field label="Fum Rec"><input type="number" className="input-field py-1 text-xs" onChange={dstNum('fumble_recoveries')} /></Field>
              <Field label="Safeties"><input type="number" className="input-field py-1 text-xs" onChange={dstNum('safeties')} /></Field>
              <Field label="Blocked"><input type="number" className="input-field py-1 text-xs" onChange={dstNum('blocked_kicks')} /></Field>
              <Field label="TDs"><input type="number" className="input-field py-1 text-xs" onChange={dstNum('tds')} /></Field>
              <Field label="Pts Allowed"><input type="number" className="input-field py-1 text-xs" onChange={dstNum('points_allowed')} /></Field>
            </div>

            <button className="btn-primary text-sm px-4 py-1.5" disabled={busy} onClick={submitStats}>{busy ? 'Saving...' : 'Save Stat Line'}</button>
            {savedNotice && <p className="text-xs text-green-400">{savedNotice}</p>}
          </div>
        )}
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

const SITE_ADMIN_EMAIL = 'jcalvo87@hotmail.com'

export default function CommissionerPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { league, members, isCommissioner, scoringProfile, refreshScoringProfile, refreshLeaderboard, refreshMembers, refreshCurrentWeek } = useOutletContext()

  const isSiteAdmin = user?.email?.toLowerCase() === SITE_ADMIN_EMAIL
  const canManage = isCommissioner || isSiteAdmin

  const reload = useCallback(async () => {
    await Promise.all([refreshScoringProfile(), refreshLeaderboard(), refreshMembers(), refreshCurrentWeek()])
  }, [refreshScoringProfile, refreshLeaderboard, refreshMembers, refreshCurrentWeek])

  if (!canManage) {
    return (
      <div className="card text-center py-14 space-y-3">
        <ShieldAlert className="w-10 h-10 text-gray-600 mx-auto" />
        <h2 className="text-lg font-bold text-white">Commissioner Access Only</h2>
        <p className="text-gray-400 text-sm">Only this league's commissioner can view these settings.</p>
        <button className="btn-secondary" onClick={() => navigate(`/nfl-manager/${league.id}`)}>Back to My Team</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="section-title flex items-center gap-2"><Settings className="w-4 h-4" /> Commissioner</h2>

      <SectionCard title="League Setup" icon={Settings} defaultOpen>
        <LeagueSetupSection league={league} reload={reload} />
      </SectionCard>

      <SectionCard title="Roster Template" icon={ListChecks}>
        <RosterTemplateSection league={league} reload={reload} />
      </SectionCard>

      <SectionCard title="Scoring Settings" icon={Sliders}>
        <ScoringSettingsSection league={league} scoringProfile={scoringProfile} reload={reload} />
      </SectionCard>

      <SectionCard title="Managers" icon={Users}>
        <ManagersSection members={members} actorUserId={user?.uid} reload={reload} />
      </SectionCard>

      <SectionCard title="Market Cycles" icon={Gavel}>
        <MarketCyclesSection league={league} actorUserId={user?.uid} reload={reload} />
      </SectionCard>

      <SectionCard title="Players" icon={Search}>
        <PlayersSection leagueId={league.id} />
      </SectionCard>

      <SectionCard title="Stats & Scoring" icon={ClipboardList}>
        <StatsScoringSection league={league} members={members} actorUserId={user?.uid} reload={reload} />
      </SectionCard>

      <SectionCard title="Standings" icon={Trophy}>
        <p className="text-sm text-gray-400">See the Standings tab for full rankings and tie-break detail.</p>
      </SectionCard>
    </div>
  )
}
