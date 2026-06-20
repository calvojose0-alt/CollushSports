import { useState, useMemo } from 'react'
import { LockOpen, Lock, Loader, AlertCircle, Search } from 'lucide-react'
import { useWCGameContext as useWCGame } from '@/contexts/WCGameContext'
import { updateWCPlayer } from '@/services/firebase/wc2026Service'

// Admin-only: unlock the Knockout Bracket for specific player entries so they can
// edit their picks again. Unlocked users can only change matches that haven't
// kicked off yet (past matches stay locked — no points awarded for them).
export default function UnlockBracketsAdmin({ onRefresh }) {
  const { players = [] } = useWCGame()
  const [local, setLocal] = useState({})   // optimistic { playerId: bool }
  const [busy, setBusy]   = useState(null)  // playerId being saved
  const [err, setErr]     = useState(null)
  const [q, setQ]         = useState('')

  const isUnlocked = (p) => (local[p.id] !== undefined ? local[p.id] : !!p.bracketUnlocked)

  const sorted = useMemo(() => {
    const list = [...players].sort(
      (a, b) =>
        (a.displayName || '').localeCompare(b.displayName || '') ||
        (a.entryNumber ?? 1) - (b.entryNumber ?? 1)
    )
    if (!q.trim()) return list
    const term = q.trim().toLowerCase()
    return list.filter(
      (p) => (p.displayName || '').toLowerCase().includes(term) || (p.entryName || '').toLowerCase().includes(term)
    )
  }, [players, q])

  const unlockedCount = players.filter(isUnlocked).length

  const toggle = async (p) => {
    const next = !isUnlocked(p)
    setBusy(p.id)
    setErr(null)
    try {
      await updateWCPlayer(p.userId, { bracketUnlocked: next }, p.entryNumber ?? 1)
      setLocal((m) => ({ ...m, [p.id]: next }))
    } catch (e) {
      setErr(e.message || 'Failed to update')
    } finally {
      setBusy(null)
    }
  }

  const lockAll = async () => {
    const open = players.filter(isUnlocked)
    if (!open.length || !window.confirm(`Re-lock all ${open.length} unlocked bracket(s)?`)) return
    setBusy('__all__')
    setErr(null)
    try {
      for (const p of open) {
        await updateWCPlayer(p.userId, { bracketUnlocked: false }, p.entryNumber ?? 1)
        setLocal((m) => ({ ...m, [p.id]: false }))
      }
    } catch (e) {
      setErr(e.message || 'Failed to update')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card bg-gray-900 border-yellow-700/50">
        <div className="flex items-center gap-2 mb-1">
          <LockOpen className="w-4 h-4 text-yellow-400" />
          <p className="text-sm font-semibold text-white">Bracket Access</p>
        </div>
        <p className="text-xs text-gray-400">
          Unlock the <strong className="text-gray-300">Knockout Bracket</strong> for specific entries so they can edit their picks.
          Unlocked users can only change matches that <strong className="text-gray-300">haven't kicked off yet</strong>; past matches stay locked.
          Group-stage picks are not affected. Re-lock when they're done.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players…"
            className="input-field text-sm w-full pl-8"
          />
        </div>
        <span className="text-xs text-gray-400">
          {unlockedCount} unlocked
        </span>
        {unlockedCount > 0 && (
          <button
            onClick={lockAll}
            disabled={busy === '__all__'}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy === '__all__' ? <Loader className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
            Lock all
          </button>
        )}
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-red-900/30 border border-red-700 text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {err}
        </div>
      )}

      <div className="bg-f1dark rounded-xl divide-y divide-f1light overflow-hidden">
        {sorted.map((p) => {
          const open = isUnlocked(p)
          return (
            <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 ${open ? 'bg-yellow-900/10' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-yellow-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {p.displayName?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">
                  {p.displayName} <span className="text-gray-500">— {p.entryName}</span>
                </p>
                <p className={`text-[11px] ${open ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {open ? '🔓 Unlocked — can edit upcoming matches' : '🔒 Locked'}
                </p>
              </div>
              <button
                onClick={() => toggle(p)}
                disabled={busy === p.id || busy === '__all__'}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 flex-shrink-0 ${
                  open
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                }`}
              >
                {busy === p.id
                  ? <Loader className="w-3 h-3 animate-spin" />
                  : open ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                {open ? 'Lock' : 'Unlock'}
              </button>
            </div>
          )
        })}
        {sorted.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-gray-500">No players match “{q}”.</div>
        )}
      </div>
    </div>
  )
}
