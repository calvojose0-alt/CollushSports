// 2026 FIFA World Cup – Teams & Groups
// 48 teams across 12 groups (A–L), 4 teams per group.
// Note: Actual group draw occurred Dec 2025. Update team/group assignments
// in this file and wc2026Schedule.js if needed before the tournament.

export const WC_TEAMS = {
  // ── Group A ────────────────────────────────────────────────────────
  usa:         { id: 'usa',         name: 'United States',  shortName: 'USA', flag: '🇺🇸', group: 'A', confed: 'CONCACAF', color: '#002868' },
  jamaica:     { id: 'jamaica',     name: 'Jamaica',        shortName: 'JAM', flag: '🇯🇲', group: 'A', confed: 'CONCACAF', color: '#FFD700' },
  uruguay:     { id: 'uruguay',     name: 'Uruguay',        shortName: 'URU', flag: '🇺🇾', group: 'A', confed: 'CONMEBOL', color: '#75AADB' },
  algeria:     { id: 'algeria',     name: 'Algeria',        shortName: 'ALG', flag: '🇩🇿', group: 'A', confed: 'CAF',      color: '#006233' },

  // ── Group B ────────────────────────────────────────────────────────
  mexico:      { id: 'mexico',      name: 'Mexico',         shortName: 'MEX', flag: '🇲🇽', group: 'B', confed: 'CONCACAF', color: '#006847' },
  honduras:    { id: 'honduras',    name: 'Honduras',       shortName: 'HON', flag: '🇭🇳', group: 'B', confed: 'CONCACAF', color: '#0073CF' },
  colombia:    { id: 'colombia',    name: 'Colombia',       shortName: 'COL', flag: '🇨🇴', group: 'B', confed: 'CONMEBOL', color: '#FCD116' },
  senegal:     { id: 'senegal',     name: 'Senegal',        shortName: 'SEN', flag: '🇸🇳', group: 'B', confed: 'CAF',      color: '#00853F' },

  // ── Group C ────────────────────────────────────────────────────────
  canada:      { id: 'canada',      name: 'Canada',         shortName: 'CAN', flag: '🇨🇦', group: 'C', confed: 'CONCACAF', color: '#FF0000' },
  panama:      { id: 'panama',      name: 'Panama',         shortName: 'PAN', flag: '🇵🇦', group: 'C', confed: 'CONCACAF', color: '#005093' },
  chile:       { id: 'chile',       name: 'Chile',          shortName: 'CHI', flag: '🇨🇱', group: 'C', confed: 'CONMEBOL', color: '#D52B1E' },
  nigeria:     { id: 'nigeria',     name: 'Nigeria',        shortName: 'NGA', flag: '🇳🇬', group: 'C', confed: 'CAF',      color: '#008751' },

  // ── Group D ────────────────────────────────────────────────────────
  spain:       { id: 'spain',       name: 'Spain',          shortName: 'ESP', flag: '🇪🇸', group: 'D', confed: 'UEFA',     color: '#AA151B' },
  morocco:     { id: 'morocco',     name: 'Morocco',        shortName: 'MAR', flag: '🇲🇦', group: 'D', confed: 'CAF',      color: '#C1272D' },
  ecuador:     { id: 'ecuador',     name: 'Ecuador',        shortName: 'ECU', flag: '🇪🇨', group: 'D', confed: 'CONMEBOL', color: '#FFD100' },
  japan:       { id: 'japan',       name: 'Japan',          shortName: 'JPN', flag: '🇯🇵', group: 'D', confed: 'AFC',      color: '#BC002D' },

  // ── Group E ────────────────────────────────────────────────────────
  england:     { id: 'england',     name: 'England',        shortName: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'E', confed: 'UEFA',     color: '#003078' },
  ivorycoast:  { id: 'ivorycoast',  name: 'Ivory Coast',    shortName: 'CIV', flag: '🇨🇮', group: 'E', confed: 'CAF',      color: '#F77F00' },
  paraguay:    { id: 'paraguay',    name: 'Paraguay',       shortName: 'PAR', flag: '🇵🇾', group: 'E', confed: 'CONMEBOL', color: '#0038A8' },
  australia:   { id: 'australia',   name: 'Australia',      shortName: 'AUS', flag: '🇦🇺', group: 'E', confed: 'AFC',      color: '#00843D' },

  // ── Group F ────────────────────────────────────────────────────────
  france:      { id: 'france',      name: 'France',         shortName: 'FRA', flag: '🇫🇷', group: 'F', confed: 'UEFA',     color: '#003189' },
  egypt:       { id: 'egypt',       name: 'Egypt',          shortName: 'EGY', flag: '🇪🇬', group: 'F', confed: 'CAF',      color: '#CE1126' },
  venezuela:   { id: 'venezuela',   name: 'Venezuela',      shortName: 'VEN', flag: '🇻🇪', group: 'F', confed: 'CONMEBOL', color: '#CF142B' },
  southkorea:  { id: 'southkorea',  name: 'South Korea',    shortName: 'KOR', flag: '🇰🇷', group: 'F', confed: 'AFC',      color: '#003478' },

  // ── Group G ────────────────────────────────────────────────────────
  germany:     { id: 'germany',     name: 'Germany',        shortName: 'GER', flag: '🇩🇪', group: 'G', confed: 'UEFA',     color: '#000000' },
  cameroon:    { id: 'cameroon',    name: 'Cameroon',       shortName: 'CMR', flag: '🇨🇲', group: 'G', confed: 'CAF',      color: '#007A3D' },
  peru:        { id: 'peru',        name: 'Peru',           shortName: 'PER', flag: '🇵🇪', group: 'G', confed: 'CONMEBOL', color: '#D91023' },
  jordan:      { id: 'jordan',      name: 'Jordan',         shortName: 'JOR', flag: '🇯🇴', group: 'G', confed: 'AFC',      color: '#007A3D' },

  // ── Group H ────────────────────────────────────────────────────────
  brazil:      { id: 'brazil',      name: 'Brazil',         shortName: 'BRA', flag: '🇧🇷', group: 'H', confed: 'CONMEBOL', color: '#009C3B' },
  switzerland: { id: 'switzerland', name: 'Switzerland',    shortName: 'SUI', flag: '🇨🇭', group: 'H', confed: 'UEFA',     color: '#FF0000' },
  saudiarabia: { id: 'saudiarabia', name: 'Saudi Arabia',   shortName: 'KSA', flag: '🇸🇦', group: 'H', confed: 'AFC',      color: '#006C35' },
  serbia:      { id: 'serbia',      name: 'Serbia',         shortName: 'SRB', flag: '🇷🇸', group: 'H', confed: 'UEFA',     color: '#C6363C' },

  // ── Group I ────────────────────────────────────────────────────────
  argentina:   { id: 'argentina',   name: 'Argentina',      shortName: 'ARG', flag: '🇦🇷', group: 'I', confed: 'CONMEBOL', color: '#74ACDF' },
  denmark:     { id: 'denmark',     name: 'Denmark',        shortName: 'DEN', flag: '🇩🇰', group: 'I', confed: 'UEFA',     color: '#C60C30' },
  southafrica: { id: 'southafrica', name: 'South Africa',   shortName: 'RSA', flag: '🇿🇦', group: 'I', confed: 'CAF',      color: '#007749' },
  iran:        { id: 'iran',        name: 'Iran',           shortName: 'IRN', flag: '🇮🇷', group: 'I', confed: 'AFC',      color: '#239F40' },

  // ── Group J ────────────────────────────────────────────────────────
  portugal:    { id: 'portugal',    name: 'Portugal',       shortName: 'POR', flag: '🇵🇹', group: 'J', confed: 'UEFA',     color: '#006600' },
  netherlands: { id: 'netherlands', name: 'Netherlands',    shortName: 'NED', flag: '🇳🇱', group: 'J', confed: 'UEFA',     color: '#FF6600' },
  tunisia:     { id: 'tunisia',     name: 'Tunisia',        shortName: 'TUN', flag: '🇹🇳', group: 'J', confed: 'CAF',      color: '#E70013' },
  newzealand:  { id: 'newzealand',  name: 'New Zealand',    shortName: 'NZL', flag: '🇳🇿', group: 'J', confed: 'OFC',      color: '#00247D' },

  // ── Group K ────────────────────────────────────────────────────────
  croatia:     { id: 'croatia',     name: 'Croatia',        shortName: 'CRO', flag: '🇭🇷', group: 'K', confed: 'UEFA',     color: '#FF0000' },
  belgium:     { id: 'belgium',     name: 'Belgium',        shortName: 'BEL', flag: '🇧🇪', group: 'K', confed: 'UEFA',     color: '#EF3340' },
  qatar:       { id: 'qatar',       name: 'Qatar',          shortName: 'QAT', flag: '🇶🇦', group: 'K', confed: 'AFC',      color: '#8D1B3D' },
  uzbekistan:  { id: 'uzbekistan',  name: 'Uzbekistan',     shortName: 'UZB', flag: '🇺🇿', group: 'K', confed: 'AFC',      color: '#1EB53A' },

  // ── Group L ────────────────────────────────────────────────────────
  italy:       { id: 'italy',       name: 'Italy',          shortName: 'ITA', flag: '🇮🇹', group: 'L', confed: 'UEFA',     color: '#003087' },
  turkey:      { id: 'turkey',      name: 'Turkey',         shortName: 'TUR', flag: '🇹🇷', group: 'L', confed: 'UEFA',     color: '#E30A17' },
  poland:      { id: 'poland',      name: 'Poland',         shortName: 'POL', flag: '🇵🇱', group: 'L', confed: 'UEFA',     color: '#DC143C' },
  austria:     { id: 'austria',     name: 'Austria',        shortName: 'AUT', flag: '🇦🇹', group: 'L', confed: 'UEFA',     color: '#ED2939' },
}

// Groups map: letter → [teamId, teamId, teamId, teamId]  (order = seeding 1–4)
export const WC_GROUPS = {
  A: ['usa',      'jamaica',    'uruguay',    'algeria'],
  B: ['mexico',   'honduras',   'colombia',   'senegal'],
  C: ['canada',   'panama',     'chile',      'nigeria'],
  D: ['spain',    'morocco',    'ecuador',    'japan'],
  E: ['england',  'ivorycoast', 'paraguay',   'australia'],
  F: ['france',   'egypt',      'venezuela',  'southkorea'],
  G: ['germany',  'cameroon',   'peru',       'jordan'],
  H: ['brazil',   'switzerland','saudiarabia','serbia'],
  I: ['argentina','denmark',    'southafrica','iran'],
  J: ['portugal', 'netherlands','tunisia',    'newzealand'],
  K: ['croatia',  'belgium',    'qatar',      'uzbekistan'],
  L: ['italy',    'turkey',     'poland',     'austria'],
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
