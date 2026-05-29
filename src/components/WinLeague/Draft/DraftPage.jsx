import { useState } from 'react'
import { useWinLeague } from '@/hooks/useWinLeague'
import { useAuth } from '@/hooks/useAuth'
import { Users, Globe, Clock, CheckCircle2, AlertCircle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import CountryFlag from '@/components/shared/CountryFlag'
import { WC_TEAMS } from '@/data/wc2026Teams'

// Tier names for the draft board grouping
const TIER_LABELS = {
  1: 'Tier 1 — Favorites',
  2: 'Tier 2 — Contenders',
  3: 'Tier 3 — Dark Horses',
  4: 'Tier 4 — Capable',
  5: 'Tier 5 — Underdogs',
  6: 'Tier 6 — Long Shots',
}

function getTier(rank) {
  if (rank <= 8)  return 1
  if (rank <= 16) return 2
  if (rank <= 24) return 3
  if (rank <= 32) return 4
  if (rank <= 40) return 5
  return 6
}

// Player avatar initials
function Avatar({ name, size = 'sm', color = 'bg-emerald-700' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

// Pick order track showing all 30 picks
function DraftOrderTrack({ session, players, picks }) {
  const [expanded, setExpanded] = useState(false)
  if (!session?.draftOrder?.length) return null

  const order      = session.draftOrder
  const currentIdx = session.currentPick ?? 0
  const showCount  = expanded ? order.length : Math.min(order.length, 15)
  const playerById = {}
  for (const p of players) playerById[p.userId] = p

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-f1light flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="font-bold text-white text-sm">Draft Order</span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
        >
          {expanded ? 'Collapse' : 'See all'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      <div className="px-4 py-3 flex flex-wrap gap-2">
        {order.slice(0, showCount).map((uid, idx) => {
          const p       = playerById[uid]
          const isPast  = idx < currentIdx
          const isCur   = idx === currentIdx
          const teamPick = picks.find((pk) => pk.userId === uid && pk.pickNumber === idx)
          const pickedTeam = teamPick ? WC_TEAMS[teamPick.teamId] : null

          return (
            <div
              key={idx}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 border transition-all ${
                isCur  ? 'border-emerald-500 bg-emerald-900/40 ring-1 ring-emerald-400' :
                isPast ? 'border-f1light bg-f1dark opacity-50' :
                         'border-f1light bg-f1dark'
              }`}
              style={{ minWidth: 56 }}
            >
              <span className="text-[10px] text-gray-500">#{idx + 1}</span>
              {isPast && pickedTeam ? (
                <span className="text-sm">{pickedTeam.flag}</span>
              ) : (
                <Avatar name={p?.displayName} size="sm" color={isCur ? 'bg-emerald-600' : 'bg-f1light'} />
              )}
              <span className={`text-[10px] font-semibold truncate max-w-[52px] ${isCur ? 'text-emerald-300' : 'text-gray-400'}`}>
                {p?.displayName?.split(' ')[0] || '—'}
              </span>
            </div>
          )
        })}
        {!expanded && order.length > 15 && (
          <div className="flex items-center px-2 text-xs text-gray-500">+{order.length - 15} more</div>
        )}
      </div>
    </div>
  )
}

// Roster card for one player
function RosterCard({ player, picks, isMe }) {
  return (
    <div className={`rounded-xl border p-3 ${isMe ? 'border-emerald-600 bg-emerald-900/20' : 'border-f1light bg-f1dark'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Avatar name={player.displayName} color={isMe ? 'bg-emerald-700' : 'bg-f1light'} />
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{player.displayName}</p>
          {isMe && <p className="text-[10px] text-emerald-400">You</p>}
        </div>
      </div>
      <div className="space-y-1">
        {picks.length === 0 && (
          <p className="text-[10px] text-gray-600 italic">No picks yet</p>
        )}
        {picks.map((pick) => {
          const team = WC_TEAMS[pick.teamId]
          if (!team) return null
          return (
            <div key={pick.teamId} className="flex items-center gap-1.5">
              <span className="text-sm leading-none">{team.flag}</span>
              <span className="text-xs text-gray-300 font-medium truncate">{team.shortName}</span>
            </div>
          )
        })}
        {picks.length < 3 && picks.length > 0 && (
          Array.from({ length: 3 - picks.length }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border border-dashed border-gray-700 flex-shrink-0" />
              <span className="text-[10px] text-gray-600 italic">Pending…</span>
            </div>
          ))
        )}
        {picks.length === 0 && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded border border-dashed border-gray-700 flex-shrink-0" />
              <span className="text-[10px] text-gray-600 italic">—</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function DraftPage() {
  const { user } = useAuth()
  const {
    session, players, myPlayer, rankedTeams, picks, rosterByUserId,
    isMyTurn, currentDrafter, currentPickIndex, draftedTeams,
    draftComplete, draftInProgress, draftOpen,
    joinGame, draftTeam,
  } = useWinLeague()

  const [search,    setSearch]    = useState('')
  const [joining,   setJoining]   = useState(false)
  const [joinError, setJoinError] = useState(null)
  const [picking,   setPicking]   = useState(null)
  const [pickError, setPickError] = useState(null)

  const handleJoin = async () => {
    setJoining(true)
    setJoinError(null)
    try { await joinGame() }
    catch (err) { setJoinError(err.message) }
    finally { setJoining(false) }
  }

  const handleDraft = async (teamId) => {
    if (!isMyTurn) return
    setPicking(teamId)
    setPickError(null)
    try { await draftTeam(teamId) }
    catch (err) { setPickError(err.message); setTimeout(() => setPickError(null), 4000) }
    finally { setPicking(null) }
  }

  const myPicks     = picks.filter((p) => p.userId === user?.uid)
  const picksLeft   = (session?.picksPerPlayer ?? 3) - myPicks.length
  const totalPicks  = session?.draftOrder?.length ?? 0
  const progress    = totalPicks > 0 ? (currentPickIndex / totalPicks) * 100 : 0

  // Filter and group teams for the board
  const filtered = rankedTeams.filter((t) =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.shortName?.toLowerCase().includes(search.toLowerCase())
  )

  // Group by tier
  const tiers = {}
  for (const team of filtered) {
    const tier = getTier(team.rank)
    if (!tiers[tier]) tiers[tier] = []
    tiers[tier].push(team)
  }

  const status = session?.status ?? 'setup'

  // ── Setup / Waiting state ──────────────────────────────────────────────────
  if (status === 'setup') {
    return (
      <div className="space-y-4">
        <div className="card text-center py-14 space-y-3">
          <Globe className="w-12 h-12 text-gray-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">Draft Not Open Yet</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            The admin is setting up the 2026 Soccer Win League. Check back soon — you'll be able to join once registration opens.
          </p>
        </div>
      </div>
    )
  }

  // ── Open for registration ──────────────────────────────────────────────────
  if (status === 'open') {
    return (
      <div className="space-y-5">
        {/* Join card */}
        <div className="card border-emerald-700/40 bg-gradient-to-br from-emerald-900/30 to-emerald-800/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">2026 Soccer Win League</h2>
              <p className="text-emerald-400 text-xs font-semibold">Registration Open</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm mb-4 leading-relaxed">
            Draft 3 national teams. Earn points as your teams win matches and advance through the tournament. The player with the most points when the final whistle blows is the Win League Champion!
          </p>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-f1dark rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(players.length / (session?.maxPlayers ?? 10)) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{players.length} / {session?.maxPlayers ?? 10}</span>
          </div>

          {joinError && (
            <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 mb-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {joinError}
            </div>
          )}

          {!myPlayer ? (
            <button
              onClick={handleJoin}
              disabled={joining || players.length >= (session?.maxPlayers ?? 10)}
              className="btn-primary w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              {joining ? 'Joining…' : 'Join Win League'}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-700 rounded-lg px-3 py-2.5 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> You're registered! Draft starts soon.
            </div>
          )}
        </div>

        {/* Registered players */}
        {players.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-f1light">
              <p className="text-sm font-bold text-white">Registered Players ({players.length})</p>
            </div>
            <div className="divide-y divide-f1light">
              {players.map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex items-center gap-3">
                  <Avatar name={p.displayName} />
                  <span className="text-sm text-gray-200">{p.displayName}</span>
                  {p.userId === user?.uid && (
                    <span className="ml-auto text-xs text-emerald-400 font-semibold">You</span>
                  )}
                </div>
              ))}
              {players.length < (session?.maxPlayers ?? 10) && (
                Array.from({ length: (session?.maxPlayers ?? 10) - players.length }).map((_, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3 opacity-30">
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-600 flex-shrink-0" />
                    <span className="text-xs text-gray-600 italic">Open slot</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Draft in progress ──────────────────────────────────────────────────────
  if (status === 'drafting') {
    return (
      <div className="space-y-5">

        {/* On the clock banner */}
        {isMyTurn && (
          <div className="bg-emerald-900/50 border-2 border-emerald-500 rounded-2xl px-5 py-4 flex items-center gap-3 animate-pulse">
            <Globe className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-emerald-300 font-black text-base">It's your pick!</p>
              <p className="text-emerald-400 text-xs">Pick {currentPickIndex + 1} of {totalPicks} — choose a team below</p>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="card py-3">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
            <span>Pick {Math.min(currentPickIndex + 1, totalPicks)} of {totalPicks}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="w-full bg-f1dark rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Draft order track */}
        <DraftOrderTrack session={session} players={players} picks={picks} />

        {/* Pick error */}
        {pickError && (
          <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {pickError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Draft board */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-white">Draft Board</h2>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search teams…"
                  className="w-full bg-f1dark border border-f1light rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {Object.entries(tiers).map(([tier, teams]) => (
              <div key={tier}>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {TIER_LABELS[tier]}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {teams.map((team) => {
                    const isDrafted   = team.drafted
                    const draftedByMe = team.draftedBy?.userId === user?.uid
                    const canPick     = isMyTurn && !isDrafted && picksLeft > 0
                    const isPickingThis = picking === team.id

                    return (
                      <button
                        key={team.id}
                        disabled={isDrafted || !isMyTurn || isPickingThis}
                        onClick={() => canPick && handleDraft(team.id)}
                        className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                          isDrafted
                            ? 'border-f1light bg-f1dark opacity-40 cursor-not-allowed'
                            : canPick
                            ? 'border-emerald-600/60 bg-emerald-900/20 hover:border-emerald-400 hover:bg-emerald-900/40 cursor-pointer'
                            : 'border-f1light bg-f1dark'
                        } ${draftedByMe ? 'ring-1 ring-emerald-500 opacity-70' : ''}`}
                      >
                        {/* Rank badge */}
                        <span className="absolute top-1 right-1.5 text-[9px] text-gray-600">#{team.rank}</span>

                        <span className="text-xl leading-none flex-shrink-0">
                          {isPickingThis ? (
                            <span className="inline-block w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            team.flag || '🏳️'
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isDrafted ? 'text-gray-600 line-through' : 'text-white'}`}>
                            {team.shortName}
                          </p>
                          <p className={`text-[10px] truncate ${isDrafted ? 'text-gray-600' : 'text-gray-400'}`}>
                            {team.name}
                          </p>
                        </div>
                        {isDrafted && !draftedByMe && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                            TAKEN
                          </span>
                        )}
                        {draftedByMe && (
                          <CheckCircle2 className="absolute top-1 left-1 w-3 h-3 text-emerald-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Rosters panel */}
          <div className="lg:w-56 flex-shrink-0">
            <h3 className="font-bold text-white text-sm mb-3">Rosters</h3>
            <div className="space-y-2">
              {players.map((p) => (
                <RosterCard
                  key={p.id}
                  player={p}
                  picks={(rosterByUserId[p.userId] || []).sort((a, b) => a.pickNumber - b.pickNumber)}
                  isMe={p.userId === user?.uid}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Draft locked / active / complete ──────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="card border-emerald-700/30 bg-gradient-to-br from-emerald-900/20 to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="font-bold text-white">Draft Complete</h2>
            <p className="text-xs text-emerald-400">All teams have been drafted — tournament scoring is live</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          Check the <strong className="text-white">Leaderboard</strong> for live standings and <strong className="text-white">My Teams</strong> to track your teams' performance.
        </p>
      </div>

      {/* Final rosters */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-f1light">
          <p className="text-sm font-bold text-white">Final Rosters</p>
        </div>
        <div className="divide-y divide-f1light">
          {players.map((p) => {
            const pPicks = (rosterByUserId[p.userId] || []).sort((a, b) => a.pickNumber - b.pickNumber)
            return (
              <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                <Avatar name={p.displayName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.displayName}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {pPicks.map((pick) => {
                      const team = WC_TEAMS[pick.teamId]
                      return team ? (
                        <span key={pick.teamId} className="text-xs text-gray-300">
                          {team.flag} {team.shortName}
                        </span>
                      ) : null
                    })}
                    {pPicks.length === 0 && <span className="text-xs text-gray-600 italic">No picks</span>}
                  </div>
                </div>
                {p.userId === user?.uid && (
                  <span className="text-xs text-emerald-400 font-semibold flex-shrink-0">You</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
