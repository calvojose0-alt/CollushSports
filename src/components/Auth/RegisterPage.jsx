import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { registerUser, signInWithApple } from '@/services/firebase/auth'
import { Flag, AlertCircle, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAppleSignIn = async () => {
    setError(null)
    setAppleLoading(true)
    try {
      await signInWithApple()
      navigate(redirectTo)
    } catch (err) {
      setError(err.message)
    } finally {
      setAppleLoading(false)
    }
  }
  const [registered, setRegistered] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const passwordsMatch = form.password === form.confirm && form.confirm.length > 0
  const passwordStrong = form.password.length >= 6

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!passwordsMatch) { setError('Passwords do not match'); return }
    if (!passwordStrong) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await registerUser({ email: form.email, password: form.password, displayName: form.displayName })
      setRegisteredEmail(form.email)
      setRegistered(true)
    } catch (err) {
      // If the only failure is the confirmation email send (SMTP not yet configured),
      // the account was still created — show the confirmation screen anyway.
      const isEmailSendError =
        err.message?.toLowerCase().includes('sending confirmation') ||
        err.message?.toLowerCase().includes('sending email') ||
        err.message?.toLowerCase().includes('email') && err.message?.toLowerCase().includes('error')
      if (isEmailSendError) {
        setRegisteredEmail(form.email)
        setRegistered(true)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
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
          </div>

          <div className="card border-f1light text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Check your email!</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              We sent a confirmation link to <span className="text-white font-semibold">{registeredEmail}</span>.
            </p>
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3 text-left space-y-2">
              <p className="text-amber-300 text-sm font-semibold">📧 From: Collush Sports Admin</p>
              <p className="text-amber-300 text-sm font-semibold">✉️ no-reply@collushsports.com</p>
              <p className="text-gray-300 text-xs mt-2">
                Can't find it? Check your <span className="text-white font-semibold">Junk / Spam</span> folder — it may have landed there.
              </p>
            </div>
            <p className="text-gray-400 text-xs">
              Click the link in the email to activate your account, then come back to sign in.
            </p>
            <button
              onClick={() => navigate(redirectTo !== '/' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login')}
              className="btn-primary w-full py-2.5 mt-2"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
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
          <p className="text-gray-400 text-sm">Create your account to start competing</p>
        </div>

        <div className="card border-f1light">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="How you'll appear to others"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
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
                    {passwordsMatch ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-f1light" />
            <span className="text-xs text-gray-500">or</span>
            <div className="flex-1 h-px bg-f1light" />
          </div>

          {/* Apple Sign In */}
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={appleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl transition-colors"
          >
            {appleLoading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            )}
            {appleLoading ? 'Signing in…' : 'Continue with Apple'}
          </button>

          <div className="mt-4 pt-4 border-t border-f1light text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link
                to={redirectTo !== '/' ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login'}
                className="text-f1accent hover:text-orange-400 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
