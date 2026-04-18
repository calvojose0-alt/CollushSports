import { useState, useEffect } from 'react'
import { Shield, RefreshCw, Users, Flag, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import { getAllUsersActivity } from '@/services/adminService'

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

      {/* Last-login note */}
      <p className="text-xs text-gray-600 text-center">
        "Last Login" requires a one-time SQL migration in Supabase:&nbsp;
        <code className="font-mono bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
          ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
        </code>
      </p>
    </div>
  )
}
