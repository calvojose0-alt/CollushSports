// NFL Fantasy Manager League — random stat-line simulator (pure, no I/O).
// Generates a plausible-looking weekly stat line for a player by position,
// purely for exercising the scoring pipeline without hand-entering every
// player's numbers. Not a real projection model — just bounded randomness.

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function chance(p) {
  return Math.random() < p
}

function emptyLine() {
  return {
    passing_yards: 0,
    passing_tds: 0,
    interceptions: 0,
    rushing_yards: 0,
    rushing_tds: 0,
    receiving_yards: 0,
    receiving_tds: 0,
    receptions: 0,
    fumbles_lost: 0,
    two_point_conversions: 0,
    kicking: { fg_0_39: 0, fg_40_49: 0, fg_50_plus: 0, xp_made: 0, fg_missed: 0 },
    dst: { sacks: 0, interceptions: 0, fumble_recoveries: 0, safeties: 0, blocked_kicks: 0, tds: 0, points_allowed: 0 },
  }
}

export function generateRandomStatLine(position) {
  const line = emptyLine()

  switch (position) {
    case 'QB':
      line.passing_yards = randInt(140, 380)
      line.passing_tds = chance(0.15) ? randInt(3, 5) : randInt(0, 2)
      line.interceptions = chance(0.6) ? randInt(0, 1) : randInt(0, 3)
      line.rushing_yards = randInt(-2, 35)
      line.rushing_tds = chance(0.12) ? 1 : 0
      line.fumbles_lost = chance(0.08) ? 1 : 0
      break

    case 'RB':
      line.rushing_yards = randInt(5, 140)
      line.rushing_tds = chance(0.4) ? 1 : chance(0.08) ? 2 : 0
      line.receiving_yards = randInt(0, 45)
      line.receiving_tds = chance(0.1) ? 1 : 0
      line.receptions = randInt(0, 6)
      line.fumbles_lost = chance(0.08) ? 1 : 0
      line.two_point_conversions = chance(0.04) ? 1 : 0
      break

    case 'WR':
      line.receiving_yards = randInt(0, 140)
      line.receiving_tds = chance(0.35) ? 1 : chance(0.06) ? 2 : 0
      line.receptions = randInt(0, 10)
      line.rushing_yards = chance(0.1) ? randInt(0, 15) : 0
      line.fumbles_lost = chance(0.05) ? 1 : 0
      line.two_point_conversions = chance(0.04) ? 1 : 0
      break

    case 'TE':
      line.receiving_yards = randInt(0, 90)
      line.receiving_tds = chance(0.3) ? 1 : 0
      line.receptions = randInt(0, 8)
      line.fumbles_lost = chance(0.04) ? 1 : 0
      break

    case 'K':
      line.kicking = {
        fg_0_39: randInt(0, 3),
        fg_40_49: randInt(0, 2),
        fg_50_plus: chance(0.3) ? 1 : 0,
        xp_made: randInt(0, 4),
        fg_missed: chance(0.2) ? 1 : 0,
      }
      break

    case 'DST':
      line.dst = {
        sacks: randInt(0, 5),
        interceptions: randInt(0, 3),
        fumble_recoveries: randInt(0, 2),
        safeties: chance(0.05) ? 1 : 0,
        blocked_kicks: chance(0.1) ? 1 : 0,
        tds: chance(0.15) ? 1 : 0,
        points_allowed: randInt(0, 35),
      }
      break

    default:
      break
  }

  return line
}
