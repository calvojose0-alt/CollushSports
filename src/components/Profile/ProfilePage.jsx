import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { User, Pencil, Check, X, ArrowLeft, Trophy, Flag } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()

  const currentName = profile?.display_name || user?.displayName || user?.email || ''

  const [editing, setEditing] = useState(false)
  const [newName, setNewName]   = useState(currentName)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(false)

  const handleEdit = () => {
    setNewName(currentName)
    setError(null)
    setSuccess(false)
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setError('Display name cannot be empty.')
      return
    }
    if (trimmed.length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }
    if (trimmed.length > 30) {
      setError('Display name must be 30 characters or fewer.')
      return
    }
    if (trimmed === currentName) {
      setEditing(false)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateProfile(trimmed)
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update display name. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  // The initials avatar uses the live currentName from context so it updates
  // the moment the save resolves.
  const liveDisplayName = profile?.display_name || user?.displayName || user?.email || ''
  const avatar = liveDisplayName[0]?.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-f1dark pt-8 pb-16 px-4">
      <div className="max-w-lg mx-auto">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Card */}
        <div className="bg-f1gray border border-f1light rounded-2xl overflow-hidden">

          {/* Header band */}
          <div className="bg-gradient-to-r from-f1red/80 to-f1accent/60 px-6 py-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black text-white select-none">
              {avatar}
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-tight">{liveDisplayName}</p>
              <p className="text-white/60 text-sm">{user?.email}</p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">

            {/* Display name section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Display Name
                </label>
                {!editing && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-1 text-xs text-f1accent hover:text-orange-300 transition-colors font-medium"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      maxLength={30}
                      placeholder="Your display name"
                      className="flex-1 bg-f1dark border border-f1light rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-f1accent transition-colors"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="p-2 rounded-lg bg-f1light hover:bg-gray-600 disabled:opacity-50 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    {error ? (
                      <p className="text-xs text-red-400">{error}</p>
                    ) : (
                      <p className="text-xs text-gray-500">Press Enter to save, Esc to cancel</p>
                    )}
                    <p className="text-xs text-gray-500">{newName.length}/30</p>
                  </div>
                </div>
              ) : (
                <p className="text-white font-semibold text-base px-1">{liveDisplayName}</p>
              )}

              {/* Success toast */}
              {success && !editing && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/30 rounded-lg px-3 py-2">
                  <Check className="w-3.5 h-3.5" />
                  Display name updated! Your new name will appear on all leaderboards.
                </div>
              )}
            </div>

            {/* Divider */}
            <hr className="border-f1light" />

            {/* Info note */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Where your name appears</p>
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <div className="w-7 h-7 rounded-lg bg-f1red/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-f1red" />
                </div>
                F1 Survivor — Season Leaderboard &amp; Groups
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-300">
                <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                  <Flag className="w-3.5 h-3.5 text-green-400" />
                </div>
                World Cup 2026 — Standings &amp; Groups
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</p>
              <p className="text-sm text-gray-400 px-1">{user?.email}</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
