import { useF1Game } from '@/hooks/useF1Game'
import { useAuth } from '@/hooks/useAuth'
import { RACES_2026 } from '@/data/calendar2026'
import { CheckCircle2, XCircle, Trophy, Minus } from 'lucide-react'

function ResultIcon({ result }) {
  if (result === 'success') return <CheckCircle2 className="w-4 h-4 text-green-400" />
  if (result === 'fail') return <XCircle className="w-4 h-4 text-red-400" />
  return <Minus className="w-4 h-4 text-gray-600" />
}

function StatusRow({ label, result, driverName }) {
  return (
    <div className="flex items-center gap-2">
      <ResultIcon result={result} />
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-semibold ${result === 'success' ? 'text-green-400' : result === 'fail' ? 'text-red-400' : 'text-gray-500'}`}>
        {driverName || '—'}
      </span>
    </div>
  )
}

export default function HistoryPage() {
  const { user } = useAuth()
  const { myPicks, raceResults, loading } = useF1Game()

  if (loading) {
    return (
      <div className="card text-center py-16 text-gray-400">
        <div className="animate-spin w-8 h-8 border-2 border-f1red border-t-transparent rounded-full mx-auto mb-3" />
        Loading history…
      </div>
    )
  }

  // Merge pick data with race info, sorted by round
  const history = myPicks
    .map((pick) => ({
      ...pick,
      race: RACES_2026.find((r) => r.id === pick.raceId),
    }))
    .filter((p) => p.race)
    .sort((a, b) => a.race.round - b.race.round)

  const completed = history.filter((h) => h.survived !== null)
  const survived = completed.filter((h) => h.survived).length
  const points = completed.filter((h) => h.pointEarned).length

  if (history.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="font-bold text-white mb-1">No picks yet</h3>
        <p className="text-gray-400 text-sm">Submit your first race picks to start tracking history.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Season summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-black text-white">{completed.length}</div>
          <div className="text-xs text-gray-400">Races Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-black text-green-400">{survived}</div>
          <div className="text-xs text-gray-400">Races Survived</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-black text-f1gold">{points}</div>
          <div className="text-xs text-gray-400">Points Earned</div>
        </div>
      </div>

      {/* Race-by-race table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-f1light">
          <h2 className="font-bold text-white">Race-by-Race Picks</h2>
        </div>

        <div className="divide-y divide-f1light">
          {history.map((item) => {
            const isPending = item.survived === null
            const didSurvive = item.survived === true
            const wasEliminated = item.survived === false

            return (
              <div
                key={item.id}
                className={`px-4 py-4 transition-colors ${
                  wasEliminated ? 'bg-red-900/10' : didSurvive ? 'bg-green-900/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Race flag + info */}
                  <div className="flex-shrink-0 text-center">
                    <div className="text-2xl">{item.race.flag}</div>
                    <div className="text-xs text-gray-500">R{item.race.round}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="font-semibold text-white text-sm">{item.race.shortName} — {item.race.city}</p>
                        <p className="text-xs text-gray-500">{item.race.circuit}</p>
                      </div>
                      {/* Outcome */}
                      <div className="flex-shrink-0 ml-2">
                        {isPending ? (
                          <span className="badge-pending">Pending</span>
                        ) : didSurvive ? (
                          <div className="flex items-center gap-1">
                            <span className="badge-alive">Survived</span>
                            {item.pointEarned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900 text-yellow-300 border border-yellow-700">
                                <Trophy className="w-3 h-3" /> +1
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="badge-eliminated">Eliminated</span>
                        )}
                      </div>
                    </div>

                    {/* Pick details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-f1dark rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 mb-1">Column A — Podium</p>
                        <StatusRow
                          label=""
                          result={item.resultA}
                          driverName={item.columnA?.driverName}
                        />
                      </div>
                      <div className="bg-f1dark rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 mb-1">Column B — Top 10</p>
                        <StatusRow
                          label=""
                          result={item.resultB}
                          driverName={item.columnB?.driverName}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
