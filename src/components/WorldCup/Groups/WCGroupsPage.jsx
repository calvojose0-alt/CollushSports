import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWCGame } from '@/hooks/useWCGame'
import {
  createGroup, joinGroupByCode, getWCGroupsForUser, removeGroupMember,
} from '@/services/firebase/wc2026Service'
import {
  Users, Plus, LogIn, Copy, CheckCircle2, AlertCircle, ChevronDown,
  ChevronUp, Trophy, Calendar, Link2, Settings, Trash2,
} from 'lucide-react'
import { WC_TEAMS } from '@/data/wc2026Teams'
import { GROUP_MATCHES } from '@/data/wc2026Schedule'

const WC_GAME_ID = 'wc2026'

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// ── Next Match Picks section ──────────────────────────────────────────────────
function NextMatchPicks({ memberPlayers, allPicks, resultsByMatchId, currentUserId }) {
  const [open, setOpen] = useState(true)

  const nextMatch = useMemo(() => {
    const sorted = [...GROUP_MATCHES].sort((a, b) => new Date(a.date) - new Date(b.date))
    return sorted.find((m) => resultsByMatchId[m.id]?.status !== 'final') || null
  }, [resultsByMatchId])

  const picksByUser = useMemo(() => {
    if (!nextMatch) return {}
    const map = {}
    allPicks.forEach((p) => { if (p.matchId === nextMatch.id) map[p.userId] = p })
    return map
  }, [nextMatch, allPicks])

  if (!nextMatch) return null

  const homeTeam = WC_TEAMS[nextMatch.homeTeam]
  const awayTeam = WC_TEAMS[nextMatch.awayTeam]
  const matchDate = new Date(nextMatch.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div className="bg-f1dark rounded-xl overflow-hidden border border-f1light">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-green-500" />
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Next Match Picks</p>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {open && (
        <div className="border-t border-f1light">
          <div className="px-3 py-2.5 bg-gray-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{homeTeam?.flag}</span>
              <span className="text-sm font-bold text-white">{homeTeam?.shortName}</span>
              <span className="text-xs text-gray-500 font-semibold mx-1">vs</span>
              <span className="text-sm font-bold text-white">{awayTeam?.shortName}</span>
              <span className="text-lg">{awayTeam?.flag}</span>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-[10px] text-gray-500">{matchDate}</p>
              {nextMatch.time && <p className="text-[10px] text-gray-600">{nextMatch.time}</p>}
            </div>
          </div>
          <div className="divide-y divide-f1light/60">
            {memberPlayers.map((player) => {
              const pick = picksByUser[player.userId]
              const hasPick = pick && pick.homeScore !== null && pick.awayScore !== null
              const isMe = player.userId === currentUserId
              return (
                <div key={player.userId} className={`flex items-center gap-3 px-3 py-2.5 ${isMe ? 'bg-yellow-900/10' : ''}`}>
                  <div className="w-6 h-6 rounded-full bg-yellow-700/60 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {player.displayName?.[0]?.toUpperCase()}
                  </div>
                  <span className={`text-sm flex-1 min-w-0 truncate ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                    {player.displayName}
                    {isMe && <span className="text-xs text-yellow-400 ml-1">(You)</span>}
                  </span>
                  {hasPick ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-lg font-black text-white tabular-nums">{pick.homeScore}</span>
                      <span className="text-gray-500 font-bold text-sm">–</span>
                      <span className="text-lg font-black text-white tabular-nums">{pick.awayScore}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600 italic flex-shrink-0">No pick yet</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Group viewer (detail + management) ───────────────────────────────────────
function GroupViewer({ groups, currentUserId, players, allPicks, resultsByMatchId, onGroupsChanged }) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '')
  const [copied, setCopied] = useState(null) // 'code' | 'link' | null
  const [managing, setManaging] = useState(false)
  const [removing, setRemoving] = useState(null)

  const group = groups.find((g) => g.id === selectedGroupId) || groups[0]
  if (!group) return null

  const isCreator = group.createdBy === currentUserId
  const memberPlayers = players.filter((p) => group.members?.includes(p.userId))
  const sorted = [...memberPlayers].sort(
    (a, b) => (b.totalPoints || 0) - (a.totalPoints || 0) || (b.exactHits || 0) - (a.exactHits || 0)
  )

  const inviteLink = `${window.location.origin}/join/${group.inviteCode}`

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied('code')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied('link')
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from the group?')) return
    setRemoving(userId)
    try {
      await removeGroupMember(group.id, userId)
      await onGroupsChanged()
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="card space-y-4">
      {/* Group selector + invite actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <select
            value={selectedGroupId}
            onChange={(e) => { setSelectedGroupId(e.target.value); setCopied(null); setManaging(false) }}
            className="w-full appearance-none bg-f1dark border border-f1light rounded-xl px-4 py-2.5 pr-9 text-white font-bold text-base focus:outline-none focus:border-yellow-500 cursor-pointer"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 font-mono bg-f1dark border border-f1light px-2 py-1 rounded-lg">
            {group.inviteCode}
          </span>
          <button onClick={handleCopyCode} className="btn-secondary p-2 text-xs" title="Copy invite code">
            {copied === 'code' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={handleCopyLink} className="btn-secondary p-2 text-xs" title="Copy invite link">
            {copied === 'link' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
          </button>
          {isCreator && (
            <button
              onClick={() => setManaging((v) => !v)}
              className={`p-2 rounded-lg border text-xs transition-colors ${managing ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' : 'btn-secondary'}`}
              title="Manage group"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {copied === 'link' && (
        <p className="text-xs text-green-400 -mt-2">✓ Invite link copied! Share it with friends.</p>
      )}

      <p className="text-xs text-gray-400 -mt-2">
        {group.members?.length || 1} member{(group.members?.length || 1) !== 1 ? 's' : ''}
        {isCreator && <span className="text-gray-600 ml-1">(you created this group)</span>}
      </p>

      {/* Manage panel — creator only */}
      {isCreator && managing && (
        <div className="bg-f1dark rounded-xl overflow-hidden border border-yellow-700/30">
          <div className="px-3 py-2 border-b border-f1light flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-yellow-400" />
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Manage Members</p>
          </div>
          <div className="divide-y divide-f1light">
            {(group.members || []).map((uid) => {
              const player = players.find((p) => p.userId === uid)
              const displayName = player?.displayName || uid.slice(0, 8) + '…'
              const isMe = uid === currentUserId
              return (
                <div key={uid} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {displayName[0]?.toUpperCase()}
                  </div>
                  <span className={`text-sm flex-1 ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                    {displayName}
                    {isMe && <span className="text-xs text-yellow-400 ml-1">(You · Creator)</span>}
                  </span>
                  {!isMe && (
                    <button
                      onClick={() => handleRemove(uid)}
                      disabled={removing === uid}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-700/50 text-red-400 hover:bg-red-900/30 text-xs transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {removing === uid ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Next Match Picks */}
      <NextMatchPicks
        memberPlayers={memberPlayers}
        allPicks={allPicks}
        resultsByMatchId={resultsByMatchId}
        currentUserId={currentUserId}
      />

      {/* Group leaderboard */}
      {sorted.length > 0 ? (
        <div className="bg-f1dark rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-f1light flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Group Leaderboard</p>
          </div>
          <div className="divide-y divide-f1light">
            {sorted.map((player, idx) => (
              <div
                key={player.id || player.userId}
                className={`flex items-center gap-3 px-3 py-2.5 ${player.userId === currentUserId ? 'bg-yellow-900/10' : ''}`}
              >
                <span className="text-xs text-gray-500 w-5 text-center font-semibold">{idx + 1}</span>
                <div className="w-7 h-7 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {player.displayName?.[0]?.toUpperCase()}
                </div>
                <span className={`text-sm flex-1 ${player.userId === currentUserId ? 'text-white font-semibold' : 'text-gray-300'}`}>
                  {player.displayName}
                  {player.userId === currentUserId && <span className="text-xs text-yellow-400 ml-1">(You)</span>}
                </span>
                <div className="text-right">
                  <div className="text-sm font-bold text-yellow-400">{player.totalPoints || 0}</div>
                  <div className="text-xs text-gray-600">{player.exactHits || 0} exact</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No players have joined the game yet or no picks scored.
        </p>
      )}

      <p className="text-xs text-gray-500">
        Share invite code <strong className="text-gray-400 font-mono">{group.inviteCode}</strong> or copy the invite link to add friends.
      </p>
    </div>
  )
}

// ── Groups summary (top card) ─────────────────────────────────────────────────
function MySummary({ groups, currentUserId, players }) {
  if (!groups.length) return null
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-400" />
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Groups I've Joined</p>
      </div>
      <div className="divide-y divide-f1light">
        {groups.map((group) => {
          const memberPlayers = players.filter((p) => group.members?.includes(p.userId))
          const sorted = [...memberPlayers].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
          const myRank = sorted.findIndex((p) => p.userId === currentUserId) + 1
          const me = sorted.find((p) => p.userId === currentUserId)
          return (
            <div key={group.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{group.name}</p>
                <p className="text-xs text-gray-500">{group.members?.length || 1} members</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {myRank > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Rank</p>
                    <p className="text-sm font-black text-white">#{myRank}</p>
                  </div>
                )}
                {me && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Pts</p>
                    <p className="text-sm font-black text-yellow-400">{me.totalPoints || 0}</p>
                  </div>
                )}
                <span className="text-xs font-mono text-gray-500 bg-f1dark border border-f1light px-2 py-1 rounded-lg">
                  {group.inviteCode}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WCGroupsPage() {
  const { user } = useAuth()
  const { players, allPicks, resultsByMatchId } = useWCGame()

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(false)

  const loadGroups = async () => {
    if (!user) return
    const g = await getWCGroupsForUser(user.uid)
    setGroups(g)
    setLoading(false)
  }

  useEffect(() => { loadGroups() }, [user])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return
    setWorking(true)
    setError(null)
    try {
      await createGroup({ name: groupName.trim(), createdBy: user.uid, gameId: WC_GAME_ID, inviteCode: generateCode() })
      setGroupName('')
      setMode(null)
      await loadGroups()
    } catch (err) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setWorking(true)
    setError(null)
    try {
      await joinGroupByCode(inviteCode.trim().toUpperCase(), user.uid)
      setInviteCode('')
      setMode(null)
      await loadGroups()
    } catch (err) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-blue-800">Groups</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setMode(mode === 'create' ? null : 'create'); setError(null) }}
            className="btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
          <button
            onClick={() => { setMode(mode === 'join' ? null : 'join'); setError(null) }}
            className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"
          >
            <LogIn className="w-4 h-4" /> Join
          </button>
        </div>
      </div>

      {/* Create form */}
      {mode === 'create' && (
        <div className="card border-yellow-700/40">
          <h3 className="font-semibold text-white mb-3">Create New Group</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text" className="input-field"
              placeholder="Group name (e.g. Office Champions)"
              value={groupName} onChange={(e) => setGroupName(e.target.value)}
              maxLength={40} required autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={working}>
                {working ? 'Creating…' : 'Create Group'}
              </button>
              <button type="button" className="btn-secondary px-4" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <div className="card border-blue-700/40">
          <h3 className="font-semibold text-white mb-3">Join a Group</h3>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text" className="input-field uppercase tracking-widest font-mono"
              placeholder="Enter 6-digit code (e.g. AB12CD)"
              value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6} required autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1" disabled={working}>
                {working ? 'Joining…' : 'Join Group'}
              </button>
              <button type="button" className="btn-secondary px-4" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Groups viewer */}
      {loading ? (
        <div className="card text-center py-10 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading groups…
        </div>
      ) : groups.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">No groups yet</h3>
          <p className="text-gray-400 text-sm">Create a group or join one with an invite code to compete with friends.</p>
        </div>
      ) : (
        <>
          <MySummary groups={groups} currentUserId={user.uid} players={players} />
          <GroupViewer
            groups={groups}
            currentUserId={user.uid}
            players={players}
            allPicks={allPicks}
            resultsByMatchId={resultsByMatchId}
            onGroupsChanged={loadGroups}
          />
        </>
      )}
    </div>
  )
}
