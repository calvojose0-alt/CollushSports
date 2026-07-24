import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Shield, Users, ListChecks, Trophy, Settings, ChevronLeft } from 'lucide-react'
import { useNflLeague } from '@/hooks/useNflLeague'

export function formatMoney(amount) {
  if (amount == null) return '$0'
  const millions = amount / 1000000
  const sign = millions < 0 ? '-' : ''
  return `${sign}$${Math.abs(millions).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
}

export default function NflManagerLayout() {
  const { leagueId } = useParams()
  const navigate = useNavigate()
  const nflLeague = useNflLeague(leagueId)
  const { league, myMember, isCommissioner, loading, error } = nflLeague

  const NAV = [
    { to: `/nfl-manager/${leagueId}`, label: 'My Team', icon: Users, exact: true },
    { to: `/nfl-manager/${leagueId}/lineup`, label: 'Lineup', icon: ListChecks },
    { to: `/nfl-manager/${leagueId}/standings`, label: 'Standings', icon: Trophy },
    { to: `/nfl-manager/${leagueId}/commissioner`, label: 'Commissioner', icon: Settings, commissionerOnly: true },
  ].filter((item) => !item.commissionerOnly || isCommissioner)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !league) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="card text-center py-10">
          <p className="text-red-300 font-bold mb-2">Couldn't load this league</p>
          <p className="text-gray-400 text-sm mb-4">{error || 'League not found.'}</p>
          <button className="btn-secondary" onClick={() => navigate('/nfl-manager')}>Back to Leagues</button>
        </div>
      </div>
    )
  }

  if (!myMember) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="card text-center py-10 space-y-3">
          <Shield className="w-10 h-10 text-gray-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">You haven't joined {league.name}</h2>
          <p className="text-gray-400 text-sm">Join this league from the hub to build your roster.</p>
          <button className="btn-primary" onClick={() => navigate('/nfl-manager')}>Back to Leagues</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back + Title bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/nfl-manager')}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Leagues
        </button>
        <span className="text-gray-600">/</span>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">{league.name}</span>
        </div>
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
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
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

          <div className="mt-6 card text-sm space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{league.seasonYear} Season</p>
            <div className="flex justify-between">
              <span className="text-gray-400">Team</span>
              <span className="font-bold text-white truncate max-w-[7rem]" title={myMember.teamName}>{myMember.teamName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Balance</span>
              <span className={`font-bold ${myMember.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>{formatMoney(myMember.balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Season Pts</span>
              <span className="font-bold text-blue-400">{myMember.seasonPoints.toFixed(1)}</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <Outlet context={nflLeague} />
        </main>
      </div>
    </div>
  )
}
