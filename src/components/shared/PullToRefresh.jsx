// PullToRefresh — swipe-down gesture that calls onRefresh().
// Works in Capacitor WebView and mobile browsers.
// The indicator is rendered above the content and slides into view as you pull.
import { useRef, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 72 // px of pull needed to trigger

export default function PullToRefresh({ onRefresh, accentColor = '#facc15', children }) {
  const [pull, setPull]       = useState(0)      // visual translation in px
  const [spinning, setSpinning] = useState(false)

  const startYRef  = useRef(null)
  const pullRef    = useRef(0)   // mirror of `pull` to read inside async closures
  const busyRef    = useRef(false)

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY > 2 || busyRef.current) return
      startYRef.current = e.touches[0].clientY
    }

    const onTouchMove = (e) => {
      if (startYRef.current === null || busyRef.current) return
      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) { startYRef.current = null; return }
      // Ease-out feel: fast at first, slows down toward limit
      const clamped = Math.min(Math.pow(delta, 0.72) * 4.2, THRESHOLD + 30)
      pullRef.current = clamped
      setPull(clamped)
    }

    const onTouchEnd = async () => {
      if (startYRef.current === null) return
      startYRef.current = null
      const dist = pullRef.current
      pullRef.current = 0

      if (dist >= THRESHOLD && !busyRef.current) {
        busyRef.current = true
        setSpinning(true)
        setPull(46) // hold indicator still while loading
        try {
          await onRefresh()
        } finally {
          busyRef.current = false
          setSpinning(false)
          setPull(0)
        }
      } else {
        setPull(0)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })
    window.addEventListener('touchend',   onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh])

  const pct     = Math.min(pull / THRESHOLD, 1)
  const iconDeg = spinning ? undefined : Math.round(pct * 340)

  return (
    <div className="relative">
      {/* Pull-down indicator — sits 52px above content, slides in as user pulls */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          top:           -52,
          left:          0,
          right:         0,
          display:       'flex',
          justifyContent:'center',
          transform:     `translateY(${pull}px)`,
          opacity:       pct,
          transition:    spinning || pull > 2
            ? 'none'
            : 'transform 0.25s ease, opacity 0.25s ease',
          pointerEvents: 'none',
          zIndex:        20,
        }}
      >
        <div style={{
          background:   '#1a1a1a',
          border:       '1px solid #333',
          borderRadius: '999px',
          padding:      '8px',
          boxShadow:    '0 2px 10px rgba(0,0,0,0.6)',
        }}>
          <RefreshCw
            size={20}
            color={accentColor}
            className={spinning ? 'animate-spin' : ''}
            style={!spinning ? { transform: `rotate(${iconDeg}deg)` } : {}}
          />
        </div>
      </div>

      {children}
    </div>
  )
}
