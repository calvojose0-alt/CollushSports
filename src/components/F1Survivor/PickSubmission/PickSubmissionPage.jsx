import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useF1Game } from '@/hooks/useF1Game'
import { submitPick } from '@/services/firebase/firestore'
import { validatePick } from '@/services/gameEngine/survivorEngine'
import { DRIVER_MAP } from '@/data/drivers2026'
import { RACES_2026, TRACK_HISTORY, isRaceLocked } from '@/data/calendar2026'
import { format } from 'date-fns'
import ColumnPick from './ColumnPick'
import DriverPanel from './DriverPanel'
import {
  CheckCircle2, AlertCircle, Lock, Timer, ChevronRight, ChevronLeft, Trophy, Flag,
} from 'lucide-react'

function RaceSelector({ selectedRace, onChange, picks }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {RACES_2026.map((race) => {
        const pick = picks.find((p) => p.raceId === race.id)
        const locked = isRaceLocked(race.id)
        const isSelected = selectedRace?.id === race.id
        const hasPick = !!pick

        return (
          <button
            key={race.id}
            onClick={() => onChange(race)}
            className={`
              flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all border
              ${isSelected
                ? 'bg-f1red border-f1red text-white'
                : locked
                  ? 'bg-f1dark border-f1light text-gray-500 cursor-default'
                  : 'bg-f1gray border-f1light text-gray-300 hover:border-gray-500'
              }
            `}
          >
            <div className="text-lg leading-none">{race.flag}</div>
            <div className="text-xs font-bold mt-0.5">{race.shortName}</div>
            <div className="text-xs text-gray-500">R{race.round}</div>
            {hasPick && !locked && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 mx-auto mt-1" />
            )}
          </button>
        )
      })}
    </div>
  )
}

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

