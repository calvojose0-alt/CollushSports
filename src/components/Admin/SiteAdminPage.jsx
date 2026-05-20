import { useState, useEffect } from 'react'
import { Shield, RefreshCw, Users, Flag, Globe, CheckCircle2, AlertCircle, MessageSquare, Mail, Eye, EyeOff } from 'lucide-react'
import { getAllUsersActivity, getSupportMessages, markSupportMessageRead } from '@/services/adminService'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtRelative(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 2)   return 'Just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 7)   return `${days}d ago`
  return fmt(dateStr)
}

function Avatar({ name }) {
  const letter = name?.[0]?.toUpperCase() || '?'
  return (
    <div className="w-8 h-8 rounded-full bg-f1red flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {letter}
    </div>
  )
}

function Badge({ children, color = 'gray' }) {
  const colors = {
    green:  'bg-green-900/40 text-green-300 border-green-700/50',
    blue:   'bg-blue-900/40  text-blue-300  border-blue-700/50',
    yellow: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    gray:   'bg-gray-800 text-gray-400 border-gray-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  )
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SupportMessagesPanel() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

  const loadMessages = async () => {
    setLoading(true)
    try {
      const data = await getSupportMessages()
      setMessages(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMessages() }, [])

  const toggleRead = async (msg) => {
    await markSupportMessageRead(msg.id, !msg.is_read)
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: !m.is_read } : m))
  }

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-white">Support Messages</h2>
          {unreadCount > 0 && (
            <span className="bg-f1red text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} new</span>
          )}
        </div>
        <button onClick={loadMessages} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-f1gray border border-f1light text-gray-300 hover:text-white text-sm transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-400 py-10">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">No support messages yet.</div>
        ) : (
          <div className="divide-y divide-f1light">
            {messages.map(msg => (
              <div key={msg.id} className={`p-4 space-y-2 ${!msg.is_read ? 'bg-blue-900/10' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {(msg.name || msg.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{msg.name || 'Anonymous'}</p>
                      {msg.email && (
                        <a href={`mailto:${msg.email}`} className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                          <Mail className="w-3 h-3" /> {msg.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">{fmtDate(msg.created_at)}</span>
                    {!msg.is_read && <span className="w-2 h-2 bg-blue-400 rounded-full" />}
                    <button
                      onClick={() => toggleRead(msg)}
                      title={msg.is_read ? 'Mark unread' : 'Mark read'}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      {msg.is_read ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p
                  className="text-sm text-gray-300 cursor-pointer"
                  onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                >
                  {expanded === msg.id ? msg.message : (msg.message.length > 120 ? msg.message.slice(0, 120) + '…' : msg.message)}
                </p>
                {msg.message.length > 120 && (
                  <button onClick={() => setExpanded(expanded === msg.id ? null : msg.id)} className="text-xs text-blue-400 hover:underline">
                    {expanded === msg.id ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SiteAdminPage() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllUsersActivity()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = users.filter(u =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-f1red" />
          <div>
            <h1 className="font-black text-white text-xl">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">All registered users and their game activity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-f1gray border border-f1light rounded-lg px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-sm text-gray-300 font-semibold">{users.length} users</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-f1gray border border-f1light text-gray-300 hover:text-white hover:bg-f1light text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-f1gray border border-f1light rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Support Messages */}
      <SupportMessagesPanel />

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-f1light bg-f1dark/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Login</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Games</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1"><Flag className="w-3 h-3 text-orange-400" /> F1 Races</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1"><Globe className="w-3 h-3 text-yellow-400" /> WC Group</span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <span className="flex items-center justify-end gap-1"><Globe className="w-3 h-3 text-yellow-400" /> WC Bracket</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-f1light">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading users…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(u => (
                <tr key={u.id} className="hover:bg-f1light/30 transition-colors">
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.displayName} />
                      <div>
                        <p className="font-semibold text-white text-sm leading-tight">{u.displayName}</p>
                        <p className="text-xs text-gray-500 leading-tight">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{fmt(u.joinedAt)}</td>

                  {/* Last Login */}
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {u.lastLoginAt
                      ? <span className="text-gray-300">{fmtRelative(u.lastLoginAt)}</span>
                      : <span className="text-gray-600 italic">Not tracked yet</span>
                    }
                  </td>

                  {/* Games */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {u.playsF1 && <Badge color="green"><Flag className="w-2.5 h-2.5" /> F1</Badge>}
                      {u.playsWC && <Badge color="yellow"><Globe className="w-2.5 h-2.5" /> WC</Badge>}
                      {!u.playsF1 && !u.playsWC && <span className="text-gray-600 text-xs">—</span>}
                    </div>
                  </td>

                  {/* F1 Races */}
                  <td className="px-4 py-3 text-right">
                    {u.playsF1
                      ? <span className="font-semibold text-orange-300">{u.f1RacesPicked}</span>
                      : <span className="text-gray-600">—</span>
                    }
                  </td>

                  {/* WC Group */}
                  <td className="px-4 py-3 text-right">
                    {u.playsWC ? (
                      <span className={`font-semibold ${u.wcGroupPicked >= 72 ? 'text-green-400' : 'text-yellow-300'}`}>
                        {u.wcGroupPicked}<span className="text-gray-500 font-normal">/72</span>
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>

                  {/* WC Bracket */}
                  <td className="px-4 py-3 text-right">
                    {u.playsWC ? (
                      <span className={`font-semibold ${u.wcBracketRounds >= 4 ? 'text-green-400' : 'text-yellow-300'}`}>
                        {u.wcBracketRounds}<span className="text-gray-500 font-normal">/4 rounds</span>
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
