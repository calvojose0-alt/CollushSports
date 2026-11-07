import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Globe, Users, Trophy, Settings, ChevronLeft } from 'lucide-react'
import { useWinLeague } from '@/hooks/useWinLeague'
import { useAuth } from '@/hooks/useAuth'
import PullToRefresh from '@/components/shared/PullToRefresh'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

const ALL_NAV = [
  { to: '/win-league',             label: 'Draft',       icon: Globe,    exact: true },
  { to: '/win-league/my-teams',    label: 'My Teams',    icon: Users                },
  { to: '/win-league/leaderboard', label: 'Leaderboard', icon: Trophy               },
  { to: '/win-league/admin',       label: 'Admin',       icon: Settings, adminOnly: true },
]

function StatusBanner({ session, isMyTurn, currentDrafter, myPlayer, players }) {
  if (!session) return null
  const status = session.status

  if (status === 'setup') {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-gray-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
        Draft setup in progress — waiting for admin to open registration.
      </div>
    )
  }
  if (status === 'open') {
    return (
      <div className="bg-blue-900/30 border border-blue-700 rounded-xl px-4 py-2.5 text-xs text-blue-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
        <span><strong>Registration open</strong> — {players.length} / {session.maxPlayers} players joined.{' '}
        {!myPlayer && <span className="text-white font-semibold">Go to Draft tab to join!</span>}
        </span>
      </div>
    )
  }
  if (status === 'drafting') {
    if (isMyTurn) {
      return (
        <div className="bg-green-900/40 border border-green-600 rounded-xl px-4 py-2.5 text-xs text-green-300 flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <strong>It's your pick!</strong>&nbsp;Go to the Draft tab and choose your team.
        </div>
      )
    }
    return (
      <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl px-4 py-2.5 text-xs text-yellow-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
        Draft in progress — <strong>{currentDrafter?.displayName || 'Someone'}</strong> is on the clock.
      </div>
    )
  }
  if (status === 'locked' || status === 'active') {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-xl px-4 py-2.5 text-xs text-green-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        Draft locked — scoring live as tournament results are recorded.
      </div>
    )
  }
  if (status === 'complete') {
    return (
      <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl px-4 py-2.5 text-xs text-yellow-300 flex items-center gap-2">
        🏆 Tournament complete — final standings are set!
      </div>
    )
  }
  return null
}

export default function WinLeagueLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { session, players, myPlayer, isMyTurn, currentDrafter, loading, error, refreshResults, reload } = useWinLeague()

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL
  const NAV = ALL_NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back + Title bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Games
        </button>
        <span className="text-gray-600">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
            <Globe className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">2026 Soccer Win League</span>
        </div>
      </div>

      {/* Status banner */}
      <div className="mb-4">
        <StatusBanner
          session={session}
          isMyTurn={isMyTurn}
          currentDrafter={currentDrafter}
          myPlayer={myPlayer}
          players={players}
        />
      </div>

      {/* Mobile tab strip */}
      <div className="lg:hidden -mx-4 px-4 mb-4 overflow-x-auto scrollbar-none">
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
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30'
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
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          {/* Quick stats */}
          <div className="mt-6 card text-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Win League</p>
            <div className="flex justify-between">
              <span className="text-gray-400">Players</span>
              <span className="font-bold text-white">{players.length} / {session?.maxPlayers ?? 10}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className={`font-bold capitalize ${
                session?.status === 'drafting' ? 'text-yellow-400' :
                session?.status === 'locked'   ? 'text-green-400'  :
                session?.status === 'open'     ? 'text-blue-400'   :
                session?.status === 'complete' ? 'text-yellow-300' :
                'text-gray-500'
              }`}>
                {session?.status ?? 'setup'}
              </span>
            </div>
            {myPlayer && (
              <>
                <div className="border-t border-f1light pt-2" />
                <div className="flex justify-between">
                  <span className="text-gray-400">My points</span>
                  <span className="font-bold text-emerald-400">
                    {(myPlayer.matchPoints || 0) + (myPlayer.advancePoints || 0)}
                  </span>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          )}
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm mb-4">
              <p className="font-bold mb-1">Error loading game data</p>
              <p className="font-mono text-xs">{error}</p>
            </div>
          )}
          {!loading && (
            <PullToRefresh
              accentColor="#10b981"
              onRefresh={async () => { await refreshResults(); await reload() }}
            >
              <Outlet />
            </PullToRefresh>
          )}
        </main>
      </div>
    </div>
  )
}
