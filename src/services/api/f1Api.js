// F1 API Service
// Uses OpenF1 API (https://openf1.org/) — free, no API key required
// Falls back to local seed data when API is unavailable or in demo mode

import { DRIVER_STATS, DRIVER_MAP, RECENT_RACE_LABELS } from '@/data/drivers2026'
import { RACES_2026, TRACK_HISTORY } from '@/data/calendar2026'

const BASE_URL = import.meta.env.VITE_OPENF1_API_URL || 'https://api.openf1.org/v1'
const IS_DEMO = import.meta.env.VITE_APP_MODE !== 'live'

async function apiFetch(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`OpenF1 API error: ${res.status}`)
  return res.json()
}

// ─── Driver Stats & Probabilities ────────────────────────────────────────────

/**
 * Get a driver's stats for the driver panel.
 * Returns podium probability, top10 probability, last 5 races, track history.
 */
export async function getDriverStats(driverId, raceId) {
  // Always start from seed stats — they encode real driver form & are instant
  const base = buildDriverStats(driverId, raceId)

  if (IS_DEMO) return base

  // In live mode, attempt to enrich the recent-finishes bar chart from OpenF1.
  // Probabilities stay seed-based because the OpenF1 /position endpoint is a
  // live timing stream that doesn't reliably surface final finishing positions
  // for historical races, which would produce 0% for everyone.
  try {
    const sessions = await apiFetch('/sessions', { session_type: 'Race', year: 2026 })
    const lastSessions = sessions.slice(-5).map((s) => s.session_key)

    const results = await Promise.all(
      lastSessions.map((sk) =>
        apiFetch('/position', { session_key: sk, driver_number: driverId })
          .then((data) => {
            if (!data?.length) return null
            const final = data.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            return final?.position ?? null
          })
          .catch(() => null)
      )
    )

    const valid = results.filter((r) => r !== null)

    // Only replace the bar chart if we actually got real data back
    if (valid.length > 0) {
      return {
        ...base,
        recentFinishes: valid,
        recentRaceLabels: lastSessions.map((_, i) => `R-${lastSessions.length - i}`),
        dataSource: 'OpenF1',
      }
    }
  } catch (err) {
    console.warn('[F1 API] Could not enrich from OpenF1, using seed data:', err.message)
  }

  return base
}

function buildDriverStats(driverId, raceId) {
  const seed = DRIVER_STATS[driverId] || { podiumRate: 0.05, top10Rate: 0.4, recentFinishes: [10, 12, 14, 11, 13] }
  return {
    driverId,
    driver: DRIVER_MAP[driverId],
    podiumProbability: Math.round(seed.podiumRate * 100),
    top10Probability: Math.round(seed.top10Rate * 100),
    recentFinishes: seed.recentFinishes,
    recentRaceLabels: RECENT_RACE_LABELS,
    trackHistory: getTrackHistoryForDriver(driverId, raceId),
    dataSource: 'Seed',
  }
}

function getTrackHistoryForDriver(driverId, raceId) {
  const track = TRACK_HISTORY[raceId]
  if (!track || !track[driverId]) return []
  return track[driverId]
}

// ─── Race Results (for admin ingestion) ──────────────────────────────────────

/**
 * Attempt to fetch race results from OpenF1 for a given round.
 * Returns top 20 finishers with position, driverId, driverName.
 */
export async function fetchRaceResults(year, round) {
  if (IS_DEMO) {
    return null // admin must enter manually in demo mode
  }

  try {
    // Find matching session
    const sessions = await apiFetch('/sessions', {
      year,
      session_type: 'Race',
      circuit_short_name: RACES_2026.find((r) => r.round === round)?.shortName?.toLowerCase(),
    })
    if (!sessions.length) return null

    const sessionKey = sessions[0].session_key
    const positions = await apiFetch('/position', { session_key: sessionKey })

    // Get final positions (latest timestamp per driver)
    const driverFinalPos = {}
    for (const entry of positions) {
      const dNum = entry.driver_number?.toString()
      if (!driverFinalPos[dNum] || new Date(entry.date) > new Date(driverFinalPos[dNum].date)) {
        driverFinalPos[dNum] = entry
      }
    }

    const sorted = Object.values(driverFinalPos).sort((a, b) => a.position - b.position)

    // Map driver numbers to IDs (F1 official numbers → our IDs)
    const numberToId = Object.fromEntries(
      Object.values(DRIVER_MAP).map((d) => [d.number.toString(), d.id])
    )

    return sorted.slice(0, 20).map((entry) => ({
      position: entry.position,
      driverId: numberToId[entry.driver_number?.toString()] || `UNK_${entry.driver_number}`,
      driverName: DRIVER_MAP[numberToId[entry.driver_number?.toString()]]?.name || `#${entry.driver_number}`,
    }))
  } catch (err) {
    console.error('[F1 API] fetchRaceResults failed:', err)
    return null
  }
}

// ─── Season standings helper ──────────────────────────────────────────────────

export async function getDriverStandings(year = 2025) {
  if (IS_DEMO) return null
  try {
    // OpenF1 doesn't have standings directly; compute from results
    return null
  } catch {
    return null
  }
}
