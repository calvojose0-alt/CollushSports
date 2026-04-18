import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getGroupByCode, joinGroupByCode } from '@/services/firebase/firestore'
import { Users, Flag, AlertCircle, CheckCircle2, LogIn, UserPlus, Globe } from 'lucide-react'

// Map game IDs to display info + redirect path
const GAME_META = {
  f1_survivor_2026: {
    label: 'F1 Survivor 2025',
    icon: <Flag className="w-5 h-5 text-f1red" />,
    color: 'text-f1red',
    redirect: '/f1-survivor/groups',
  },
  wc2026: {
    label: '2026 World Cup Quiniela',
    icon: <Globe className="w-5 h-5 text-yellow-400" />,
    color: 'text-yellow-400',
    redirect: '/world-cup/groups',
  },
}

export default function JoinGroupPage() {
  const { code } = useParams()
  const navigate  = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [group,   setGroup]   = useState(null)
  const [fetching, setFetching] = useState(true)
  const [fetchErr, setFetchErr] = useState(null)
  const [joining,  setJoining]  = useState(false)
  const [joined,   setJoined]   = useState(false)
  const [joinErr,  setJoinErr]  = useState(null)

  // Fetch group preview (name + creator) — always, even before auth resolves
  useEffect(() => {
    if (!code) return
    setFetching(true)
    getGroupByCode(code.toUpperCase())
      .then((g) => { setGroup(g); setFetching(false) })
      .catch((err) => { setFetchErr(err.message); setFetching(false) })
  }, [code])

  const handleJoin = async () => {
    if (!user) return
    setJoining(true)
    setJoinErr(null)
    try {
      await joinGroupByCode(code.toUpperCase(), user.uid)
      setJoined(true)
    } catch (err) {
      setJoinErr(err.message)
    } finally {
      setJoining(false)
    }
  }

  const gameMeta = group ? (GAME_META[group.gameId] || GAME_META.wc2026) : null
  const redirectPath = gameMeta?.redirect || '/'

  // ── Loading state ──────────────────────────────────────────────────────────
  if (fetching || authLoading) {
    return (
      <div className="min-h-screen f1-hero-gradient flex items-center justify-center px-4">
        <div className="animate-spin w-10 h-10 border-2 border-f1red border-t-transparent rounded-full" />
      </div>
    )
  }

  // ── Invalid code ───────────────────────────────────────────────────────────
  if (fetchErr) {
    return (
      <div className="min-h-screen f1-hero-gradient flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <BrandHeader />
          <div className="card border-f1light text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Invalid Invite Link</h2>
            <p className="text-gray-400 text-sm">
              This invite link is not valid or has expired. Ask the group creator for a new one.
            </p>
            <Link to="/" className="btn-primary w-full py-2.5 block text-center">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Successfully joined — redirect prompt ─────────────────────────────────
  if (joined) {
    return (
      <div className="min-h-screen f1-hero-gradient flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <BrandHeader />
          <div className="card border-f1light text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">You're in!</h2>
            <p className="text-gray-300 text-sm">
              You've joined <span className="text-white font-semibold">{group?.name}</span>.
            </p>
            <button
              onClick={() => navigate(redirectPath)}
              className="btn-primary w-full py-2.5"
            >
              Go to Group
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Not logged in — show preview + auth options ───────────────────────────
  if (!user) {
    const redirectParam = encodeURIComponent(`/join/${code}`)
    return (
      <div className="min-h-screen f1-hero-gradient flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4">
          <BrandHeader />

          {/* Group preview card */}
          <div className="card border-f1light space-y-4">
            <GroupPreview group={group} gameMeta={gameMeta} />

            <div className="border-t border-f1light pt-4 space-y-3">
              <p className="text-sm text-gray-400 text-center">
                Sign in or create an account to join this group.
              </p>
              <Link
                to={`/register?redirect=${redirectParam}`}
                className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create Account &amp; Join
              </Link>
              <Link
                to={`/login?redirect=${redirectParam}`}
                className="btn-secondary w-full py-2.5 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In &amp; Join
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Logged in — show confirmation ─────────────────────────────────────────
  const alreadyMember = group?.members?.includes(user.uid)

  return (
    <div className="min-h-screen f1-hero-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <BrandHeader />

        <div className="card border-f1light space-y-4">
          <GroupPreview group={group} gameMeta={gameMeta} />

          <div className="border-t border-f1light pt-4 space-y-3">
            {alreadyMember ? (
              <>
                <p className="text-sm text-green-400 text-center font-semibold">
                  ✓ You're already a member of this group!
                </p>
                <button
                  onClick={() => navigate(redirectPath)}
                  className="btn-primary w-full py-2.5"
                >
                  Go to Group
                </button>
              </>
            ) : (
              <>
                {joinErr && (
                  <div className="flex items-center gap-2 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {joinErr}
                  </div>
                )}
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  {joining ? 'Joining…' : `Join "${group?.name}"`}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="btn-secondary w-full py-2"
                >
                  Maybe Later
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────

function BrandHeader() {
  return (
    <div className="text-center mb-2">
      <Link to="/" className="inline-flex items-center gap-3 mb-1">
        <div className="w-10 h-10 bg-f1red rounded-xl flex items-center justify-center">
          <Flag className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-xl font-black text-white tracking-tight">COLLUSH</div>
          <div className="text-xs text-f1accent font-semibold tracking-widest -mt-1">SPORTS</div>
        </div>
      </Link>
    </div>
  )
}

function GroupPreview({ group, gameMeta }) {
  if (!group) return null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {gameMeta?.icon}
        <span className={gameMeta?.color}>{gameMeta?.label}</span>
      </div>
      <div className="bg-f1dark rounded-xl px-4 py-3 space-y-1">
        <p className="text-lg font-black text-white">{group.name}</p>
        <p className="text-sm text-gray-400">
          Created by <span className="text-gray-200 font-semibold">{group.creatorName}</span>
        </p>
        <p className="text-xs text-gray-500">
          {group.members?.length || 1} member{(group.members?.length || 1) !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
