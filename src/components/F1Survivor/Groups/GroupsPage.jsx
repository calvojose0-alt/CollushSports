import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useF1Game, DEFAULT_GAME_ID } from '@/hooks/useF1Game'
import { createGroup, joinGroupByCode, getGroupsForUser, getPlayers } from '@/services/firebase/firestore'
import { Users, Plus, LogIn, Copy, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function GroupCard({ group, currentUserId, players }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const memberPlayers = players.filter((p) => group.members?.includes(p.userId))
  const sortedMembers = [...memberPlayers].sort((a, b) => (b.points || 0) - (a.points || 0))

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white">{group.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{group.members?.length || 1} member{(group.members?.length || 1) !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-mono bg-f1dark border border-f1light px-2 py-1 rounded-lg">
            {group.inviteCode}
          </span>
          <button
            onClick={handleCopy}
            className="btn-secondary p-2 text-xs"
            title="Copy invite code"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mini leaderboard */}
      {sortedMembers.length > 0 && (
        <div className="bg-f1dark rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-f1light">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Group Standings</p>
          </div>
          <div className="divide-y divide-f1light">
            {sortedMembers.map((player, idx) => (
              <div key={player.id} className={`flex items-center gap-3 px-3 py-2 ${player.userId === currentUserId ? 'bg-f1red/10' : ''}`}>
                <span className="text-xs text-gray-500 w-5">{idx + 1}</span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                    player.status === 'alive' ? 'bg-f1red' : player.status === 'winner' ? 'bg-f1gold' : 'bg-f1light'
                  }`}
                >
                  {player.displayName?.[0]?.toUpperCase()}
                </div>
                <span className={`text-sm flex-1 ${player.userId === currentUserId ? 'text-white font-semibold' : 'text-gray-300'}`}>
                  {player.displayName}
                  {player.userId === currentUserId && <span className="text-xs text-f1red ml-1">(You)</span>}
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-f1gold">{player.points || 0}</span>
                  <span className="text-xs text-gray-500 ml-1">pts</span>
                </div>
                <div className="w-12 text-right">
                  {player.status === 'alive' ? (
                    <span className="text-xs text-green-400">● Alive</span>
                  ) : player.status === 'winner' ? (
                    <span className="text-xs text-f1gold">🏆</span>
                  ) : (
                    <span className="text-xs text-red-400">Out</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Share invite code <strong className="text-gray-400 font-mono">{group.inviteCode}</strong> with friends to add them to this group.
      </p>
    </div>
  )
}

export default function GroupsPage() {
  const { user } = useAuth()
  const { players, gameId } = useF1Game()

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState(null) // 'create' | 'join' | null
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(false)

  const loadGroups = async () => {
    if (!user) return
    const g = await getGroupsForUser(user.uid)
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
      await createGroup({
        name: groupName.trim(),
        createdBy: user.uid,
        gameId,
        inviteCode: generateCode(),
      })
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
          <h2 className="font-bold text-white">Groups</h2>
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
        <div className="card border-f1red/40">
          <h3 className="font-semibold text-white mb-3">Create New Group</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              className="input-field"
              placeholder="Group name (e.g. Office Champions)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={40}
              required
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
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
              type="text"
              className="input-field uppercase tracking-widest font-mono"
              placeholder="Enter 6-digit code (e.g. AB12CD)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
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

      {/* Groups list */}
      {loading ? (
        <div className="card text-center py-10 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-f1red border-t-transparent rounded-full mx-auto mb-2" />
          Loading groups…
        </div>
      ) : groups.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-white mb-1">No groups yet</h3>
          <p className="text-gray-400 text-sm">Create a group or join one with an invite code to compete with friends.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              currentUserId={user.uid}
              players={players}
            />
          ))}
        </div>
      )}
    </div>
  )
}
