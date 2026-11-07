// Soccer Tournament Win League — Draft Board Rankings
// Teams sorted best-to-worst by approximate FIFA world ranking
// (used only to order the draft board; does not affect scoring)

export const WL_RANKED_TEAMS = [
  // Tier 1 — Favorites
  'france',
  'brazil',
  'england',
  'argentina',
  'belgium',
  'spain',
  'portugal',
  'netherlands',

  // Tier 2 — Contenders
  'germany',
  'morocco',
  'usa',
  'mexico',
  'uruguay',
  'croatia',
  'colombia',
  'switzerland',

  // Tier 3 — Dark Horses
  'senegal',
  'japan',
  'southkorea',
  'norway',
  'ecuador',
  'austria',
  'turkey',
  'iran',

  // Tier 4 — Capable
  'scotland',
  'australia',
  'algeria',
  'ivorycoast',
  'egypt',
  'sweden',
  'canada',
  'paraguay',

  // Tier 5 — Underdogs
  'saudiarabia',
  'uzbekistan',
  'tunisia',
  'southafrica',
  'bosnia',
  'czechrepublic',
  'ghana',
  'drcongo',

  // Tier 6 — Long Shots
  'capeverde',
  'newzealand',
  'jordan',
  'qatar',
  'panama',
  'iraq',
  'haiti',
  'curacao',
]

// Round labels for advancement tracking.
// `points` = bonus awarded when a team is recorded as having ADVANCED TO
// (i.e. reached) that round. Because reaching a round means you WON the
// previous knockout match, the bonus effectively rewards winning that match:
//   reach R16 = won R32 game  → 2
//   reach QF  = won R16 game  → 4
//   reach SF  = won QF game   → 5
//   reach Final = won SF game → 6
//   Champion  = won the Final → 8
// Just qualifying for the Round of 32 (no knockout win yet) = 0.
export const WL_ROUNDS = [
  { id: 'r32',      label: 'Round of 32',   shortLabel: 'R32',  points: 0 },
  { id: 'r16',      label: 'Round of 16',   shortLabel: 'R16',  points: 2 },
  { id: 'qf',       label: 'Quarterfinals', shortLabel: 'QF',   points: 4 },
  { id: 'sf',       label: 'Semifinals',    shortLabel: 'SF',   points: 5 },
  { id: 'final',    label: 'Final',         shortLabel: 'FIN',  points: 6 },
  { id: 'champion', label: 'Champion',      shortLabel: 'WIN',  points: 8 },
]

// Round order for sorting/display
export const WL_ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'final', 'champion']

// Match scoring constants
export const WL_MATCH_POINTS = { win: 3, draw: 1, loss: 0 }
// Max advancement bonus a single team can earn (R16 2 + QF 4 + SF 5 + Final 6 + Champion 8)
export const WL_MAX_ADVANCE_POINTS = 25

/**
 * Generate draft order for N players × picksEach rounds.
 *
 * For 10 players / 3 picks the exact pick sequence is:
 *
 *   Round 1 (picks  1–10): 1,2,3,4 | 10,9,8,7,6,5
 *     – First (N/2 – 1) players pick forward, then remaining pick in reverse
 *       from the top. Gives mid-field players early Round-1 picks without
 *       granting position 1 or 10 an outsized advantage.
 *
 *   Round 2 (picks 11–20): 10,9,8,7,6,5,4,3,2,1
 *     – Full reverse snake.
 *
 *   Round 3 (picks 21–30): 5,6,4,7,3,8,2,9,1,10
 *     – Middle-out starting from position 5, spiraling outward.
 *       Ensures no single player benefits from two consecutive early picks
 *       across all three rounds.
 *
 * @param {string[]} playerIds  - Already-shuffled array of user-ids
 * @param {number}   picksEach  - Picks per player (default 3)
 * @returns {string[]}          - Full 30-pick draft order array
 */
export function generateDraftOrder(playerIds, picksEach = 3) {
  const n = playerIds.length
  const order = []

  for (let round = 0; round < picksEach; round++) {
    const indices = buildRoundIndices(n, round)
    for (const idx of indices) order.push(playerIds[idx])
  }

  return order
}

/**
 * Returns the 0-based index sequence for a given round.
 *
 * Round 0: first (⌊N/2⌋−1) indices forward, then remaining from N−1 downward
 *          e.g. N=10 → [0,1,2,3, 9,8,7,6,5,4]
 * Round 1: full reverse  → [9,8,7,6,5,4,3,2,1,0]
 * Round 2: middle-out    → [4,5,3,6,2,7,1,8,0,9]
 */
function buildRoundIndices(n, round) {
  if (round === 0) {
    const splitAt = Math.floor(n / 2) - 1  // 4 for n=10
    const indices = []
    for (let i = 0; i < splitAt; i++)      indices.push(i)          // forward: 0…3
    for (let i = n - 1; i >= splitAt; i--) indices.push(i)          // reverse: 9…4
    return indices
  }
  if (round === 1) {
    return Array.from({ length: n }, (_, i) => n - 1 - i)           // full reverse
  }
  if (round === 2) {
    return buildMiddleOutIndices(n)                                   // middle-out
  }
  // Round 4+: alternate forward / reverse
  return round % 2 === 0
    ? Array.from({ length: n }, (_, i) => i)
    : Array.from({ length: n }, (_, i) => n - 1 - i)
}

/**
 * Middle-out index sequence starting from ⌊N/2⌋−1.
 * N=10 → [4,5,3,6,2,7,1,8,0,9]
 */
function buildMiddleOutIndices(n) {
  const mid = Math.floor(n / 2) - 1
  const indices = []
  let lo = mid, hi = mid + 1
  while (indices.length < n) {
    if (lo >= 0) indices.push(lo--)
    if (indices.length < n && hi < n) indices.push(hi++)
  }
  return indices
}
