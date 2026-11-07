import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { updatePassword } from '@/services/firebase/auth'
import { supabase } from '@/supabase'
import { Flag, AlertCircle, Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()

  const [form, setForm]         = useState({ password: '', confirm: '' })
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState(null)
  const [ready, setReady]       = useState(false)  // true once recovery session confirmed

  // Supabase fires PASSWORD_RECOVERY when a valid recovery token is in the URL.
  // We wait for that event before showing the form; without it the updateUser call
  // would fail because there's no active recovery session.
  useEffect(() => {
    if (!supabase) {
      // Demo mode — always show the form
      setReady(true)
      return
    }

    // Check if we already have a recovery session (user may have been redirected)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const passwordsMatch = form.password === form.confirm && form.confirm.length > 0
  const passwordStrong = form.password.length >= 6

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!passwordsMatch) { setError('Passwords do not match'); return }
    if (!passwordStrong) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await updatePassword(form.password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen f1-hero-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-f1red rounded-xl flex items-center justify-center">
              <Flag className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-white tracking-tight">COLLUSH</div>
              <div className="text-xs text-f1accent font-semibold tracking-widest -mt-1">SPORTS</div>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Set a new password</p>
        </div>

        <div className="card border-f1light">
          {done ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">Password updated!</h2>
              <p className="text-gray-300 text-sm">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full py-2.5 mt-2"
              >
                Go to Sign In
              </button>
            </div>

          ) : !ready ? (
            /* ── Waiting for recovery session ── */
            <div className="text-center space-y-4 py-6">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-f1red/20 rounded-full flex items-center justify-center">
                  <Lock className="w-7 h-7 text-f1red" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">Invalid or expired link</h2>
              <p className="text-gray-400 text-sm">
                This link has expired or was already used. Please request a new password reset.
              </p>
              <Link to="/forgot-password" className="btn-primary w-full py-2.5 block text-center">
                Request New Link
              </Link>
              <Link to="/login" className="btn-secondary w-full py-2 block text-center">
                Back to Sign In
              </Link>
            </div>

          ) : (
            /* ── New password form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-400">Enter a new password for your account.</p>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <p className={`text-xs mt-1 ${passwordStrong ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordStrong ? '✓ Strong enough' : '✗ Too short'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field pr-10"
                    placeholder="Repeat your password"
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                    required
                  />
                  {form.confirm && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordsMatch
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <AlertCircle className="w-4 h-4" />}
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-2.5"
                disabled={loading || !passwordsMatch || !passwordStrong}
              >
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
