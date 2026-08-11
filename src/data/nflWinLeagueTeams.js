// Pro Football Win League 2025–26 — NFL Teams & Draft Board
//
// Mirrors the Soccer Win League data (wc2026Teams + wl2026Rankings) but with the
// 32 NFL franchises. Instead of flag emojis, each team carries a primary `color`
// and its abbreviation, rendered as a colored badge by <TeamLogo />.
//
// The ranking order below ONLY drives the draft-board tier grouping/order — it
// does NOT affect scoring (same as the soccer version).

// team_id is the uppercase NFL abbreviation (e.g. 'KC', 'PHI').
export const NFL_WL_TEAMS = {
  ARI: { id: 'ARI', abbr: 'ARI', name: 'Arizona Cardinals',     shortName: 'ARI', conference: 'NFC', division: 'West',  color: '#97233F' },
  ATL: { id: 'ATL', abbr: 'ATL', name: 'Atlanta Falcons',       shortName: 'ATL', conference: 'NFC', division: 'South', color: '#A71930' },
  BAL: { id: 'BAL', abbr: 'BAL', name: 'Baltimore Ravens',      shortName: 'BAL', conference: 'AFC', division: 'North', color: '#241773' },
  BUF: { id: 'BUF', abbr: 'BUF', name: 'Buffalo Bills',         shortName: 'BUF', conference: 'AFC', division: 'East',  color: '#00338D' },
  CAR: { id: 'CAR', abbr: 'CAR', name: 'Carolina Panthers',     shortName: 'CAR', conference: 'NFC', division: 'South', color: '#0085CA' },
  CHI: { id: 'CHI', abbr: 'CHI', name: 'Chicago Bears',         shortName: 'CHI', conference: 'NFC', division: 'North', color: '#0B162A' },
  CIN: { id: 'CIN', abbr: 'CIN', name: 'Cincinnati Bengals',    shortName: 'CIN', conference: 'AFC', division: 'North', color: '#FB4F14' },
  CLE: { id: 'CLE', abbr: 'CLE', name: 'Cleveland Browns',      shortName: 'CLE', conference: 'AFC', division: 'North', color: '#311D00' },
  DAL: { id: 'DAL', abbr: 'DAL', name: 'Dallas Cowboys',        shortName: 'DAL', conference: 'NFC', division: 'East',  color: '#003594' },
  DEN: { id: 'DEN', abbr: 'DEN', name: 'Denver Broncos',        shortName: 'DEN', conference: 'AFC', division: 'West',  color: '#FB4F14' },
  DET: { id: 'DET', abbr: 'DET', name: 'Detroit Lions',         shortName: 'DET', conference: 'NFC', division: 'North', color: '#0076B6' },
  GB:  { id: 'GB',  abbr: 'GB',  name: 'Green Bay Packers',     shortName: 'GB',  conference: 'NFC', division: 'North', color: '#203731' },
  HOU: { id: 'HOU', abbr: 'HOU', name: 'Houston Texans',        shortName: 'HOU', conference: 'AFC', division: 'South', color: '#03202F' },
  IND: { id: 'IND', abbr: 'IND', name: 'Indianapolis Colts',    shortName: 'IND', conference: 'AFC', division: 'South', color: '#002C5F' },
  JAX: { id: 'JAX', abbr: 'JAX', name: 'Jacksonville Jaguars',  shortName: 'JAX', conference: 'AFC', division: 'South', color: '#006778' },
  KC:  { id: 'KC',  abbr: 'KC',  name: 'Kansas City Chiefs',    shortName: 'KC',  conference: 'AFC', division: 'West',  color: '#E31837' },
  LAC: { id: 'LAC', abbr: 'LAC', name: 'Los Angeles Chargers',  shortName: 'LAC', conference: 'AFC', division: 'West',  color: '#0080C6' },
  LAR: { id: 'LAR', abbr: 'LAR', name: 'Los Angeles Rams',      shortName: 'LAR', conference: 'NFC', division: 'West',  color: '#003594' },
  LV:  { id: 'LV',  abbr: 'LV',  name: 'Las Vegas Raiders',     shortName: 'LV',  conference: 'AFC', division: 'West',  color: '#000000' },
  MIA: { id: 'MIA', abbr: 'MIA', name: 'Miami Dolphins',        shortName: 'MIA', conference: 'AFC', division: 'East',  color: '#008E97' },
  MIN: { id: 'MIN', abbr: 'MIN', name: 'Minnesota Vikings',     shortName: 'MIN', conference: 'NFC', division: 'North', color: '#4F2683' },
  NE:  { id: 'NE',  abbr: 'NE',  name: 'New England Patriots',  shortName: 'NE',  conference: 'AFC', division: 'East',  color: '#002244' },
  NO:  { id: 'NO',  abbr: 'NO',  name: 'New Orleans Saints',    shortName: 'NO',  conference: 'NFC', division: 'South', color: '#D3BC8D' },
  NYG: { id: 'NYG', abbr: 'NYG', name: 'New York Giants',       shortName: 'NYG', conference: 'NFC', division: 'East',  color: '#0B2265' },
  NYJ: { id: 'NYJ', abbr: 'NYJ', name: 'New York Jets',         shortName: 'NYJ', conference: 'AFC', division: 'East',  color: '#125740' },
  PHI: { id: 'PHI', abbr: 'PHI', name: 'Philadelphia Eagles',   shortName: 'PHI', conference: 'NFC', division: 'East',  color: '#004C54' },
  PIT: { id: 'PIT', abbr: 'PIT', name: 'Pittsburgh Steelers',   shortName: 'PIT', conference: 'AFC', division: 'North', color: '#FFB612' },
  SEA: { id: 'SEA', abbr: 'SEA', name: 'Seattle Seahawks',      shortName: 'SEA', conference: 'NFC', division: 'West',  color: '#69BE28' },
  SF:  { id: 'SF',  abbr: 'SF',  name: 'San Francisco 49ers',   shortName: 'SF',  conference: 'NFC', division: 'West',  color: '#AA0000' },
  TB:  { id: 'TB',  abbr: 'TB',  name: 'Tampa Bay Buccaneers',  shortName: 'TB',  conference: 'NFC', division: 'South', color: '#D50A0A' },
  TEN: { id: 'TEN', abbr: 'TEN', name: 'Tennessee Titans',      shortName: 'TEN', conference: 'AFC', division: 'South', color: '#0C2340' },
  WAS: { id: 'WAS', abbr: 'WAS', name: 'Washington Commanders', shortName: 'WAS', conference: 'NFC', division: 'East',  color: '#5A1414' },
}

