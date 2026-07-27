// Placeholder NFL schedule for the Fantasy Manager League.
//
// There is no real 2026 schedule data source wired into this app yet, so
// this generates a synthetic round-robin schedule (standard "circle
// method": fix one team, rotate the rest) purely so the UI has *some*
// opponent to show for lineup/bid decisions. It is NOT tied to real
// matchups — swap this file for a real schedule import later without
// touching any UI code (everything reads through getOpponent()).
//
// Byes are overlaid from each team's existing bye_week (src/data/nflPlayers.js)
// by blanking that team's slot for that week — the paired opponent that
// week just sees its own normal (synthetic) matchup, so the schedule isn't
// perfectly symmetric around byes. Acceptable for a placeholder; a real
// schedule wouldn't have that quirk.
import { NFL_TEAMS, TEAM_BYE_WEEKS } from './nflPlayers'

const WEEKS = 18

function generateRoundRobin(teamAbbrs) {
  const n = teamAbbrs.length
  const fixed = teamAbbrs[0]
  let rotating = teamAbbrs.slice(1)
  const rounds = []

  for (let r = 0; r < n - 1; r++) {
    const pairs = [[fixed, rotating[rotating.length - 1]]]
    for (let i = 0; i < (n - 2) / 2; i++) {
      pairs.push([rotating[i], rotating[rotating.length - 2 - i]])
    }
    rounds.push(pairs)
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, rotating.length - 1)]
  }
  return rounds
}

function buildSchedule() {
  const teamAbbrs = NFL_TEAMS.map((t) => t.abbr)
  const rounds = generateRoundRobin(teamAbbrs) // 31 rounds for 32 teams — plenty for our 18 weeks

  const schedule = Object.fromEntries(teamAbbrs.map((abbr) => [abbr, {}]))
  for (let week = 1; week <= WEEKS; week++) {
    for (const [a, b] of rounds[week - 1]) {
      schedule[a][week] = b
      schedule[b][week] = a
    }
  }

  for (const abbr of teamAbbrs) {
    const bye = TEAM_BYE_WEEKS[abbr]
    if (bye) schedule[abbr][bye] = null
  }

  return schedule
}

export const TEAM_SCHEDULE = buildSchedule()

/** Returns the opponent team abbreviation for a team+week, or null on a bye. */
export function getOpponent(teamAbbr, week) {
  return TEAM_SCHEDULE[teamAbbr]?.[week] ?? null
}
