// Survivor Game Engine
// Core logic for the F1 Survivor Pool game rules

import {
  getPicksForRace,
  getPicksForPlayer,
  updatePick,
  updatePlayerStatus,
  getPlayers,
  getGame,
} from '@/services/firebase/firestore'
import { isRaceLocked } from '@/data/calendar2026'

// ─── Evaluation ──────────────────────────────────────────────────────────────

/**
 * Process race results and update all picks + player statuses.
 * Called by admin after each race.
 *
 * @param {string} gameId
 * @param {string} raceId
 * @param {Array} raceResults - [{ position, driverId, driverName }]
 */
export async function processRaceResults(gameId, raceId, raceResults) {
  const picks = await getPicksForRace(gameId, raceId)
  const players = await getPlayers(gameId)

  // Build lookup: driverId → finishing position
  const positionMap = {}
  for (const r of raceResults) {
    positionMap[r.driverId] = r.position
  }

  const playerMap = Object.fromEntries(players.map((p) => [p.userId, p]))
  const updates = [] // { pick, playerUpdate }

  for (const pick of picks) {
    const player = playerMap[pick.userId]
    if (!player || player.status === 'eliminated') continue

    const posA = positionMap[pick.columnA?.driverId]
    const posB = positionMap[pick.columnB?.driverId]

    const successA = posA !== undefined && posA <= 3   // Podium = top 3
    const successB = posB !== undefined && posB <= 10  // Top 10

    const survived = successA || successB
    const pointEarned = successA && successB

    const pickUpdate = {
      resultA: successA ? 'success' : 'fail',
      resultB: successB ? 'success' : 'fail',
      survived,
      pointEarned,
    }

    const playerUpdate = {
      points: (player.points || 0) + (pointEarned ? 1 : 0),
      lastRaceId: raceId,
      [`raceResult_${raceId}`]: survived ? 'survived' : 'eliminated',
    }
    if (!survived) {
      playerUpdate.status = 'eliminated'
      playerUpdate.eliminatedAt = raceId
    }

    updates.push({ pick, pickUpdate, playerUpdate, player })
  }

  // Apply updates
  await Promise.all([
    ...updates.map(({ pick, pickUpdate }) => updatePick(pick.id, pickUpdate)),
    ...updates.map(({ player, playerUpdate }) =>
      updatePlayerStatus(player.id, playerUpdate)
    ),
  ])

  // Check for end-game conditions
  const refreshedPlayers = await getPlayers(gameId)
  await checkEndConditions(gameId, raceId, refreshedPlayers)

  return { processed: updates.length }
}

/**
 * Evaluate end-game conditions per the rules:
 * - 1 player alive → Championship Winner
 * - 2 players alive → tiebreaker (next race → highest points wins)
 * - 3+ players → competition continues
 */
async function checkEndConditions(gameId, raceId, players) {
  const alive = players.filter((p) => p.status === 'alive')

  if (alive.length === 0) {
    // Everyone eliminated in same race — highest points wins
    const sorted = players.sort((a, b) => b.points - a.points)
    if (sorted.length > 0) {
      await updatePlayerStatus(sorted[0].id, { status: 'winner', winReason: 'last_points' })
    }
    return
  }

  if (alive.length === 1) {
    await updatePlayerStatus(alive[0].id, { status: 'winner', winReason: 'last_standing' })
    return
  }

  if (alive.length === 2) {
    // Flag for tiebreaker mode — admin will process one more race
    // After that race (or if it's the final race), highest points wins
    await Promise.all(
      alive.map((p) => updatePlayerStatus(p.id, { tiebreaker: true }))
    )
    return
  }

  // 3+ players — check if we were already in tiebreaker mode
  // (tiebreaker flag gets cleared when more than 2 survive)
  const tiebreakerPlayers = alive.filter((p) => p.tiebreaker)
  if (tiebreakerPlayers.length > 0) {
    await Promise.all(
      alive.map((p) => updatePlayerStatus(p.id, { tiebreaker: false }))
    )
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Check whether a player can submit a pick for a given race.
 * Returns { valid: bool, reason: string }
 */
export async function validatePick({ gameId, userId, raceId, columnA, columnB }) {
  // 1. Race lock check
  if (isRaceLocked(raceId)) {
    return { valid: false, reason: 'Race has been locked. Picks are no longer accepted.' }
  }

  // 2. Player must be alive
  const players = await getPlayers(gameId)
  const player = players.find((p) => p.userId === userId)
  if (!player) return { valid: false, reason: 'You are not enrolled in this game.' }
  if (player.status === 'eliminated') {
    return { valid: false, reason: 'You have been eliminated from this competition.' }
  }

  // 3. Driver reuse constraint
  const allPicks = await getPicksForPlayer(gameId, userId)
  const usedInA = new Set(allPicks.map((p) => p.columnA?.driverId).filter(Boolean))
  const usedInB = new Set(allPicks.map((p) => p.columnB?.driverId).filter(Boolean))

  // Exclude current race from used sets (allow editing before lock)
  const previousPicks = allPicks.filter((p) => p.raceId !== raceId)
  const prevUsedInA = new Set(previousPicks.map((p) => p.columnA?.driverId).filter(Boolean))
  const prevUsedInB = new Set(previousPicks.map((p) => p.columnB?.driverId).filter(Boolean))

  if (columnA && prevUsedInA.has(columnA.driverId)) {
    return {
      valid: false,
      reason: `${columnA.driverName} has already been used in Column A (Podium). Choose a different driver.`,
    }
  }
  if (columnB && prevUsedInB.has(columnB.driverId)) {
    return {
      valid: false,
      reason: `${columnB.driverName} has already been used in Column B (Top 10). Choose a different driver.`,
    }
  }

  return { valid: true, reason: null }
}

// ─── Query helpers ────────────────────────────────────────────────────────────

/**
 * Get the set of drivers a player has already used in each column.
 */
export async function getUsedDrivers(gameId, userId) {
  const picks = await getPicksForPlayer(gameId, userId)
  const usedA = new Set(picks.map((p) => p.columnA?.driverId).filter(Boolean))
  const usedB = new Set(picks.map((p) => p.columnB?.driverId).filter(Boolean))
  return { usedA, usedB }
}

/**
 * Summarize a player's season stats for display.
 */
export function buildPlayerSummary(player, picks) {
  const completed = picks.filter((p) => p.survived !== null)
  return {
    totalRaces: completed.length,
    survived: completed.filter((p) => p.survived).length,
    eliminated: completed.filter((p) => !p.survived).length,
    points: player.points || 0,
    status: player.status,
    winStreak: calcWinStreak(completed),
  }
}

function calcWinStreak(picks) {
  let streak = 0
  for (let i = picks.length - 1; i >= 0; i--) {
    if (picks[i].survived) streak++
    else break
  }
  return streak
}
