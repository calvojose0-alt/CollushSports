// Admin page — enter race results and trigger survivor evaluation
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useF1Game } from '@/hooks/useF1Game'
import { saveRaceResult, getRaceResult, deleteRaceResult } from '@/services/firebase/firestore'
import { processRaceResults } from '@/services/gameEngine/survivorEngine'
import { fetchRaceResults } from '@/services/api/f1Api'
import { RACES_2026, TRACK_HISTORY } from '@/data/calendar2026'
import { DRIVERS_2026 } from '@/data/drivers2026'
import { Settings, Download, CheckCircle2, AlertCircle, Loader, Lock, Pencil, Trash2 } from 'lucide-react'

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
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState(null)
  const [positionsLocked, setPositionsLocked] = useState(true)

  const selectedRace = RACES_2026.find((r) => r.id === selectedRaceId)
  const alreadyProcessed = raceResults.some((r) => r.raceId === selectedRaceId)
  // Allow reprocessing once the user explicitly unlocks positions
  const canProcess = !processing && (!alreadyProcessed || !positionsLocked)

  const handleRaceChange = async (raceId) => {
    setSelectedRaceId(raceId)
    setMessage(null)

    // 1. Try saved result from localStorage/Firebase
    const existing = await getRaceResult(gameId, raceId)
    if (existing?.results) {
      const filled = EMPTY_RESULTS.map((row) => {
        const found = existing.results.find((r) => r.position === row.position)
        return found || row
      })
      setResults(filled)
      setPositionsLocked(true)
      return
    }

    // 2. Fall back to TRACK_HISTORY for completed races
    if (TRACK_HISTORY[raceId]) {
      const trackData = TRACK_HISTORY[raceId]
      const sorted = Object.entries(trackData)
        .map(([driverId, positions]) => ({ driverId, pos: positions[positions.length - 1] }))
        .filter(({ pos }) => pos < 20)
        .sort((a, b) => a.pos - b.pos)

      const filled = EMPTY_RESULTS.map((row) => {
        const found = sorted.find(({ pos }) => pos === row.position)
        if (found) {
          const driver = DRIVERS_2026.find((d) => d.id === found.driverId)
          return { position: row.position, driverId: found.driverId, driverName: driver?.name || found.driverId }
        }
        return row
      })
      setResults(filled)
      setPositionsLocked(true)
      return
    }

    setResults(EMPTY_RESULTS)
    setPositionsLocked(false)
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

  const handleReset = async () => {
    if (!selectedRaceId) return
    setResetting(true)
    setMessage(null)
    try {
      await deleteRaceResult(gameId, selectedRaceId)
      await refreshResults()
      setResults(EMPTY_RESULTS)
      setPositionsLocked(false)
      setMessage({ type: 'success', text: 'Race results cleared. You can now enter new positions.' })
    } catch (err) {
      setMessage({ type: 'error', text: `Reset failed: ${err.message}` })
    } finally {
      setResetting(false)
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
        <h2 className="font-bold text-blue-800">Race Results — Admin</h2>
      </div>

      <div className="card bg-blue-900/30 border-blue-700/50">
        <p className="text-sm text-blue-900">
          <strong className="text-f1red">Admin only.</strong> Enter race results after each Grand Prix to evaluate all players'
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
            const done = raceResults.some((r) => r.raceId === race.id) || !!TRACK_HISTORY[race.id]
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

          {/* Lock / unlock bar */}
          {positionsLocked ? (
            <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Lock className="w-4 h-4" />
                <span>Positions are locked. Click to edit.</span>
              </div>
              <button
                onClick={() => setPositionsLocked(false)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Change Race Positions
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Pencil className="w-4 h-4" />
                <span>Positions are unlocked. Edit dropdowns or reset all results below.</span>
              </div>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {resetting
                  ? <><Loader className="w-4 h-4 animate-spin" /> Resetting…</>
                  : <><Trash2 className="w-4 h-4" /> Reset All Results</>
                }
              </button>
            </div>
          )}

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
                    disabled={positionsLocked}
                    className={`input-field flex-1 text-sm py-1.5 ${positionsLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">— Select driver —</option>
                    {DRIVERS_2026.filter((d) =>
                      d.id === row.driverId ||
                      !results.some((r) => r.position !== row.position && r.driverId === d.id)
                    ).map((d) => (
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
            disabled={!canProcess}
            className="btn-primary w-full py-3 text-base font-bold flex items-center justify-center gap-2"
          >
            {processing ? (
              <><Loader className="w-5 h-5 animate-spin" /> Processing…</>
            ) : alreadyProcessed && positionsLocked ? (
              <><CheckCircle2 className="w-5 h-5" /> Already Processed</>
            ) : alreadyProcessed && !positionsLocked ? (
              'Reprocess Results & Update Players'
            ) : (
              'Process Results & Update Players'
            )}
          </button>
        </>
      )}
    </div>
  )
}
