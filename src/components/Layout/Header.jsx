import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Flag, LogOut, User, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

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

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-f1dark border-b border-f1light sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-f1red rounded-lg flex items-center justify-center group-hover:bg-red-700 transition-colors">
            <Flag className="w-4 h-4 text-white" />
          </div>
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
              <div className="absolute right-0 mt-2 w-44 bg-f1gray border border-f1light rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-f1light">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm text-white font-medium truncate">{user.email}</p>
                </div>
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
