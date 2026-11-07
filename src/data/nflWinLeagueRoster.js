// Pro Football Win League 2025–26 — Fixed Roster
//
// This league was drafted in real life, so the rosters are a fixed list rather
// than an in-app draft. Managers are display names (no app login required), and
// teams MAY be shared across managers (it's a selection pool, not an exclusive
// draft) — e.g. the Saints are held by three managers.
//
// Weekly results (Win/Tie/Loss per team) are entered by the admin and stored in
// the fwl_results table; standings are computed from this roster + those results.

// team ids are the uppercase NFL abbreviations used in NFL_WL_TEAMS.
export const FWL_ROSTER = [
  { id: 'luis-e',  manager: 'Luis E.', teams: ['LAR', 'MIN', 'NYG'] },
  { id: 'juan-a',  manager: 'Juan A.', teams: ['BUF', 'WAS', 'CAR'] },
  { id: 'oscar',   manager: 'Oscar',   teams: ['KC',  'IND', 'ATL'] },
  { id: 'collush', manager: 'Collush', teams: ['DAL', 'CHI', 'NO']  },
  { id: 'manuel',  manager: 'Manuel',  teams: ['PHI', 'PIT', 'CLE'] },
  { id: 'victor',  manager: 'Victor',  teams: ['SEA', 'JAX', 'ATL'] },
  { id: 'gabald',  manager: 'Gabald',  teams: ['LAC', 'TB',  'CAR'] },
  { id: 'andy',    manager: 'Andy',    teams: ['BAL', 'CIN', 'NYG'] },
  { id: 'lupa',    manager: 'Lupa',    teams: ['DET', 'GB',  'TEN'] },
  { id: 'ignacio', manager: 'Ignacio', teams: ['DEN', 'HOU', 'NO']  },
  { id: 'luisma',  manager: 'Luisma',  teams: ['NE',  'SF',  'NO']  },
]

// Distinct teams that appear on at least one roster (drives the admin results grid).
export const FWL_ROSTER_TEAMS = [...new Set(FWL_ROSTER.flatMap((r) => r.teams))]
