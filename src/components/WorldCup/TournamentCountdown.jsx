import { useState, useEffect } from 'react'
import { Clock, Lock } from 'lucide-react'
import { PICK_LOCK_TIME } from '@/data/wc2026Teams'

function pad(n) {
  return String(n).padStart(2, '0')
}

function calcTimeLeft() {
  const diff = PICK_LOCK_TIME - Date.now()
  if (diff <= 0) return null
  const totalSecs = Math.floor(diff / 1000)
  const days    = Math.floor(totalSecs / 86400)
  const hours   = Math.floor((totalSecs % 86400) / 3600)
  const minutes = Math.floor((totalSecs % 3600)  / 60)
  const seconds = totalSecs % 60
  return { days, hours, minutes, seconds, totalSecs }
}

// ── Unit box ──────────────────────────────────────────────────────────────────
function Unit({ value, label, urgent }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`tabular-nums font-black text-lg leading-none ${
          urgent ? 'text-red-400' : 'text-white'
        }`}
      >
        {pad(value)}
      </span>
      <span className={`text-[9px] font-semibold uppercase tracking-widest mt-0.5 ${
        urgent ? 'text-red-500' : 'text-gray-500'
      }`}>
        {label}
      </span>
    </div>
  )
}

function Colon({ urgent }) {
  return (
    <span className={`font-black text-base leading-none mb-2 ${urgent ? 'text-red-500' : 'text-gray-600'}`}>
      :
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TournamentCountdown() {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft)

  useEffect(() => {
    // Already expired on mount
    if (!timeLeft) return

    const id = setInterval(() => {
      const next = calcTimeLeft()
      setTimeLeft(next)
      if (!next) clearInterval(id)
    }, 1000)

    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Locked state ──────────────────────────────────────────────────────────
  if (!timeLeft) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/20 border border-red-700/40 text-sm text-red-300">
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold">Picks are closed</span>
        <span className="text-red-500 hidden sm:inline">· Tournament started Jun 11, 2026</span>
      </div>
    )
  }

  const urgent = timeLeft.days === 0   // less than 24 h left → red accents
  const soon   = timeLeft.days <= 3    // 3 days or fewer → orange banner tint

  const bannerClass = urgent
    ? 'bg-red-900/20 border-red-700/40'
    : soon
    ? 'bg-orange-900/20 border-orange-700/40'
    : 'bg-green-900/15 border-green-700/30'

  const labelColor = urgent ? 'text-red-400' : soon ? 'text-orange-400' : 'text-green-700'
  const iconColor  = urgent ? 'text-red-400' : soon ? 'text-orange-400' : 'text-green-700'

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${bannerClass}`}>
      {/* Icon + label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Clock className={`w-4 h-4 ${iconColor}`} />
        <span className={`text-xs font-semibold hidden sm:block ${labelColor}`}>
          {urgent ? 'Picks close soon!' : soon ? 'Picks close in' : 'Picks close in'}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700 hidden sm:block flex-shrink-0" />

      {/* Clock units */}
      <div className="flex items-end gap-1.5">
        <Unit value={timeLeft.days}    label="days" urgent={urgent} />
        <Colon urgent={urgent} />
        <Unit value={timeLeft.hours}   label="hrs"  urgent={urgent} />
        <Colon urgent={urgent} />
        <Unit value={timeLeft.minutes} label="min"  urgent={urgent} />
        <Colon urgent={urgent} />
        <Unit value={timeLeft.seconds} label="sec"  urgent={urgent} />
      </div>

      {/* Deadline text */}
      <div className="ml-auto hidden md:block text-right flex-shrink-0">
        <p className="text-[10px] text-gray-500 leading-tight">Deadline</p>
        <p className="text-[11px] text-gray-400 font-semibold leading-tight">Jun 11, 2026</p>
      </div>
    </div>
  )
}
