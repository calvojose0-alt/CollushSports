import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Globe, Trophy, Users, Settings, ChevronLeft, Flag, Info, Star } from 'lucide-react'
import { useWCGame } from '@/hooks/useWCGame'
import { useAuth } from '@/hooks/useAuth'
import { isPicksLocked, PICK_LOCK_TIME, SCORING } from '@/data/wc2026Teams'
import { KNOCKOUT_MATCHES } from '@/data/wc2026Schedule'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

const ALL_NAV = [
  { to: '/world-cup',            label: 'Group Stage Picks',    icon: Flag,  exact: true },
  { to: '/world-cup/bracket',    label: 'Knockout Bracket Picks', icon: Globe              },
  { to: '/world-cup/groups',     label: 'My Groups',  icon: Users                },
  { to: '/world-cup/leaderboard',label: 'Leaderboard',icon: Trophy               },
  { to: '/world-cup/scoring',    label: 'Scoring',    icon: Star                 },
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
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user }  = useAuth()
  const onBracket = location.pathname === '/world-cup/bracket'

  const {
    myPlayer,
    leaderboard,
    allPicks,
    completedGroupMatches,
    totalGroupMatches,
    myPlayoffPicksByRound,
    loading,
    error,
  } = useWCGame()

  // Compute My Stats in real-time from allPicks so they always stay in sync
  // with the leaderboard, regardless of whether stored wc_players values are stale.
  const myPicksScored = allPicks.filter((p) => p.userId === user?.uid && p.pointsEarned !== null)
  const myGroupPoints      = myPicksScored.reduce((sum, p) => sum + (p.pointsEarned || 0), 0)
  const myExactHits        = myPicksScored.filter((p) => p.isExact).length
  const myOutcomeHits      = myPicksScored.filter((p) => p.isCorrectOutcome && !p.isExact).length
  const myPlayoffPoints    = myPlayer?.playoffPoints || 0
  const myQualPoints       = myPlayer?.qualificationPoints || 0
  const myTotalPoints      = myGroupPoints + myQualPoints + myPlayoffPoints

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
                  <span className="font-bold text-yellow-400">{myTotalPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Exact Scores</span>
                  <span className="font-bold text-green-400">{myExactHits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Correct Outcomes</span>
                  <span className="font-bold text-blue-400">{myOutcomeHits}</span>
                </div>
                {myPlayoffPoints > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Knockout Pts</span>
                    <span className="font-bold text-yellow-300">+{myPlayoffPoints}</span>
                  </div>
                )}
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

          {/* Bracket info — only shown on Knockout Bracket page */}
          {onBracket && (() => {
            const r16Done  = (myPlayoffPicksByRound?.r16?.teamIds  || []).length
            const qfDone   = (myPlayoffPicksByRound?.qf?.teamIds   || []).length
            const sfDone   = (myPlayoffPicksByRound?.sf?.teamIds   || []).length
            const finDone  = (myPlayoffPicksByRound?.winner?.teamIds || []).length
            const groupsDone = completedGroupMatches < totalGroupMatches

            const rounds = [
              { label: 'R16 picks',  done: r16Done,  total: 16 },
              { label: 'QF picks',   done: qfDone,   total: 8  },
              { label: 'SF picks',   done: sfDone,   total: 4  },
              { label: 'Final pick', done: finDone,  total: 2  },
            ]

            return (
              <>
                {/* Scoring legend + progress */}
                <div className="mt-3 card text-xs space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Knockout Scoring</p>
                  <table className="w-full text-xs mt-1">
                    <tbody className="divide-y divide-gray-800">
                      {[
                        { label: 'Round of 16',    sub: 'R32 qualifiers', pts: SCORING.PLAYOFF_R16  },
                        { label: 'Quarterfinals',  sub: 'R16 qualifiers', pts: SCORING.PLAYOFF_QF   },
                        { label: 'Semifinals',     sub: 'QF qualifiers',  pts: SCORING.PLAYOFF_SF   },
                        { label: 'Champion',       sub: null,             pts: SCORING.PLAYOFF_WINNER},
                      ].map(({ label, sub, pts }) => (
                        <tr key={label}>
                          <td className="py-1 pr-2 text-gray-400">
                            {label}
                            {sub && <span className="text-gray-600 ml-1">({sub})</span>}
                          </td>
                          <td className="py-1 text-right font-bold text-yellow-400 whitespace-nowrap">+{pts} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="space-y-1.5 pt-1">
                    {rounds.map(r => {
                      const pct = Math.round((r.done / r.total) * 100)
                      return (
                        <div key={r.label} className="flex items-center gap-2">
                          <span className="text-gray-500 w-16 flex-shrink-0">{r.label}</span>
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-500 w-8 text-right">{r.done}/{r.total}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* R32 auto-fill notice */}
                {groupsDone && (
                  <div className="mt-2 card flex items-start gap-1.5 text-xs text-gray-400">
                    <Info className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span>
                      R32 slots are filled from your{' '}
                      <strong className="text-gray-300">Group Stage Picks</strong>.
                      Complete more group picks to see your R32 matchups.
                    </span>
                  </div>
                )}
              </>
            )
          })()}
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
