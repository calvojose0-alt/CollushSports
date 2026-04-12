// useF1Data — fetches driver stats for the Driver Panel
import { useState, useEffect } from 'react'
import { buildDriverStats, getDriverStats } from '@/services/api/f1Api'

export function useDriverStats(driverId, raceId) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!driverId || !raceId) {
      setStats(null)
      return
    }

    // 1. Set seed stats instantly — no loading flash when switching drivers
    const seed = buildDriverStats(driverId, raceId)
    setStats(seed)
    setError(null)

    // 2. Try to enrich from OpenF1 in the background (updates recent finishes
    //    bar chart if live data is available, otherwise seed stays as-is)
    let cancelled = false
    getDriverStats(driverId, raceId)
      .then((enriched) => { if (!cancelled && enriched) setStats(enriched) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [driverId, raceId])

  // loading is no longer needed — seed data renders immediately
  return { stats, loading: false, error }
}
