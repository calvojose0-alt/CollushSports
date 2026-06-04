import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { signIn, signInWithApple } from '@/services/firebase/auth'
import { Flag, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  const [form, setForm] = useState({ email: '', password: '' })
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
      if (
        err.message?.toLowerCase().includes('not implemented') ||
        err.message?.toLowerCase().includes('plugin') ||
        err.message?.toLowerCase().includes('not available')
      ) {
        setError('Sign in with Apple is not available on this device. Please use email and password.')
      } else if (err.message?.toLowerCase().includes('cancel') || err.message?.toLowerCase().includes('user cancel')) {
        // User dismissed the sheet — don't show an error
      } else {
        setError(err.message)
      }
    } finally {
      setAppleLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn({ email: form.email, password: form.password })
      navigate(redirectTo)
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
          <p className="text-gray-400 text-sm">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card border-f1light">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="••••••••"
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
              {loading ? 'Signing in…' : 'Sign In'}
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
            {appleLoading ? 'Signing in…' : 'Sign in with Apple'}
          </button>

          <div className="mt-4 pt-4 border-t border-f1light text-center">
            <p className="text-sm text-gray-400">
              Don't have an account?{' '}
              <Link
                to={redirectTo !== '/' ? `/register?redirect=${encodeURIComponent(redirectTo)}` : '/register'}
                className="text-f1accent hover:text-orange-400 font-medium"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Collush Sports — Fan-made fantasy platform.
        </p>
      </div>
    </div>
  )
}
