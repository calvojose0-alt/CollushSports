// NFL team + player seed catalog for the Fantasy Manager League (Phase 1).
//
// Team metadata (name/abbreviation) is real and stable. Bye weeks are
// placeholders (round-robin across weeks 5–14) pending the commissioner
// importing the real season schedule. A modest set of well-known starters
// is filled in per team at QB/RB1/WR1/TE1; every other roster slot is a
// generated depth placeholder so the numbers work for any league size.
// This is a starting catalog, not a certified live roster feed — the
// commissioner/admin can rename, reposition, or correct any entry from the
// Players screen (status, injury, bye week, team) at any time.

export const NFL_TEAMS = [
  { abbr: 'ARI', name: 'Arizona Cardinals' },
  { abbr: 'ATL', name: 'Atlanta Falcons' },
  { abbr: 'BAL', name: 'Baltimore Ravens' },
  { abbr: 'BUF', name: 'Buffalo Bills' },
  { abbr: 'CAR', name: 'Carolina Panthers' },
  { abbr: 'CHI', name: 'Chicago Bears' },
  { abbr: 'CIN', name: 'Cincinnati Bengals' },
  { abbr: 'CLE', name: 'Cleveland Browns' },
  { abbr: 'DAL', name: 'Dallas Cowboys' },
  { abbr: 'DEN', name: 'Denver Broncos' },
  { abbr: 'DET', name: 'Detroit Lions' },
  { abbr: 'GB',  name: 'Green Bay Packers' },
  { abbr: 'HOU', name: 'Houston Texans' },
  { abbr: 'IND', name: 'Indianapolis Colts' },
  { abbr: 'JAX', name: 'Jacksonville Jaguars' },
  { abbr: 'KC',  name: 'Kansas City Chiefs' },
  { abbr: 'LAC', name: 'Los Angeles Chargers' },
  { abbr: 'LAR', name: 'Los Angeles Rams' },
  { abbr: 'LV',  name: 'Las Vegas Raiders' },
  { abbr: 'MIA', name: 'Miami Dolphins' },
  { abbr: 'MIN', name: 'Minnesota Vikings' },
  { abbr: 'NE',  name: 'New England Patriots' },
  { abbr: 'NO',  name: 'New Orleans Saints' },
  { abbr: 'NYG', name: 'New York Giants' },
  { abbr: 'NYJ', name: 'New York Jets' },
  { abbr: 'PHI', name: 'Philadelphia Eagles' },
  { abbr: 'PIT', name: 'Pittsburgh Steelers' },
  { abbr: 'SEA', name: 'Seattle Seahawks' },
  { abbr: 'SF',  name: 'San Francisco 49ers' },
  { abbr: 'TB',  name: 'Tampa Bay Buccaneers' },
  { abbr: 'TEN', name: 'Tennessee Titans' },
  { abbr: 'WAS', name: 'Washington Commanders' },
]

