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
// compact=true → small pill badge for page headers
export default function TournamentCountdown({ compact = false }) {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft)

  useEffect(() => {
    if (!timeLeft) return
    const id = setInterval(() => {
      const next = calcTimeLeft()
      setTimeLeft(next)
      if (!next) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const urgent = timeLeft ? timeLeft.days === 0 : false
  const soon   = timeLeft ? timeLeft.days <= 3  : false

  // ── Compact bubble (header variant) ───────────────────────────────────────
  if (compact) {
    if (!timeLeft) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border bg-red-900/30 border-red-700/60 text-red-300 text-xs font-semibold">
          <Lock className="w-3 h-3" /> Locked
        </span>
      )
    }
    const pillColor = urgent
      ? 'bg-red-900/30 border-red-700/50 text-red-300'
      : soon
      ? 'bg-orange-900/30 border-orange-700/50 text-orange-300'
      : 'bg-green-900/20 border-green-700/40 text-green-400'
    const timeStr = timeLeft.days > 0
      ? `${timeLeft.days}d ${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m`
      : `${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums ${pillColor}`}>
        <Clock className="w-3 h-3 flex-shrink-0" />
        {timeStr}
      </span>
    )
  }

  // ── Full bar (original) ────────────────────────────────────────────────────
  if (!timeLeft) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/20 border border-red-700/40 text-sm text-red-300">
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span className="font-semibold">Picks are closed</span>
        <span className="text-red-500 hidden sm:inline">· Tournament started Jun 11, 2026</span>
      </div>
    )
  }

  const bannerClass = urgent
    ? 'bg-red-900/20 border-red-700/40'
    : soon
    ? 'bg-orange-900/20 border-orange-700/40'
    : 'bg-green-900/15 border-green-700/30'
  const labelColor = urgent ? 'text-red-400' : soon ? 'text-orange-400' : 'text-green-700'
  const iconColor  = urgent ? 'text-red-400' : soon ? 'text-orange-400' : 'text-green-700'

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${bannerClass}`}>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Clock className={`w-4 h-4 ${iconColor}`} />
        <span className={`text-xs font-semibold hidden sm:block ${labelColor}`}>
          {urgent ? 'Picks close soon!' : 'Picks close in'}
        </span>
      </div>
      <div className="w-px h-6 bg-gray-700 hidden sm:block flex-shrink-0" />
      <div className="flex items-end gap-1.5">
        <Unit value={timeLeft.days}    label="days" urgent={urgent} />
        <Colon urgent={urgent} />
        <Unit value={timeLeft.hours}   label="hrs"  urgent={urgent} />
        <Colon urgent={urgent} />
        <Unit value={timeLeft.minutes} label="min"  urgent={urgent} />
        <Colon urgent={urgent} />
        <Unit value={timeLeft.seconds} label="sec"  urgent={urgent} />
      </div>
      <div className="ml-auto hidden md:block text-right flex-shrink-0">
        <p className="text-[10px] text-gray-500 leading-tight">Deadline</p>
        <p className="text-[11px] text-gray-400 font-semibold leading-tight">Jun 11, 2026</p>
      </div>
    </div>
  )
}
