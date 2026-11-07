import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useNflLeagues } from '@/hooks/useNflLeagues'
import MoneyInput from '@/components/shared/MoneyInput'

const DEFAULT_ROSTER_TEMPLATE = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 2 }

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

export default function CreateLeaguePage() {
  const navigate = useNavigate()
  const { create } = useNflLeagues()

  const [name, setName] = useState('')
  const [leagueType, setLeagueType] = useState('private')
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())
  const [budgetAmount, setBudgetAmount] = useState(50000000)
  const [rosterMode, setRosterMode] = useState('random')
  const [rosterTemplate, setRosterTemplate] = useState(DEFAULT_ROSTER_TEMPLATE)
  const [pprValue, setPprValue] = useState(null)
  const [startWeek, setStartWeek] = useState(1)
  const [endWeek, setEndWeek] = useState(18)
  const [maxMembers, setMaxMembers] = useState(10)
  const [moneyPerPoint, setMoneyPerPoint] = useState(1000000)
  const [teamName, setTeamName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const rosterSize = Object.values(rosterTemplate).reduce((s, v) => s + Number(v || 0), 0)

  const submit = async () => {
    setError(null)
    if (!name.trim()) return setError('League name is required.')
    if (pprValue === null) return setError('Choose a reception (PPR) scoring format.')
    if (!teamName.trim()) return setError('Your team name is required.')

    setBusy(true)
    try {
      const league = await create({
        name: name.trim(),
        leagueType,
        seasonYear: Number(seasonYear),
        budgetAmount: Number(budgetAmount),
        rosterMode,
        rosterTemplate,
        pprValue,
        startWeek: Number(startWeek),
        endWeek: Number(endWeek),
        maxMembers: Number(maxMembers),
        moneyPerPoint: Number(moneyPerPoint),
        commissionerTeamName: teamName.trim(),
      })
      navigate(`/nfl-manager/${league.id}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <button onClick={() => navigate('/nfl-manager')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" /> Leagues
      </button>

      <div>
        <h1 className="text-2xl font-black text-white">Create a League</h1>
        <p className="text-sm text-gray-400">You'll be the commissioner — you can adjust most settings later.</p>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>}

      <div className="card space-y-5">
        <Field label="League Name">
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday Ballers" />
        </Field>

        <Field label="Your Team Name">
          <input className="input-field" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Thomas's Titans" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Visibility">
            <select className="input-field" value={leagueType} onChange={(e) => setLeagueType(e.target.value)}>
              <option value="private">Private (invite only)</option>
              <option value="public">Public (anyone can join)</option>
            </select>
          </Field>
          <Field label="Season Year">
            <input type="number" className="input-field" value={seasonYear} onChange={(e) => setSeasonYear(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Max Managers">
            <input type="number" min={2} max={32} className="input-field" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
          </Field>
          <Field label="Team Budget">
            <MoneyInput className="input-field" value={budgetAmount} onChange={setBudgetAmount} />
          </Field>
        </div>

        <Field label="League Start Mode">
          <select className="input-field" value={rosterMode} onChange={(e) => setRosterMode(e.target.value)}>
            <option value="random">Random roster draw + remaining budget</option>
            <option value="empty">Empty roster + full budget</option>
            <option value="auction" disabled>Auction draft (coming soon)</option>
          </select>
        </Field>

        <Field label="Reception Scoring (PPR)">
          <div className="flex gap-2">
            {[{ v: 0, label: 'Standard (0)' }, { v: 0.5, label: 'Half-PPR (0.5)' }, { v: 1, label: 'Full PPR (1)' }].map((opt) => (
              <button
                key={opt.v}
                type="button"
                className={`flex-1 text-sm py-2 rounded-lg border transition-colors ${
                  pprValue === opt.v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-f1dark border-f1light text-gray-400 hover:text-white'
                }`}
                onClick={() => setPprValue(opt.v)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Roster Template (${rosterSize} players)`}>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(rosterTemplate).map(([pos, count]) => (
              <div key={pos} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-9">{pos}</span>
                <input
                  type="number" min={0} max={10} className="input-field py-1.5 text-sm"
                  value={count}
                  onChange={(e) => setRosterTemplate((prev) => ({ ...prev, [pos]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Week">
            <input type="number" min={1} max={18} className="input-field" value={startWeek} onChange={(e) => setStartWeek(e.target.value)} />
          </Field>
          <Field label="End Week">
            <input type="number" min={1} max={18} className="input-field" value={endWeek} onChange={(e) => setEndWeek(e.target.value)} />
          </Field>
        </div>

        <Field label="Weekly Bonus ($ per fantasy point)">
          <MoneyInput className="input-field" value={moneyPerPoint} onChange={setMoneyPerPoint} />
        </Field>

        <p className="text-xs text-gray-500">
          Lineup format is fixed for now: QB, RB, RB, WR, WR, TE, FLEX (RB/WR/TE), D/ST, K.
        </p>

        <button className="btn-primary w-full py-2.5" disabled={busy} onClick={submit}>
          {busy ? 'Creating League...' : 'Create League'}
        </button>
      </div>
    </div>
  )
}