// Draft-board order, best-to-worst (approx 2025–26 power ranking).
// Ordering affects ONLY the draft board grouping — not scoring.
export const FWL_RANKED_TEAMS = [
  // Tier 1 — Contenders
  'KC', 'PHI', 'BUF', 'BAL', 'SF', 'DET', 'CIN', 'DAL',
  // Tier 2 — Playoff Hopefuls
  'GB', 'HOU', 'MIA', 'LAR', 'MIN', 'PIT', 'LAC', 'TB',
  // Tier 3 — In the Mix
  'SEA', 'ATL', 'NYJ', 'CLE', 'IND', 'DEN', 'JAX', 'NO',
  // Tier 4 — Rebuilding
  'CHI', 'WAS', 'ARI', 'LV', 'TEN', 'NYG', 'CAR', 'NE',
]

// Regular-season match scoring: Win = 1, Tie = 0.5, Loss = 0.
export const FWL_MATCH_POINTS = { win: 1, tie: 0.5, loss: 0 }

// Total regular-season weeks.
export const FWL_WEEKS = 18

/**
 * Generate the snake draft order for N players × picksEach rounds.
 * Identical scheme to the Soccer Win League:
 *   Round 1: first (⌊N/2⌋−1) forward, then remaining reverse from the top
 *   Round 2: full reverse snake
 *   Round 3: middle-out balance
 */
export function generateDraftOrder(playerIds, picksEach = 3) {
  const n = playerIds.length
  const order = []
  for (let round = 0; round < picksEach; round++) {
    for (const idx of buildRoundIndices(n, round)) order.push(playerIds[idx])
  }
  return order
}

function buildRoundIndices(n, round) {
  if (round === 0) {
    const splitAt = Math.floor(n / 2) - 1
    const indices = []
    for (let i = 0; i < splitAt; i++)      indices.push(i)
    for (let i = n - 1; i >= splitAt; i--) indices.push(i)
    return indices
  }
  if (round === 1) return Array.from({ length: n }, (_, i) => n - 1 - i)
  if (round === 2) return buildMiddleOutIndices(n)
  return round % 2 === 0
    ? Array.from({ length: n }, (_, i) => i)
    : Array.from({ length: n }, (_, i) => n - 1 - i)
}

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