// Well-known starters (illustrative — verify/correct before a real season).
const STARTERS = {
  ARI: { QB: 'Kyler Murray', RB: 'James Conner', WR: 'Marvin Harrison Jr.' },
  ATL: { QB: 'Michael Penix Jr.', RB: 'Bijan Robinson', WR: 'Drake London' },
  BAL: { QB: 'Lamar Jackson', RB: 'Derrick Henry', WR: 'Zay Flowers' },
  BUF: { QB: 'Josh Allen', RB: 'James Cook', WR: 'Khalil Shakir' },
  CAR: { QB: 'Bryce Young', RB: 'Chuba Hubbard', WR: 'Xavier Legette' },
  CHI: { QB: 'Caleb Williams', RB: "D'Andre Swift", WR: 'DJ Moore' },
  CIN: { QB: 'Joe Burrow', RB: 'Chase Brown', WR: "Ja'Marr Chase" },
  CLE: { QB: 'Dillon Gabriel', RB: 'Jerome Ford', WR: 'Jerry Jeudy' },
  DAL: { QB: 'Dak Prescott', RB: 'Javonte Williams', WR: 'CeeDee Lamb' },
  DEN: { QB: 'Bo Nix', RB: 'Javonte Williams', WR: 'Courtland Sutton' },
  DET: { QB: 'Jared Goff', RB: 'Jahmyr Gibbs', WR: 'Amon-Ra St. Brown' },
  GB:  { QB: 'Jordan Love', RB: 'Josh Jacobs', WR: 'Jayden Reed' },
  HOU: { QB: 'C.J. Stroud', RB: 'Joe Mixon', WR: 'Nico Collins' },
  IND: { QB: 'Anthony Richardson', RB: 'Jonathan Taylor', WR: 'Michael Pittman Jr.' },
  JAX: { QB: 'Trevor Lawrence', RB: 'Travis Etienne Jr.', WR: 'Brian Thomas Jr.' },
  KC:  { QB: 'Patrick Mahomes', RB: 'Isiah Pacheco', WR: 'Rashee Rice', TE: 'Travis Kelce' },
  LAC: { QB: 'Justin Herbert', RB: 'J.K. Dobbins', WR: 'Ladd McConkey' },
  LAR: { QB: 'Matthew Stafford', RB: 'Kyren Williams', WR: 'Puka Nacua' },
  LV:  { QB: 'Geno Smith', RB: "Ashton Jeanty", WR: 'Jakobi Meyers' },
  MIA: { QB: 'Tua Tagovailoa', RB: "De'Von Achane", WR: 'Tyreek Hill' },
  MIN: { QB: 'J.J. McCarthy', RB: 'Aaron Jones', WR: 'Justin Jefferson' },
  NE:  { QB: 'Drake Maye', RB: 'Rhamondre Stevenson', WR: 'DeMario Douglas' },
  NO:  { QB: 'Spencer Rattler', RB: 'Alvin Kamara', WR: 'Chris Olave' },
  NYG: { QB: 'Russell Wilson', RB: 'Tyrone Tracy Jr.', WR: 'Malik Nabers' },
  NYJ: { QB: 'Justin Fields', RB: 'Breece Hall', WR: 'Garrett Wilson' },
  PHI: { QB: 'Jalen Hurts', RB: 'Saquon Barkley', WR: 'A.J. Brown' },
  PIT: { QB: 'Aaron Rodgers', RB: 'Najee Harris', WR: 'George Pickens' },
  SEA: { QB: 'Sam Darnold', RB: 'Kenneth Walker III', WR: 'Jaxon Smith-Njigba' },
  SF:  { QB: 'Brock Purdy', RB: 'Christian McCaffrey', WR: 'Deebo Samuel' },
  TB:  { QB: 'Baker Mayfield', RB: 'Bucky Irving', WR: 'Mike Evans' },
  TEN: { QB: 'Cam Ward', RB: 'Tony Pollard', WR: 'Calvin Ridley' },
  WAS: { QB: 'Jayden Daniels', RB: 'Brian Robinson Jr.', WR: 'Terry McLaurin' },
}

const POSITION_COUNTS = { QB: 2, RB: 4, WR: 5, TE: 2, K: 1 }

// Shared with src/data/nflSchedule.js so the placeholder schedule's bye
// weeks always match each player's bye_week field.
export const TEAM_BYE_WEEKS = Object.fromEntries(
  NFL_TEAMS.map((team, i) => [team.abbr, 5 + (i % 10)])
)

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function buildCatalog() {
  const players = []
  NFL_TEAMS.forEach((team) => {
    const byeWeek = TEAM_BYE_WEEKS[team.abbr]

    for (const [position, count] of Object.entries(POSITION_COUNTS)) {
      const starter = STARTERS[team.abbr]?.[position]
      for (let i = 0; i < count; i++) {
        const isNamedStarter = i === 0 && starter
        const displayName = isNamedStarter ? starter : `${team.abbr} ${position}${i + 1}`
        players.push({
          id: `${team.abbr.toLowerCase()}_${position.toLowerCase()}_${i + 1}_${slugify(displayName)}`,
          displayName,
          position,
          nflTeam: team.abbr,
          byeWeek,
          status: 'active',
          injuryStatus: null,
          activeFlag: true,
        })
      }
    }

    // D/ST — one entity per team
    players.push({
      id: `${team.abbr.toLowerCase()}_dst`,
      displayName: `${team.name} D/ST`,
      position: 'DST',
      nflTeam: team.abbr,
      byeWeek,
      status: 'active',
      injuryStatus: null,
      activeFlag: true,
    })
  })
  return players
}

export const NFL_PLAYERS = buildCatalog()
