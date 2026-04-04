// Driver Panel — right-side panel showing stats when a driver is selected
import { useDriverStats } from '@/hooks/useF1Data'
import { DRIVER_MAP } from '@/data/drivers2026'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, Clock, MapPin, X } from 'lucide-react'

function positionColor(pos) {
  if (pos <= 3) return '#FFD700'
  if (pos <= 10) return '#22c55e'
  return '#6b7280'
}

function ProbabilityRing({ value, label, color }) {
  const radius = 28
  const circ = 2 * Math.PI * radius
  const offset = circ - (value / 100) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#2a2a3a" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {value}%
        </text>
      </svg>
      <span className="text-xs text-gray-400 text-center">{label}</span>
    </div>
  )
}

export default function DriverPanel({ driverId, raceId, column, onClose }) {
  const { stats, loading } = useDriverStats(driverId, raceId)
  const driver = DRIVER_MAP[driverId]

  if (!driverId || !driver) return null

  return (
    <div className="bg-f1gray border border-f1light rounded-2xl overflow-hidden w-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: `${driver.teamColor}22`, borderBottom: `2px solid ${driver.teamColor}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
            style={{ background: driver.teamColor }}
          >
            {driver.number}
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{driver.name}</p>
            <p className="text-xs" style={{ color: driver.teamColor }}>{driver.team}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-400 text-sm">Loading stats…</div>
      ) : stats ? (
        <div className="p-4 space-y-5">
          {/* Column context */}
          <div className="text-xs text-gray-400 bg-f1dark rounded-lg px-3 py-2 flex items-center gap-2">
            <MapPin className="w-3 h-3" />
            Analyzing for{' '}
            <strong className="text-white">
              {column === 'A' ? 'Column A (Podium — Top 3)' : 'Column B (Top 10)'}
            </strong>
          </div>

          {/* Probability Rings */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Win Probabilities
            </p>
            <div className="flex justify-around">
              <ProbabilityRing
                value={stats.podiumProbability}
                label="Podium (Top 3)"
                color="#FFD700"
              />
              <ProbabilityRing
                value={stats.top10Probability}
                label="Top 10 Finish"
                color="#22c55e"
              />
            </div>
          </div>

          {/* Recent Finishes Chart */}
          {stats.recentFinishes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last {stats.recentFinishes.length} Races
              </p>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart
                  data={stats.recentFinishes.map((pos, i) => ({ race: `R-${stats.recentFinishes.length - i}`, pos }))}
                  margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="race" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis reversed domain={[1, 20]} tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#15151E', border: '1px solid #38383F', borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [`P${v}`, 'Finish']}
                  />
                  <Bar dataKey="pos" radius={[3, 3, 0, 0]}>
                    {stats.recentFinishes.map((pos, i) => (
                      <Cell key={i} fill={positionColor(pos)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-1 justify-end">
                {[['#FFD700', 'Podium'], ['#22c55e', 'Top 10'], ['#6b7280', 'Other']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-sm" style={{ background: c }} /> {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Track History */}
          {stats.trackHistory?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Track History (Last {stats.trackHistory.length} yrs)
              </p>
              <div className="flex gap-2">
                {stats.trackHistory.map((pos, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-lg py-2 text-center text-xs font-bold"
                    style={{
                      background: `${positionColor(pos)}22`,
                      color: positionColor(pos),
                      border: `1px solid ${positionColor(pos)}44`,
                    }}
                  >
                    P{pos}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data source note */}
          <p className="text-xs text-gray-600 text-right">
            Data: {stats.dataSource === 'OpenF1' ? 'Live via OpenF1 API' : 'Seed estimates'}
          </p>
        </div>
      ) : (
        <div className="p-4 text-sm text-gray-500">Stats unavailable.</div>
      )}
    </div>
  )
}
