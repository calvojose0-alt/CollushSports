import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Flag, BarChart3, History, Settings, Users, ChevronLeft, Trophy,
} from 'lucide-react'
import { useF1Game } from '@/hooks/useF1Game'
import { useAuth } from '@/hooks/useAuth'

const ALL_NAV = [
  { to: '/f1-survivor', label: 'My Picks', icon: Flag, exact: true, labelColor: 'text-blue-800' },
  { to: '/f1-survivor/leaderboard', label: 'Leaderboard', icon: Trophy, labelColor: 'text-blue-800' },
  { to: '/f1-survivor/history', label: 'History', icon: History, labelColor: 'text-blue-800' },
  { to: '/f1-survivor/groups', label: 'Groups', icon: Users, labelColor: 'text-blue-800' },
  { to: '/f1-survivor/admin', label: 'Admin', icon: Settings, labelColor: 'text-blue-800', adminOnly: true },
]

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

function StatusBadge({ status }) {
  if (status === 'alive')
    return <span className="badge-alive">● Alive</span>
  if (status === 'eliminated')
    return <span className="badge-eliminated">✗ Eliminated</span>
  if (status === 'winner')
    return <span className="badge-winner">🏆 Champion</span>
  return null
}

export default function F1SurvivorLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { myPlayer, currentRace, leaderboard, loading, error } = useF1Game()

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL
  const NAV = ALL_NAV.filter((item) => !item.adminOnly || isAdmin)

  const alive = leaderboard.filter((p) => p.status === 'alive').length
  const total = leaderboard.length

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back + Title bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Games
        </button>
        <span className="text-gray-600">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-f1red rounded flex items-center justify-center">
            <Flag className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">F1 Survivor Pool 2026</span>
        </div>
        {myPlayer && (
          <div className="ml-auto">
            <StatusBadge status={myPlayer.status} />
          </div>
        )}
      </div>

      {/* ── Mobile tab strip (hidden on md+) ───────────────────────────────── */}
      <div className="md:hidden -mx-4 px-4 mb-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 min-w-max pb-1">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3.5 py-2 rounded-xl border text-xs font-semibold flex-shrink-0 transition-all ${
                    isActive
                      ? 'bg-f1red border-f1red/70 text-white shadow-lg shadow-f1red/20'
                      : 'bg-f1dark border-f1light text-gray-400 hover:text-white hover:border-gray-500'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    isActive ? 'nav-link-active' : 'nav-link'
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span className={item.labelColor || ''}>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Quick stats */}
          <div className="mt-6 card text-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Season Stats</p>
            <div className="flex justify-between">
              <span className="text-gray-400">Players alive</span>
              <span className="font-bold text-green-400">{alive}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total players</span>
              <span className="font-bold text-white">{total}</span>
            </div>
            {myPlayer && (
              <>
                <div className="border-t border-f1light pt-2" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Your points</span>
                  <span className="font-bold text-f1gold">{myPlayer.points || 0}</span>
                </div>
              </>
            )}
            {currentRace && (
              <>
                <div className="border-t border-f1light pt-2" />
                <div>
                  <p className="text-gray-400 text-xs">Next Race</p>
                  <p className="text-white font-semibold text-xs mt-0.5">
                    {currentRace.flag} {currentRace.shortName} — R{currentRace.round}
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-f1red border-t-transparent rounded-full" />
            </div>
          )}
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm mb-4">
              <p className="font-bold mb-1">Error loading game data</p>
              <p className="font-mono text-xs">{error}</p>
            </div>
          )}
          {!loading && <Outlet />}
        </main>
      </div>
    </div>
  )
}
