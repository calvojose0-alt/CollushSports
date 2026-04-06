import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Flag, BarChart3, History, Settings, Users, ChevronLeft, Trophy,
} from 'lucide-react'
import { useF1Game } from '@/hooks/useF1Game'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { to: '/f1-survivor', label: 'My Picks', icon: Flag, exact: true },
  { to: '/f1-survivor/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/f1-survivor/history', label: 'History', icon: History },
  { to: '/f1-survivor/groups', label: 'Groups', icon: Users },
  { to: '/f1-survivor/admin', label: 'Admin', icon: Settings },
]

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
  const { myPlayer, currentRace, leaderboard } = useF1Game()

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
                  {item.label}
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
