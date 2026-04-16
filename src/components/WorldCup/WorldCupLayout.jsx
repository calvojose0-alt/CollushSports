import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Globe, Trophy, Users, Settings, ChevronLeft, Flag } from 'lucide-react'
import { useWCGame } from '@/hooks/useWCGame'
import { useAuth } from '@/hooks/useAuth'
import { isPicksLocked, PICK_LOCK_TIME } from '@/data/wc2026Teams'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

const ALL_NAV = [
  { to: '/world-cup',            label: 'Group Stage Picks',    icon: Flag,  exact: true },
  { to: '/world-cup/bracket',    label: 'Playoff Bracket Picks', icon: Globe              },
  { to: '/world-cup/leaderboard',label: 'Leaderboard',icon: Trophy               },
  { to: '/world-cup/groups',     label: 'Groups',     icon: Users                },
  { to: '/world-cup/admin',      label: 'Admin',      icon: Settings, adminOnly: true },
]

function LockCountdown() {
  const locked = isPicksLocked()
  if (locked) {
    return (
      <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2 text-xs text-red-300 text-center">
        🔒 Picks are locked — Tournament started
      </div>
    )
  }
  return (
    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2 text-xs text-yellow-300 text-center">
      <div className="font-semibold">Picks lock June 11, 2026</div>
      <div className="text-yellow-500 mt-0.5">1h before first match</div>
    </div>
  )
}

export default function WorldCupLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    myPlayer,
    leaderboard,
    completedGroupMatches,
    totalGroupMatches,
    loading,
    error,
  } = useWCGame()

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL
  const NAV = ALL_NAV.filter((item) => !item.adminOnly || isAdmin)

  const myRank = myPlayer
    ? leaderboard.findIndex((p) => p.userId === user?.uid) + 1
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back + title bar */}
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
          <div className="w-6 h-6 bg-yellow-600 rounded flex items-center justify-center">
            <Globe className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">2026 World Cup Quiniela</span>
        </div>
        {myPlayer?.groupStageLeader && (
          <span className="ml-auto text-xs bg-yellow-900/60 text-yellow-300 border border-yellow-700 px-2 py-0.5 rounded-full font-bold">
            G — Group Stage Leader
          </span>
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
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Stats card */}
          <div className="mt-6 card text-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Stats</p>

            {myPlayer ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Points</span>
                  <span className="font-bold text-yellow-400">{myPlayer.totalPoints || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Exact Scores</span>
                  <span className="font-bold text-green-400">{myPlayer.exactHits || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Correct Outcomes</span>
                  <span className="font-bold text-blue-400">{myPlayer.outcomeHits || 0}</span>
                </div>
                {myRank && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rank</span>
                    <span className="font-bold text-white">#{myRank}</span>
                  </div>
                )}
                <div className="border-t border-f1light pt-2" />
              </>
            ) : (
              <p className="text-gray-500 text-xs">Loading…</p>
            )}

            <div className="flex justify-between">
              <span className="text-gray-400">Matches Done</span>
              <span className="font-bold text-white">{completedGroupMatches}/{totalGroupMatches}</span>
            </div>

            <div className="border-t border-f1light pt-2" />
            <LockCountdown />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full" />
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
