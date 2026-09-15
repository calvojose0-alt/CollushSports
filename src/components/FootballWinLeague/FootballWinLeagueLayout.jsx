import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Zap, Trophy, Settings, ChevronLeft } from 'lucide-react'
import { useFootballWinLeague } from '@/hooks/useFootballWinLeague'
import { useAuth } from '@/hooks/useAuth'
import PullToRefresh from '@/components/shared/PullToRefresh'
import { fmtPts } from '@/components/FootballWinLeague/format'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

const ALL_NAV = [
  { to: '/football-win-league',       label: 'Standings', icon: Trophy,   exact: true },
  { to: '/football-win-league/admin', label: 'Admin',     icon: Settings, adminOnly: true },
]

export default function FootballWinLeagueLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { standings, weeksScored, session, roster, loading, error, refreshResults, reload } = useFootballWinLeague()

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL
  const NAV = ALL_NAV.filter((item) => !item.adminOnly || isAdmin)
  const topScore = standings[0]?.totalPoints ?? 0
  const lastWeek = weeksScored.length ? Math.max(...weeksScored) : 0

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
          <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">Pro Football Win-League</span>
        </div>
      </div>

      {/* Status banner */}
      <div className="mb-4">
        {session?.status === 'complete' ? (
          <div className="bg-yellow-900/40 border border-yellow-600 rounded-xl px-4 py-2.5 text-xs text-yellow-300 flex items-center gap-2">
            🏆 Season complete — final standings are set!
          </div>
        ) : (
          <div className="bg-green-900/30 border border-green-700 rounded-xl px-4 py-2.5 text-xs text-green-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            {lastWeek > 0
              ? <span>Scoring live — results recorded through <strong>Week {lastWeek}</strong>.</span>
              : <span>Rosters are set — standings update as weekly results are recorded.</span>}
          </div>
        )}
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
                      ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/30'
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
              <span className="text-gray-400">Managers</span>
              <span className="font-bold text-white">{roster.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Weeks scored</span>
              <span className="font-bold text-white">{weeksScored.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Top score</span>
              <span className="font-bold text-green-400">{fmtPts(topScore)}</span>
            </div>
            {standings[0] && (
              <>
                <div className="border-t border-f1light pt-2" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Leader</span>
                  <span className="font-bold text-f1gold truncate max-w-[110px]">{standings[0].manager}</span>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" />
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
              accentColor="#16a34a"
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
