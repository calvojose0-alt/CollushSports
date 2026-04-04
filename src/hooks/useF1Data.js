// useF1Data — fetches driver stats for the Driver Panel
import { useState, useEffect } from 'react'
import { getDriverStats } from '@/services/api/f1Api'

export function useDriverStats(driverId, raceId) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!driverId || !raceId) {
      setStats(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getDriverStats(driverId, raceId)
      .then((data) => { if (!cancelled) setStats(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [driverId, raceId])

  return { stats, loading, error }
}
