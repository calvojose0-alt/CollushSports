import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordReset } from '@/services/firebase/auth'
import { Flag, AlertCircle, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await sendPasswordReset(email)
      setSent(true)
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
          <p className="text-gray-400 text-sm">Reset your password</p>
        </div>

        <div className="card border-f1light">
          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                We sent a reset link to{' '}
                <span className="text-white font-semibold">{email}</span>.
              </p>
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3 text-left space-y-1">
                <p className="text-amber-300 text-sm font-semibold">📧 From: Collush Sports Admin</p>
                <p className="text-gray-300 text-xs mt-1">
                  Can't find it? Check your{' '}
                  <span className="text-white font-semibold">Junk / Spam</span> folder.
                </p>
              </div>
              <p className="text-gray-400 text-xs">
                Tap the link in the email to set a new password, then come back to sign in.
              </p>
              <Link to="/login" className="btn-primary w-full py-2.5 block text-center mt-2">
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* ── Email entry form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-400">
                Enter the email address for your account and we'll send you a link to reset your password.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
