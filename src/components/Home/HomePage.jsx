import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Flag,
  Trophy,
  Users,
  Globe,
  ChevronRight,
  Lock,
  Zap,
} from 'lucide-react'

const GAMES = [
  {
    id: 'f1-survivor',
    title: 'Formula 1 Survivor Pool',
    subtitle: '2026 Season',
    description:
      'Pick two drivers each race week — one for the Podium, one for Top 10. Stay alive all season to claim the championship.',
    icon: Flag,
    color: 'from-red-900/60 to-f1red/20',
    borderColor: 'border-f1red/50',
    accentColor: 'text-f1red',
    badgeColor: 'bg-f1red',
    status: 'live',
    path: '/f1-survivor',
    features: ['Survivor Rules', '22 Races', 'Driver Constraints', 'Leaderboard'],
  },
  {
    id: 'world-cup-quiniela',
    title: '2026 World Cup Quiniela',
    subtitle: 'FIFA World Cup 2026',
    description:
      'Predict group stage and knockout results in the classic Quiniela format for the USA–Canada–Mexico World Cup.',
    icon: Globe,
    color: 'from-yellow-900/40 to-yellow-800/10',
    borderColor: 'border-yellow-700/30',
    accentColor: 'text-yellow-400',
    badgeColor: 'bg-yellow-600',
    status: 'coming-soon',
    path: null,
    features: ['48 Group Games', 'Knockout Bracket', 'Bonus Points', '2026 Only'],
  },
  {
    id: 'nfl-win-league',
    title: 'NFL Win-League',
    subtitle: '2025–26 Season',
    description:
      'Predict match winners every week and accumulate points. The player with the most correct picks at season end wins.',
    icon: Zap,
    color: 'from-green-900/40 to-green-800/10',
    borderColor: 'border-green-700/30',
    accentColor: 'text-green-400',
    badgeColor: 'bg-green-600',
    status: 'coming-soon',
    path: null,
    features: ['All 18 Weeks', 'Points System', 'Weekly Rankings', 'Groups'],
  },
  {
    id: 'nfl-survivor',
    title: 'NFL Survivor Pool',
    subtitle: '2025–26 Season',
    description:
      "Pick one NFL team to win each week. Lose once and you're out. Classic survivor format across the full NFL season.",
    icon: Trophy,
    color: 'from-blue-900/40 to-blue-800/10',
    borderColor: 'border-blue-700/30',
    accentColor: 'text-blue-400',
    badgeColor: 'bg-blue-600',
    status: 'coming-soon',
    path: null,
    features: ['Weekly Picks', '18 Weeks', 'One Life', 'Tiebreakers'],
  },
]

function GameCard({ game, onClick }) {
  const Icon = game.icon
  const isLive = game.status === 'live'

  return (
    <button
      onClick={onClick}
      disabled={!isLive}
      className={`
        relative w-full text-left rounded-2xl border p-6 transition-all duration-300
        ${game.borderColor}
        bg-gradient-to-br ${game.color}
        ${isLive
          ? 'hover:scale-[1.02] hover:shadow-2xl cursor-pointer group'
          : 'opacity-60 cursor-not-allowed'
        }
      `}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-900/80 text-green-300 border border-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-green" />
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700">
            <Lock className="w-3 h-3" />
            COMING SOON
          </span>
        )}
      </div>

      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${game.badgeColor} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-0.5">{game.title}</h3>
      <p className={`text-xs font-semibold ${game.accentColor} mb-3 tracking-wide`}>
        {game.subtitle}
      </p>

      {/* Description */}
      <p className="text-sm text-gray-400 leading-relaxed mb-4">{game.description}</p>

      {/* Features */}
      <div className="flex flex-wrap gap-2 mb-4">
        {game.features.map((f) => (
          <span
            key={f}
            className="text-xs bg-black/30 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full"
          >
            {f}
          </span>
        ))}
      </div>

      {/* CTA */}
      {isLive && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${game.accentColor} group-hover:gap-2 transition-all`}>
          Play Now <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </button>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-f1dark">
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-block mb-3">
          <span className="text-xs font-bold tracking-widest text-f1accent bg-f1accent/10 border border-f1accent/30 px-3 py-1 rounded-full uppercase">
            Season 2026
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
          Choose Your <span className="text-f1accent">Arena</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Compete with friends across the world's biggest sporting events. Pick your game and prove you know sports better than anyone.
        </p>
        {!user && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button onClick={() => navigate('/register')} className="btn-primary px-6 py-2.5">
              Get Started — It's Free
            </button>
            <button onClick={() => navigate('/login')} className="btn-secondary px-6 py-2.5">
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onClick={() => {
              if (!game.path) return
              if (!user) { navigate('/login'); return }
              navigate(game.path)
            }}
          />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-600 mt-10">
        Collush Sports is a fan-made competition platform. Not affiliated with F1, NFL, or FIFA.
      </p>
    </div>
    </div>
  )
}