function RaceFinishingOrder({ raceId }) {
  const trackData = TRACK_HISTORY[raceId]
  if (!trackData) return null

  // Build sorted finishing order from TRACK_HISTORY (last value = actual 2026 result)
  const order = Object.entries(trackData)
    .map(([driverId, positions]) => ({ driverId, pos: positions[positions.length - 1] }))
    .filter(({ pos }) => pos < 20)
    .sort((a, b) => a.pos - b.pos)

  const dnf = Object.entries(trackData)
    .map(([driverId, positions]) => ({ driverId, pos: positions[positions.length - 1] }))
    .filter(({ pos }) => pos >= 20)

  return (
    <div className="card col-span-1 lg:col-span-3">
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Race Result</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Left column: P1–P10 */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-f1gold uppercase tracking-wider mb-2">Top 10</p>
          {order.filter(({ pos }) => pos <= 10).map(({ driverId, pos }) => {
            const driver = DRIVER_MAP[driverId]
            if (!driver) return null
            const isPodium = pos <= 3
            return (
              <div
                key={driverId}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${isPodium ? 'bg-f1gold/10 border border-f1gold/30' : 'bg-f1dark'}`}
              >
                <span className="w-7 text-center font-black text-sm flex-shrink-0" style={{ color: isPodium ? '#FFD700' : '#6b7280' }}>
                  {MEDAL[pos] ?? `P${pos}`}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-black text-white"
                  style={{ background: driver.teamColor }}
                >
                  {driver.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isPodium ? 'text-white' : 'text-gray-300'}`}>{driver.name}</p>
                  <p className="text-xs truncate" style={{ color: driver.teamColor }}>{driver.team}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right column: P11+ and DNF/DNS */}
        <div className="space-y-1.5">
          {order.filter(({ pos }) => pos > 10).map(({ driverId, pos }) => {
            const driver = DRIVER_MAP[driverId]
            if (!driver) return null
            return (
              <div key={driverId} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-f1dark">
                <span className="w-6 text-center font-black text-xs flex-shrink-0 text-gray-500">P{pos}</span>
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                  style={{ background: driver.teamColor }}
                >
                  {driver.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate text-gray-300">{driver.name}</p>
                  <p className="text-xs truncate" style={{ color: driver.teamColor }}>{driver.team}</p>
                </div>
              </div>
            )
          })}
          {dnf.length > 0 && (
            <div className="pt-2 mt-1 border-t border-f1light space-y-1.5">
              <p className="text-xs text-gray-500 uppercase tracking-wider">DNF / DNS</p>
              {dnf.map(({ driverId }) => {
                const driver = DRIVER_MAP[driverId]
                if (!driver) return null
                return (
                  <div key={driverId} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-f1dark opacity-50">
                    <span className="w-6 text-center text-xs text-gray-600 flex-shrink-0">—</span>
                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: driver.teamColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-gray-400">{driver.name}</p>
                      <p className="text-xs truncate" style={{ color: driver.teamColor }}>{driver.team}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PickSubmissionPage() {
  const { user } = useAuth()
  const { currentRace, usedDrivers, myPicks, myPlayer, gameId, refreshPicks } = useF1Game()

  const [selectedRace, setSelectedRace] = useState(null)
  const [pickedA, setPickedA] = useState(null)
  const [pickedB, setPickedB] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Default to current race
  useEffect(() => {
    if (currentRace && !selectedRace) setSelectedRace(currentRace)
  }, [currentRace])

  // Restore existing pick when switching races
  useEffect(() => {
    if (!selectedRace) return
    const existing = myPicks.find((p) => p.raceId === selectedRace.id)
    setPickedA(existing?.columnA ? DRIVER_MAP[existing.columnA.driverId] : null)
    setPickedB(existing?.columnB ? DRIVER_MAP[existing.columnB.driverId] : null)
    setSubmitSuccess(false)
    setSubmitError(null)
  }, [selectedRace, myPicks])

  const locked = selectedRace ? isRaceLocked(selectedRace.id) : true
  const raceDate = selectedRace ? new Date(selectedRace.raceDate) : null
  const lockTime = selectedRace ? new Date(selectedRace.lockTime) : null

  const usedInA = usedDrivers.usedA
  const usedInB = usedDrivers.usedB

  // When changing picks, exclude current race from constraint (editing allowed)
  const prevPickForRace = myPicks.find((p) => p.raceId === selectedRace?.id)
  const effectiveUsedA = new Set([...usedInA].filter((id) => id !== prevPickForRace?.columnA?.driverId))
  const effectiveUsedB = new Set([...usedInB].filter((id) => id !== prevPickForRace?.columnB?.driverId))

  const handleSubmit = async () => {
    if (!pickedA || !pickedB) {
      setSubmitError('Please select a driver for both columns.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)

    const validation = await validatePick({
      gameId,
      userId: user.uid,
      raceId: selectedRace.id,
      columnA: { driverId: pickedA.id, driverName: pickedA.name },
      columnB: { driverId: pickedB.id, driverName: pickedB.name },
    })

    if (!validation.valid) {
      setSubmitError(validation.reason)
      setSubmitting(false)
      return
    }

    try {
      await submitPick({
        gameId,
        userId: user.uid,
        raceId: selectedRace.id,
        columnA: { driverId: pickedA.id, driverName: pickedA.name },
        columnB: { driverId: pickedB.id, driverName: pickedB.name },
      })
      await refreshPicks()
      setSubmitSuccess(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  if (myPlayer?.status === 'eliminated') {
    return (
      <div className="card text-center py-16">
        <div className="text-5xl mb-4">🏁</div>
        <h2 className="text-2xl font-black text-white mb-2">Eliminated</h2>
        <p className="text-gray-400">You were eliminated in race {myPlayer.eliminatedAt}.</p>
        <p className="text-gray-400 mt-1">Check the leaderboard to see who's still racing.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Flag className="w-5 h-5 text-gray-400" />
        <h2 className="font-bold text-blue-800">My Picks</h2>
      </div>

      {/* Race selector */}
      <div className="card">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Select Race Week</p>
        <RaceSelector selectedRace={selectedRace} onChange={setSelectedRace} picks={myPicks} />
      </div>

      {selectedRace && (
        <>
          {/* Race info bar */}
          <div className="flex flex-wrap items-center gap-3 bg-f1gray/60 border border-f1light rounded-xl px-4 py-3">
            <span className="text-2xl">{selectedRace.flag}</span>
            <div>
              <p className="font-bold text-white">{selectedRace.name}</p>
              <p className="text-xs text-gray-400">{selectedRace.circuit} — Round {selectedRace.round}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {locked ? (
                <span className="badge-eliminated flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              ) : (
                <>
                  <Timer className="w-4 h-4 text-f1accent" />
                  <span className="text-xs text-f1accent font-semibold">
                    Locks {format(lockTime, 'MMM d, HH:mm')} UTC
                  </span>
                </>
              )}
              {raceDate && (
                <span className="text-xs text-gray-400 ml-2">
                  Race: {format(raceDate, 'MMM d')}
                </span>
              )}
            </div>
          </div>

          {/* Submit area — shown right below the race header */}
          {!locked && (
            <div className="card">
              {submitSuccess ? (
                <div className="flex items-center gap-3 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="font-semibold">Picks saved!</p>
                    <p className="text-xs text-gray-400">
                      {pickedA?.name} (Podium) · {pickedB?.name} (Top 10)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm text-gray-300">
                    {pickedA && pickedB ? (
                      <>
                        <span className="text-f1gold font-semibold">{pickedA.name}</span>
                        <span className="text-gray-500 mx-1">·</span>
                        <span className="text-green-400 font-semibold">{pickedB.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-500">Select both drivers to submit</span>
                    )}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!pickedA || !pickedB || submitting}
                    className="btn-primary flex items-center gap-2"
                  >
                    {submitting ? 'Saving…' : 'Submit Picks'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              {submitError && (
                <div className="mt-3 flex items-start gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}
            </div>
          )}

          {locked && prevPickForRace && (
            <div className="card bg-f1dark/50">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Pick (Locked)</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-gray-400">Podium Pick</p>
                  <p className="font-bold text-f1gold">{prevPickForRace.columnA?.driverName || '—'}</p>
                  {prevPickForRace.resultA && (
                    <span className={`text-xs ${prevPickForRace.resultA === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {prevPickForRace.resultA === 'success' ? '✓ Podium!' : '✗ Missed'}
                    </span>
                  )}
                </div>
                <div className="border-l border-f1light pl-4">
                  <p className="text-xs text-gray-400">Top 10 Pick</p>
                  <p className="font-bold text-green-400">{prevPickForRace.columnB?.driverName || '—'}</p>
                  {prevPickForRace.resultB && (
                    <span className={`text-xs ${prevPickForRace.resultB === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {prevPickForRace.resultB === 'success' ? '✓ Top 10!' : '✗ Missed'}
                    </span>
                  )}
                </div>
                {prevPickForRace.pointEarned && (
                  <div className="ml-auto flex items-center gap-1 text-f1gold font-bold">
                    <Trophy className="w-4 h-4" /> +1 Point
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed race: show finishing order. Upcoming: show pick columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {TRACK_HISTORY[selectedRace.id] ? (
              <RaceFinishingOrder raceId={selectedRace.id} />
            ) : (
              <>
                {/* Podium Pick */}
                <ColumnPick
                  column="A"
                  label="Podium Pick"
                  description="Driver must finish Top 3"
                  selectedDriver={pickedA}
                  usedDriverIds={effectiveUsedA}
                  onSelect={(d) => setPickedA(d)}
                />

                {/* Top 10 Pick */}
                <ColumnPick
                  column="B"
                  label="Top 10 Pick"
                  description="Driver must finish Top 10"
                  selectedDriver={pickedB}
                  usedDriverIds={effectiveUsedB}
                  onSelect={(d) => setPickedB(d)}
                />

                {/* Driver Analysis Panel — always visible, self-contained */}
                <DriverPanel raceId={selectedRace?.id} />
              </>
            )}
          </div>

          {/* Survival logic reminder */}
          <div className="bg-f1dark border border-f1light rounded-xl px-4 py-3 text-sm text-gray-400">
            <strong className="text-white">Survival rule:</strong> You advance if at least one pick succeeds.
            Both succeed → earn 1 bonus point. Both fail → eliminated.{' '}
            <span className="text-gray-500">Each driver can be used once per column, all season.</span>
          </div>
        </>
      )}
    </div>
  )
}
