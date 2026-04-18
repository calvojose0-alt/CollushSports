import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, ChevronDown, Pencil, Shield } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const ADMIN_EMAIL = 'jcalvo87@hotmail.com'

export default function Header() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    function close(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-f1dark border-b border-f1light sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          {/* CS logo mark */}
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="group-hover:scale-105 transition-transform">
            <rect width="34" height="34" rx="8" fill="#FF8000" />
            {/* C */}
            <path
              d="M10 12.5 C10 9.5 12.5 7.5 15.5 7.5 L18 7.5"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"
            />
            <path
              d="M10 12.5 L10 21.5 C10 24.5 12.5 26.5 15.5 26.5 L18 26.5"
              stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"
            />
            {/* S */}
            <path
              d="M21 8.5 C21 8.5 25.5 8 25.5 11.5 C25.5 14.5 21 15.5 21 18.5 C21 21.5 25.5 21.5 25.5 25.5"
              stroke="#000000" strokeWidth="2.2" strokeLinecap="round" fill="none"
            />
          </svg>
          <div>
            <span className="font-black text-white text-sm tracking-tight">COLLUSH</span>
            <span className="text-f1accent font-bold text-xs ml-1">SPORTS</span>
          </div>
        </Link>

        {/* Track accent */}
        <div className="hidden md:block flex-1 mx-8">
          <div className="track-line opacity-30" />
        </div>

        {/* User menu */}
        {user ? (
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              className="flex items-center gap-2 bg-f1gray hover:bg-f1light rounded-lg px-3 py-1.5 transition-colors"
            >
              <div className="w-6 h-6 bg-f1red rounded-full flex items-center justify-center text-xs font-bold text-white">
                {(profile?.displayName || user.displayName || user.email)?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white max-w-[100px] truncate">
                {profile?.displayName || user.displayName || user.email}
              </span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-f1gray border border-f1light rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-f1light">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm text-white font-medium truncate">{user.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setDropOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-f1light hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                </Link>
                {isAdmin && (
                  <>
                    <div className="border-t border-f1light" />
                    <Link
                      to="/admin"
                      onClick={() => setDropOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-orange-400 hover:bg-f1light hover:text-orange-300 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  </>
                )}
                <div className="border-t border-f1light" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-f1light hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-secondary text-sm py-1.5 px-3">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm py-1.5 px-3">Register</Link>
          </div>
        )}
      </div>
    </header>
  )
}
