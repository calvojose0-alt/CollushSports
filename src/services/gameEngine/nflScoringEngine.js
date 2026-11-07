// NFL Fantasy Manager League — scoring engine (pure functions, no I/O).
// Given a player's weekly stat line + a league's scoring profile, compute
// fantasy points and a breakdown for transparency. Also owns lineup-slot
// eligibility rules and the empty-slot-penalty / all-empty-is-zero rule.

export const FLEX_ELIGIBLE = ['RB', 'WR', 'TE']

// Maps a lineup slot to the position(s) allowed to fill it.
export const SLOT_ELIGIBILITY = {
  QB: ['QB'],
  RB1: ['RB'],
  RB2: ['RB'],
  WR1: ['WR'],
  WR2: ['WR'],
  TE: ['TE'],
  FLEX: FLEX_ELIGIBLE,
  DST: ['DST'],
  K: ['K'],
}

export function validateSlotEligibility(slotType, playerPosition) {
  const allowed = SLOT_ELIGIBILITY[slotType]
  return !!allowed && allowed.includes(playerPosition)
}

// ── Offense (QB / RB / WR / TE) ──────────────────────────────────────────

function calculateOffensePoints(stats, profile) {
  const breakdown = {}
  let points = 0

  breakdown.passingYards = (stats.passing_yards || 0) * profile.passingYardRate
  breakdown.passingTds = (stats.passing_tds || 0) * profile.passingTdPoints
  breakdown.interceptions = (stats.interceptions || 0) * profile.interceptionPoints
  breakdown.rushingYards = (stats.rushing_yards || 0) * profile.rushingYardRate
  breakdown.receivingYards = (stats.receiving_yards || 0) * profile.receivingYardRate
  breakdown.rushingReceivingTds = ((stats.rushing_tds || 0) + (stats.receiving_tds || 0)) * profile.touchdownPoints
  breakdown.receptions = (stats.receptions || 0) * profile.pprValue
  breakdown.fumblesLost = (stats.fumbles_lost || 0) * profile.fumbleLostPoints
  breakdown.twoPointConversions = (stats.two_point_conversions || 0) * profile.twoPointPoints

  // Optional bonuses computable from aggregate yardage (no per-play data for 40+ yd TDs in Phase 1).
  const bonusRules = profile.bonusRules || {}
  breakdown.rushRec100Bonus = 0
  if (bonusRules.rush_rec_100) {
    if ((stats.rushing_yards || 0) >= 100) breakdown.rushRec100Bonus += bonusRules.rush_rec_100
    if ((stats.receiving_yards || 0) >= 100) breakdown.rushRec100Bonus += bonusRules.rush_rec_100
  }
  breakdown.pass300Bonus = bonusRules.pass_300 && (stats.passing_yards || 0) >= 300 ? bonusRules.pass_300 : 0

  points = Object.values(breakdown).reduce((sum, v) => sum + v, 0)
  return { points, breakdown }
}

// ── Kicker ────────────────────────────────────────────────────────────────

function calculateKickerPoints(stats, profile) {
  const kicking = stats.kicking || {}
  const rules = profile.kickerRules || {}
  const breakdown = {
    fg0_39: (kicking.fg_0_39 || 0) * (rules.fg_0_39 ?? 0),
    fg40_49: (kicking.fg_40_49 || 0) * (rules.fg_40_49 ?? 0),
    fg50Plus: (kicking.fg_50_plus || 0) * (rules.fg_50_plus ?? 0),
    extraPoints: (kicking.xp_made || 0) * (rules.xp ?? 0),
    missedFieldGoals: (kicking.fg_missed || 0) * (rules.missed_fg ?? 0),
  }
  const points = Object.values(breakdown).reduce((sum, v) => sum + v, 0)
  return { points, breakdown }
}

// ── D/ST ──────────────────────────────────────────────────────────────────

function pointsAllowedTierValue(pointsAllowed, tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return 0
  const sorted = [...tiers].sort((a, b) => a.max - b.max)
  const tier = sorted.find((t) => pointsAllowed <= t.max)
  return tier ? tier.pts : sorted[sorted.length - 1].pts
}

function calculateDstPoints(stats, profile) {
  const dst = stats.dst || {}
  const rules = profile.dstRules || {}
  const breakdown = {
    sacks: (dst.sacks || 0) * (rules.sack ?? 0),
    interceptions: (dst.interceptions || 0) * (rules.interception ?? 0),
    fumbleRecoveries: (dst.fumble_recoveries || 0) * (rules.fumble_recovery ?? 0),
    safeties: (dst.safeties || 0) * (rules.safety ?? 0),
    blockedKicks: (dst.blocked_kicks || 0) * (rules.blocked_kick ?? 0),
    touchdowns: (dst.tds || 0) * (rules.td ?? 0),
    pointsAllowed: pointsAllowedTierValue(dst.points_allowed ?? 0, rules.points_allowed_tiers),
  }
  const points = Object.values(breakdown).reduce((sum, v) => sum + v, 0)
  return { points, breakdown }
}

/**
 * Calculate fantasy points for one player's weekly stat line under a
 * league's scoring profile. `stats` is a row from nfl_player_week_stats
 * (camelCase-mapped), `position` is the player's position, `profile` is
 * the league's scoring profile (camelCase-mapped nfl_scoring_profiles row).
 */
export function calculatePlayerScore(position, stats, profile) {
  if (!stats) return { points: 0, breakdown: {} }
  if (position === 'K') return calculateKickerPoints(stats, profile)
  if (position === 'DST') return calculateDstPoints(stats, profile)
  return calculateOffensePoints(stats, profile)
}

// ── Lineup totals ─────────────────────────────────────────────────────────

const EMPTY_SLOT_PENALTY = -4

/**
 * Sum a set of scored lineup slots into a weekly total.
 * `slots` is [{ isEmpty, slotPoints }, ...]. If every slot is empty, the
 * total is 0 (not the full stack of -4 penalties). Otherwise each empty
 * slot costs -4 and each filled slot contributes its calculated points.
 */
export function computeLineupTotal(slots) {
  const emptyCount = slots.filter((s) => s.isEmpty).length
  if (emptyCount === slots.length) {
    return { totalPoints: 0, emptySlotPenalty: 0 }
  }
  const emptySlotPenalty = emptyCount * EMPTY_SLOT_PENALTY
  const filledPoints = slots.filter((s) => !s.isEmpty).reduce((sum, s) => sum + (s.slotPoints || 0), 0)
  return { totalPoints: filledPoints + emptySlotPenalty, emptySlotPenalty }
}

/**
 * Weekly money bonus: points * moneyPerPoint, floored at $0 (never
 * subtracts money for a negative week).
 */
export function calculateWeeklyBonus(totalPoints, moneyPerPoint) {
  if (totalPoints <= 0) return 0
  return Math.round(totalPoints * moneyPerPoint)
}
