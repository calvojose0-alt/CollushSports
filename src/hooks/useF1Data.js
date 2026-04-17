// useF1Data — fetches driver stats for the Driver Panel
import { useState, useEffect } from 'react'
import { buildDriverStats, getDriverStats } from '@/services/api/f1Api'

export function useDriverStats(driverId, raceId, raceResults = []) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!driverId || !raceId) {
      setStats(null)
      return
    }

    // 1. Build stats instantly from stored results + seed blend
    const seed = buildDriverStats(driverId, raceId, raceResults)
    setStats(seed)
    setError(null)

    // 2. Try to enrich bar chart from OpenF1 in the background (live mode only)
    let cancelled = false
    getDriverStats(driverId, raceId, raceResults)
      .then((enriched) => { if (!cancelled && enriched) setStats(enriched) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [driverId, raceId, raceResults])

  // loading is no longer needed — seed data renders immediately
  return { stats, loading: false, error }
}
