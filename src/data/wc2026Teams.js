// 2026 FIFA World Cup – Teams & Groups
// 48 teams across 12 groups (A–L), 4 teams per group.
// Draw held December 5, 2025 at the Kennedy Center, Washington D.C.

export const WC_TEAMS = {
  // ── Group A ────────────────────────────────────────────────────────
  mexico:       { id: 'mexico',       name: 'Mexico',              shortName: 'MEX', flag: '🇲🇽', group: 'A', confed: 'CONCACAF', color: '#006847' },
  southkorea:   { id: 'southkorea',   name: 'South Korea',         shortName: 'KOR', flag: '🇰🇷', group: 'A', confed: 'AFC',      color: '#003478' },
  southafrica:  { id: 'southafrica',  name: 'South Africa',        shortName: 'RSA', flag: '🇿🇦', group: 'A', confed: 'CAF',      color: '#007749' },
  czechrepublic:{ id: 'czechrepublic',name: 'Czech Republic',      shortName: 'CZE', flag: '🇨🇿', group: 'A', confed: 'UEFA',     color: '#D7141A' },

  // ── Group B ────────────────────────────────────────────────────────
  canada:       { id: 'canada',       name: 'Canada',              shortName: 'CAN', flag: '🇨🇦', group: 'B', confed: 'CONCACAF', color: '#FF0000' },
  switzerland:  { id: 'switzerland',  name: 'Switzerland',         shortName: 'SUI', flag: '🇨🇭', group: 'B', confed: 'UEFA',     color: '#FF0000' },
  qatar:        { id: 'qatar',        name: 'Qatar',               shortName: 'QAT', flag: '🇶🇦', group: 'B', confed: 'AFC',      color: '#8D1B3D' },
  bosnia:       { id: 'bosnia',       name: 'Bosnia & Herzegovina',shortName: 'BIH', flag: '🇧🇦', group: 'B', confed: 'UEFA',     color: '#003DA5' },

  // ── Group C ────────────────────────────────────────────────────────
  brazil:       { id: 'brazil',       name: 'Brazil',              shortName: 'BRA', flag: '🇧🇷', group: 'C', confed: 'CONMEBOL', color: '#009C3B' },
  morocco:      { id: 'morocco',      name: 'Morocco',             shortName: 'MAR', flag: '🇲🇦', group: 'C', confed: 'CAF',      color: '#C1272D' },
  scotland:     { id: 'scotland',     name: 'Scotland',            shortName: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', confed: 'UEFA',     color: '#005EB8' },
  haiti:        { id: 'haiti',        name: 'Haiti',               shortName: 'HAI', flag: '🇭🇹', group: 'C', confed: 'CONCACAF', color: '#00209F' },

  // ── Group D ────────────────────────────────────────────────────────
  usa:          { id: 'usa',          name: 'United States',       shortName: 'USA', flag: '🇺🇸', group: 'D', confed: 'CONCACAF', color: '#002868' },
  paraguay:     { id: 'paraguay',     name: 'Paraguay',            shortName: 'PAR', flag: '🇵🇾', group: 'D', confed: 'CONMEBOL', color: '#0038A8' },
  australia:    { id: 'australia',    name: 'Australia',           shortName: 'AUS', flag: '🇦🇺', group: 'D', confed: 'AFC',      color: '#00843D' },
  turkey:       { id: 'turkey',       name: 'Türkiye',             shortName: 'TUR', flag: '🇹🇷', group: 'D', confed: 'UEFA',     color: '#E30A17' },

  // ── Group E ────────────────────────────────────────────────────────
  germany:      { id: 'germany',      name: 'Germany',             shortName: 'GER', flag: '🇩🇪', group: 'E', confed: 'UEFA',     color: '#000000' },
  ecuador:      { id: 'ecuador',      name: 'Ecuador',             shortName: 'ECU', flag: '🇪🇨', group: 'E', confed: 'CONMEBOL', color: '#FFD100' },
  ivorycoast:   { id: 'ivorycoast',   name: 'Ivory Coast',         shortName: 'CIV', flag: '🇨🇮', group: 'E', confed: 'CAF',      color: '#F77F00' },
  curacao:      { id: 'curacao',      name: 'Curaçao',             shortName: 'CUW', flag: '🇨🇼', group: 'E', confed: 'CONCACAF', color: '#002B7F' },

  // ── Group F ────────────────────────────────────────────────────────
  netherlands:  { id: 'netherlands',  name: 'Netherlands',         shortName: 'NED', flag: '🇳🇱', group: 'F', confed: 'UEFA',     color: '#FF6600' },
  japan:        { id: 'japan',        name: 'Japan',               shortName: 'JPN', flag: '🇯🇵', group: 'F', confed: 'AFC',      color: '#BC002D' },
  sweden:       { id: 'sweden',       name: 'Sweden',              shortName: 'SWE', flag: '🇸🇪', group: 'F', confed: 'UEFA',     color: '#006AA7' },
  tunisia:      { id: 'tunisia',      name: 'Tunisia',             shortName: 'TUN', flag: '🇹🇳', group: 'F', confed: 'CAF',      color: '#E70013' },

  // ── Group G ────────────────────────────────────────────────────────
  belgium:      { id: 'belgium',      name: 'Belgium',             shortName: 'BEL', flag: '🇧🇪', group: 'G', confed: 'UEFA',     color: '#EF3340' },
  iran:         { id: 'iran',         name: 'Iran',                shortName: 'IRN', flag: '🇮🇷', group: 'G', confed: 'AFC',      color: '#239F40' },
  egypt:        { id: 'egypt',        name: 'Egypt',               shortName: 'EGY', flag: '🇪🇬', group: 'G', confed: 'CAF',      color: '#CE1126' },
  newzealand:   { id: 'newzealand',   name: 'New Zealand',         shortName: 'NZL', flag: '🇳🇿', group: 'G', confed: 'OFC',      color: '#00247D' },

  // ── Group H ────────────────────────────────────────────────────────
  spain:        { id: 'spain',        name: 'Spain',               shortName: 'ESP', flag: '🇪🇸', group: 'H', confed: 'UEFA',     color: '#AA151B' },
  uruguay:      { id: 'uruguay',      name: 'Uruguay',             shortName: 'URU', flag: '🇺🇾', group: 'H', confed: 'CONMEBOL', color: '#75AADB' },
  saudiarabia:  { id: 'saudiarabia',  name: 'Saudi Arabia',        shortName: 'KSA', flag: '🇸🇦', group: 'H', confed: 'AFC',      color: '#006C35' },
  capeverde:    { id: 'capeverde',    name: 'Cape Verde',          shortName: 'CPV', flag: '🇨🇻', group: 'H', confed: 'CAF',      color: '#003893' },

  // ── Group I ────────────────────────────────────────────────────────
  france:       { id: 'france',       name: 'France',              shortName: 'FRA', flag: '🇫🇷', group: 'I', confed: 'UEFA',     color: '#003189' },
  senegal:      { id: 'senegal',      name: 'Senegal',             shortName: 'SEN', flag: '🇸🇳', group: 'I', confed: 'CAF',      color: '#00853F' },
  norway:       { id: 'norway',       name: 'Norway',              shortName: 'NOR', flag: '🇳🇴', group: 'I', confed: 'UEFA',     color: '#EF2B2D' },
  iraq:         { id: 'iraq',         name: 'Iraq',                shortName: 'IRQ', flag: '🇮🇶', group: 'I', confed: 'AFC',      color: '#007A3D' },

  // ── Group J ────────────────────────────────────────────────────────
  argentina:    { id: 'argentina',    name: 'Argentina',           shortName: 'ARG', flag: '🇦🇷', group: 'J', confed: 'CONMEBOL', color: '#74ACDF' },
  austria:      { id: 'austria',      name: 'Austria',             shortName: 'AUT', flag: '🇦🇹', group: 'J', confed: 'UEFA',     color: '#ED2939' },
  algeria:      { id: 'algeria',      name: 'Algeria',             shortName: 'ALG', flag: '🇩🇿', group: 'J', confed: 'CAF',      color: '#006233' },
  jordan:       { id: 'jordan',       name: 'Jordan',              shortName: 'JOR', flag: '🇯🇴', group: 'J', confed: 'AFC',      color: '#007A3D' },

  // ── Group K ────────────────────────────────────────────────────────
  portugal:     { id: 'portugal',     name: 'Portugal',            shortName: 'POR', flag: '🇵🇹', group: 'K', confed: 'UEFA',     color: '#006600' },
  colombia:     { id: 'colombia',     name: 'Colombia',            shortName: 'COL', flag: '🇨🇴', group: 'K', confed: 'CONMEBOL', color: '#FCD116' },
  uzbekistan:   { id: 'uzbekistan',   name: 'Uzbekistan',          shortName: 'UZB', flag: '🇺🇿', group: 'K', confed: 'AFC',      color: '#1EB53A' },
  drcongo:      { id: 'drcongo',      name: 'DR Congo',            shortName: 'COD', flag: '🇨🇩', group: 'K', confed: 'CAF',      color: '#007FFF' },

  // ── Group L ────────────────────────────────────────────────────────
  england:      { id: 'england',      name: 'England',             shortName: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', confed: 'UEFA',     color: '#003078' },
  croatia:      { id: 'croatia',      name: 'Croatia',             shortName: 'CRO', flag: '🇭🇷', group: 'L', confed: 'UEFA',     color: '#FF0000' },
  panama:       { id: 'panama',       name: 'Panama',              shortName: 'PAN', flag: '🇵🇦', group: 'L', confed: 'CONCACAF', color: '#005093' },
  ghana:        { id: 'ghana',        name: 'Ghana',               shortName: 'GHA', flag: '🇬🇭', group: 'L', confed: 'CAF',      color: '#006B3F' },
}

// Groups map: letter → [teamId, teamId, teamId, teamId]  (order = seeding 1–4)
export const WC_GROUPS = {
  A: ['mexico',      'southafrica', 'southkorea',  'czechrepublic'],
  B: ['canada',      'bosnia',      'qatar',       'switzerland'],
  C: ['brazil',      'morocco',     'haiti',       'scotland'],
  D: ['usa',         'paraguay',    'australia',   'turkey'],
  E: ['germany',     'curacao',     'ivorycoast',  'ecuador'],
  F: ['netherlands', 'japan',       'sweden',      'tunisia'],
  G: ['belgium',     'egypt',       'iran',        'newzealand'],
  H: ['spain',       'capeverde',   'saudiarabia', 'uruguay'],
  I: ['france',      'senegal',     'iraq',        'norway'],
  J: ['argentina',   'algeria',     'austria',     'jordan'],
  K: ['portugal',    'drcongo',     'uzbekistan',  'colombia'],
  L: ['england',     'croatia',     'ghana',       'panama'],
}

export const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// ── Scoring constants ──────────────────────────────────────────────────────────
export const SCORING = {
  GROUP_EXACT_SCORE:    5,
  GROUP_CORRECT_OUTCOME: 3,
  PLAYOFF_R32:    5,
  PLAYOFF_R16:    8,
  PLAYOFF_QF:    10,
  PLAYOFF_SF:    15,
  PLAYOFF_WINNER: 25,
}

// Pick lock: 1 hour before first match (June 11, 2026 ~8PM ET → 23:00 UTC)
export const PICK_LOCK_TIME = new Date('2026-06-11T23:00:00Z')

export const PLAYOFF_ROUNDS = [
  { id: 'r32',    label: 'Round of 32',   shortLabel: 'R32', teamsNeeded: 32, points: SCORING.PLAYOFF_R32    },
  { id: 'r16',    label: 'Round of 16',   shortLabel: 'R16', teamsNeeded: 16, points: SCORING.PLAYOFF_R16    },
  { id: 'qf',     label: 'Quarterfinals', shortLabel: 'QF',  teamsNeeded: 8,  points: SCORING.PLAYOFF_QF     },
  { id: 'sf',     label: 'Semifinals',    shortLabel: 'SF',  teamsNeeded: 4,  points: SCORING.PLAYOFF_SF     },
  { id: 'winner', label: 'Champion',      shortLabel: 'WIN', teamsNeeded: 1,  points: SCORING.PLAYOFF_WINNER },
]

export function getTeam(id) {
  return WC_TEAMS[id] || null
}

export function getGroupTeams(group) {
  return (WC_GROUPS[group] || []).map((id) => WC_TEAMS[id]).filter(Boolean)
}

export function isPicksLocked() {
  return new Date() >= PICK_LOCK_TIME
}
