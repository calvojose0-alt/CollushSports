// Admin page — enter race results and trigger survivor evaluation
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useF1Game } from '@/hooks/useF1Game'
import { saveRaceResult, getRaceResult } from '@/services/firebase/firestore'
import { processRaceResults } from '@/services/gameEngine/survivorEngine'
import { fetchRaceResults } from '@/services/api/f1Api'
import { RACES_2026 } from '@/data/calendar2026'
import { DRIVERS_2026 } from '@/data/drivers2026'
import { Settings, Download, CheckCircle2, AlertCircle, Loader } from 'lucide-react'

const EMPTY_RESULTS = Array.from({ length: 20 }, (_, i) => ({
  position: i + 1,
  driverId: '',
  driverName: '',
}))

export default function RaceResultsAdmin() {
  const { user, profile } = useAuth()
  const { gameId, refreshResults, races, raceResults } = useF1Game()

  const [selectedRaceId, setSelectedRaceId] = useState('')
  const [results, setResults] = useState(EMPTY_RESULTS)
  const [processing, setProcessing] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [message, setMessage] = useState(null)

  const selectedRace = RACES_2026.find((r) => r.id === selectedRaceId)
  const alreadyProcessed = raceResults.some((r) => r.raceId === selectedRaceId)

  const handleRaceChange = async (raceId) => {
    setSelectedRaceId(raceId)
    setMessage(null)
    const existing = await getRaceResult(gameId, raceId)
    if (existing?.results) {
      const filled = EMPTY_RESULTS.map((row) => {
        const found = existing.results.find((r) => r.position === row.position)
        return found || row
      })
      setResults(filled)
    } else {
      setResults(EMPTY_RESULTS)
    }
  }

  const handleDriverChange = (position, driverId) => {
    const driver = DRIVERS_2026.find((d) => d.id === driverId)
    setResults((prev) =>
      prev.map((r) =>
        r.position === position
          ? { ...r, driverId, driverName: driver?.name || '' }
          : r
      )
    )
  }

  const handleFetchFromApi = async () => {
    if (!selectedRace) return
    setFetching(true)
    setMessage(null)
    try {
      const apiResults = await fetchRaceResults(2026, selectedRace.round)
      if (!apiResults) {
        setMessage({ type: 'info', text: 'API returned no results — please enter manually.' })
        return
      }
      const filled = EMPTY_RESULTS.map((row) => {
        const found = apiResults.find((r) => r.position === row.position)
        return found || row
      })
      setResults(filled)
      setMessage({ type: 'success', text: `Fetched ${apiResults.length} positions from OpenF1 API.` })
    } catch (err) {
      setMessage({ type: 'error', text: `API error: ${err.message}` })
    } finally {
      setFetching(false)
    }
  }

  const handleProcess = async () => {
    const filled = results.filter((r) => r.driverId)
    if (filled.length < 10) {
      setMessage({ type: 'error', text: 'Please enter at least 10 finishing positions before processing.' })
      return
    }
    setProcessing(true)
    setMessage(null)
    try {
      await saveRaceResult({ gameId, raceId: selectedRaceId, results: filled })
      const { processed } = await processRaceResults(gameId, selectedRaceId, filled)
      await refreshResults()
      setMessage({ type: 'success', text: `Processed ${processed} picks. Player statuses updated.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-white">Race Results — Admin</h2>
      </div>

      <div className="card bg-yellow-900/20 border-yellow-700/50">
        <p className="text-sm text-yellow-300">
          <strong>Admin only.</strong> Enter race results after each Grand Prix to evaluate all players'
          picks and update survival statuses automatically.
        </p>
      </div>

      {/* Race selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-300 mb-2">Select Race</label>
        <select
          value={selectedRaceId}
          onChange={(e) => handleRaceChange(e.target.value)}
          className="input-field"
        >
          <option value="">— Choose a race —</option>
          {RACES_2026.map((race) => {
            const done = raceResults.some((r) => r.raceId === race.id)
            return (
              <option key={race.id} value={race.id}>
                R{race.round} — {race.flag} {race.name} {done ? '✓' : ''}
              </option>
            )
          })}
        </select>
      </div>

      {selectedRaceId && (
        <>
          {/* Fetch from API */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleFetchFromApi}
              disabled={fetching}
              className="btn-secondary flex items-center gap-2"
            >
              {fetching ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {fetching ? 'Fetching…' : 'Fetch from OpenF1 API'}
            </button>
            <span className="text-xs text-gray-500">or enter results manually below</span>
          </div>

          {/* Results grid */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-f1light flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Finishing Order</h3>
              {alreadyProcessed && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Already processed
                </span>
              )}
            </div>
            <div className="divide-y divide-f1light max-h-96 overflow-y-auto">
              {results.slice(0, 20).map((row) => (
                <div key={row.position} className="flex items-center gap-3 px-4 py-2">
                  <div className="w-8 text-center">
                    <span className={`text-sm font-bold ${
                      row.position <= 3 ? 'text-f1gold' : row.position <= 10 ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      P{row.position}
                    </span>
                  </div>
                  <select
                    value={row.driverId}
                    onChange={(e) => handleDriverChange(row.position, e.target.value)}
                    className="input-field flex-1 text-sm py-1.5"
                  >
                    <option value="">— Select driver —</option>
                    {DRIVERS_2026.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.team})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm border ${
              message.type === 'success'
                ? 'bg-green-900/30 border-green-700 text-green-300'
                : message.type === 'error'
                  ? 'bg-red-900/30 border-red-700 text-red-300'
                  : 'bg-blue-900/30 border-blue-700 text-blue-300'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              {message.text}
            </div>
          )}

          {/* Process button */}
          <button
            onClick={handleProcess}
            disabled={processing || alreadyProcessed}
            className="btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2"
          >
            {processing ? (
              <><Loader className="w-5 h-5 animate-spin" /> Processing…</>
            ) : alreadyProcessed ? (
              <><CheckCircle2 className="w-5 h-5" /> Already Processed</>
            ) : (
              'Process Results & Update Players'
            )}
          </button>
        </>
      )}
    </div>
  )
}
