// 2026 FIFA World Cup – Full Match Schedule
// Group stage: 72 matches (12 groups × 6 matches each)
// Knockout: 63 matches (R32 × 16, R16 × 8, QF × 4, SF × 2, 3rd × 1, Final × 1)
//
// Match IDs: gs_{group}{n}  (e.g. gs_A1) for group stage
//            ko_{round}_{n}  (e.g. ko_r32_1) for knockouts
//
// Dates are approximate; the official FIFA schedule will be confirmed in 2026.
// Venue format: "Stadium Name, City, State/Country"

import { WC_GROUPS } from './wc2026Teams'

// ── Helper: generate 6 group matches from 4 team IDs ─────────────────────────
// Matchday assignments (FIFA standard round-robin pairing):
//   MD1: T1 vs T2, T3 vs T4
//   MD2: T1 vs T3, T2 vs T4
//   MD3: T1 vs T4, T2 vs T3
function buildGroupMatches(group, dates, venues, times) {
  const [t1, t2, t3, t4] = WC_GROUPS[group]
  return [
    { id: `gs_${group}1`, group, matchday: 1, homeTeam: t1, awayTeam: t2, date: dates[0], venue: venues[0], time: times[0] },
    { id: `gs_${group}2`, group, matchday: 1, homeTeam: t3, awayTeam: t4, date: dates[1], venue: venues[1], time: times[1] },
    { id: `gs_${group}3`, group, matchday: 2, homeTeam: t1, awayTeam: t3, date: dates[2], venue: venues[2], time: times[2] },
    { id: `gs_${group}4`, group, matchday: 2, homeTeam: t2, awayTeam: t4, date: dates[3], venue: venues[3], time: times[3] },
    { id: `gs_${group}5`, group, matchday: 3, homeTeam: t1, awayTeam: t4, date: dates[4], venue: venues[4], time: times[4] },
    { id: `gs_${group}6`, group, matchday: 3, homeTeam: t2, awayTeam: t3, date: dates[5], venue: venues[5], time: times[5] },
  ]
}

// ── Group Stage Matches (72 total) ────────────────────────────────────────────
// Team order in WC_GROUPS determines matchups:
//   MD1: t1 vs t2, t3 vs t4 | MD2: t1 vs t3, t2 vs t4 | MD3: t1 vs t4, t2 vs t3
// dates/venues/times arrays follow the same [idx0..idx5] order as buildGroupMatches output
export const GROUP_MATCHES = [
  // Group A: mexico(t1) vs southafrica(t2), southkorea(t3) vs czechrepublic(t4)
  ...buildGroupMatches('A',
    ['2026-06-11','2026-06-11','2026-06-18','2026-06-18','2026-06-24','2026-06-24'],
    ['Estadio Azteca, Mexico City, Mexico','Estadio Akron, Zapopan, Mexico','Estadio Akron, Zapopan, Mexico','Mercedes-Benz Stadium, Atlanta, GA','Estadio Azteca, Mexico City, Mexico','Estadio BBVA, Monterrey, Mexico'],
    ['3:00 PM ET','10:00 PM ET','9:00 PM ET','12:00 PM ET','9:00 PM ET','9:00 PM ET']),

  // Group B: canada(t1) vs bosnia(t2), qatar(t3) vs switzerland(t4)
  ...buildGroupMatches('B',
    ['2026-06-12','2026-06-13','2026-06-18','2026-06-18','2026-06-24','2026-06-24'],
    ['BMO Field, Toronto, Canada',"Levi's Stadium, Santa Clara, CA",'BC Place, Vancouver, Canada','SoFi Stadium, Inglewood, CA','BC Place, Vancouver, Canada','Lumen Field, Seattle, WA'],
    ['3:00 PM ET','3:00 PM ET','6:00 PM ET','3:00 PM ET','3:00 PM ET','3:00 PM ET']),

  // Group C: brazil(t1) vs morocco(t2), haiti(t3) vs scotland(t4)
  ...buildGroupMatches('C',
    ['2026-06-13','2026-06-13','2026-06-19','2026-06-19','2026-06-24','2026-06-24'],
    ['MetLife Stadium, East Rutherford, NJ','Gillette Stadium, Foxborough, MA','Lincoln Financial Field, Philadelphia, PA','Gillette Stadium, Foxborough, MA','Hard Rock Stadium, Miami Gardens, FL','Mercedes-Benz Stadium, Atlanta, GA'],
    ['6:00 PM ET','9:00 PM ET','9:00 PM ET','6:00 PM ET','6:00 PM ET','6:00 PM ET']),

  // Group D: usa(t1) vs paraguay(t2), australia(t3) vs turkey(t4)
  ...buildGroupMatches('D',
    ['2026-06-12','2026-06-13','2026-06-19','2026-06-20','2026-06-25','2026-06-25'],
    ['SoFi Stadium, Inglewood, CA','BC Place, Vancouver, Canada','Lumen Field, Seattle, WA',"Levi's Stadium, Santa Clara, CA",'SoFi Stadium, Inglewood, CA',"Levi's Stadium, Santa Clara, CA"],
    ['9:00 PM ET','12:00 AM ET','3:00 PM ET','12:00 AM ET','10:00 PM ET','10:00 PM ET']),

  // Group E: germany(t1) vs curacao(t2), ivorycoast(t3) vs ecuador(t4)
  ...buildGroupMatches('E',
    ['2026-06-14','2026-06-14','2026-06-20','2026-06-20','2026-06-25','2026-06-25'],
    ['NRG Stadium, Houston, TX','Lincoln Financial Field, Philadelphia, PA','BMO Field, Toronto, Canada','Arrowhead Stadium, Kansas City, MO','MetLife Stadium, East Rutherford, NJ','Lincoln Financial Field, Philadelphia, PA'],
    ['1:00 PM ET','7:00 PM ET','4:00 PM ET','8:00 PM ET','4:00 PM ET','4:00 PM ET']),

  // Group F: netherlands(t1) vs japan(t2), sweden(t3) vs tunisia(t4)
  ...buildGroupMatches('F',
    ['2026-06-14','2026-06-14','2026-06-20','2026-06-22','2026-06-25','2026-06-25'],
    ['AT&T Stadium, Arlington, TX','Estadio BBVA, Monterrey, Mexico','NRG Stadium, Houston, TX','Estadio BBVA, Monterrey, Mexico','Arrowhead Stadium, Kansas City, MO','AT&T Stadium, Arlington, TX'],
    ['4:00 PM ET','10:00 PM ET','1:00 PM ET','12:00 AM ET','7:00 PM ET','7:00 PM ET']),

  // Group G: belgium(t1) vs egypt(t2), iran(t3) vs newzealand(t4)
  ...buildGroupMatches('G',
    ['2026-06-15','2026-06-15','2026-06-21','2026-06-21','2026-06-26','2026-06-26'],
    ['Lumen Field, Seattle, WA','SoFi Stadium, Inglewood, CA','SoFi Stadium, Inglewood, CA','BC Place, Vancouver, Canada','BC Place, Vancouver, Canada','Lumen Field, Seattle, WA'],
    ['3:00 PM ET','9:00 PM ET','3:00 PM ET','9:00 PM ET','11:00 PM ET','11:00 PM ET']),

  // Group H: spain(t1) vs capeverde(t2), saudiarabia(t3) vs uruguay(t4)
  ...buildGroupMatches('H',
    ['2026-06-15','2026-06-15','2026-06-21','2026-06-21','2026-06-26','2026-06-26'],
    ['Mercedes-Benz Stadium, Atlanta, GA','Hard Rock Stadium, Miami Gardens, FL','Mercedes-Benz Stadium, Atlanta, GA','Hard Rock Stadium, Miami Gardens, FL','Estadio Akron, Zapopan, Mexico','NRG Stadium, Houston, TX'],
    ['12:00 PM ET','6:00 PM ET','12:00 PM ET','6:00 PM ET','8:00 PM ET','8:00 PM ET']),

  // Group I: france(t1) vs senegal(t2), iraq(t3) vs norway(t4)
  ...buildGroupMatches('I',
    ['2026-06-16','2026-06-16','2026-06-22','2026-06-22','2026-06-26','2026-06-26'],
    ['MetLife Stadium, East Rutherford, NJ','Gillette Stadium, Foxborough, MA','Lincoln Financial Field, Philadelphia, PA','MetLife Stadium, East Rutherford, NJ','Gillette Stadium, Foxborough, MA','BMO Field, Toronto, Canada'],
    ['3:00 PM ET','6:00 PM ET','5:00 PM ET','8:00 PM ET','3:00 PM ET','3:00 PM ET']),

  // Group J: argentina(t1) vs algeria(t2), austria(t3) vs jordan(t4)
  ...buildGroupMatches('J',
    ['2026-06-16','2026-06-17','2026-06-22','2026-06-23','2026-06-27','2026-06-27'],
    ['Arrowhead Stadium, Kansas City, MO',"Levi's Stadium, Santa Clara, CA",'AT&T Stadium, Arlington, TX',"Levi's Stadium, Santa Clara, CA",'AT&T Stadium, Arlington, TX','Arrowhead Stadium, Kansas City, MO'],
    ['9:00 PM ET','12:00 AM ET','1:00 PM ET','12:00 AM ET','10:00 PM ET','10:00 PM ET']),

  // Group K: portugal(t1) vs drcongo(t2), uzbekistan(t3) vs colombia(t4)
  ...buildGroupMatches('K',
    ['2026-06-17','2026-06-17','2026-06-23','2026-06-23','2026-06-27','2026-06-27'],
    ['NRG Stadium, Houston, TX','Estadio Azteca, Mexico City, Mexico','NRG Stadium, Houston, TX','Estadio Akron, Zapopan, Mexico','Hard Rock Stadium, Miami Gardens, FL','Mercedes-Benz Stadium, Atlanta, GA'],
    ['1:00 PM ET','10:00 PM ET','1:00 PM ET','10:00 PM ET','7:30 PM ET','7:30 PM ET']),

  // Group L: england(t1) vs croatia(t2), ghana(t3) vs panama(t4)
  ...buildGroupMatches('L',
    ['2026-06-17','2026-06-17','2026-06-23','2026-06-23','2026-06-27','2026-06-27'],
    ['AT&T Stadium, Arlington, TX','BMO Field, Toronto, Canada','Gillette Stadium, Foxborough, MA','BMO Field, Toronto, Canada','MetLife Stadium, East Rutherford, NJ','Lincoln Financial Field, Philadelphia, PA'],
    ['4:00 PM ET','7:00 PM ET','4:00 PM ET','7:00 PM ET','5:00 PM ET','5:00 PM ET']),
]

// ── Knockout Stage Template ───────────────────────────────────────────────────
// homeSlot/awaySlot are placeholders; actual team IDs are filled in by admin.
export const KNOCKOUT_MATCHES = [
  // ── Round of 32 (Jun 28 – Jul 3) — official FIFA matchups ──────────
  // '3ABCDF' = best 3rd-place team from one of those groups (TBD after group stage)
  { id: 'ko_r32_1',  stage: 'r32', homeSlot: '1E',  awaySlot: '3ABCDF', date: '2026-06-29', time: '4:30 PM ET',  venue: 'Gillette Stadium, Foxborough, MA' },
  { id: 'ko_r32_2',  stage: 'r32', homeSlot: '1I',  awaySlot: '3CDFGH', date: '2026-06-30', time: '5:00 PM ET',  venue: 'MetLife Stadium, East Rutherford, NJ' },
  { id: 'ko_r32_3',  stage: 'r32', homeSlot: '2A',  awaySlot: '2B',     date: '2026-06-28', time: '3:00 PM ET',  venue: 'SoFi Stadium, Inglewood, CA' },
  { id: 'ko_r32_4',  stage: 'r32', homeSlot: '1F',  awaySlot: '2C',     date: '2026-06-29', time: '9:00 PM ET',  venue: 'Estadio BBVA, Monterrey, Mexico' },
  { id: 'ko_r32_5',  stage: 'r32', homeSlot: '2K',  awaySlot: '2L',     date: '2026-07-02', time: '7:00 PM ET',  venue: 'BMO Field, Toronto, Canada' },
  { id: 'ko_r32_6',  stage: 'r32', homeSlot: '1H',  awaySlot: '2J',     date: '2026-07-02', time: '3:00 PM ET',  venue: 'SoFi Stadium, Inglewood, CA' },
  { id: 'ko_r32_7',  stage: 'r32', homeSlot: '1D',  awaySlot: '3BEFIJ', date: '2026-07-01', time: '8:00 PM ET',  venue: "Levi's Stadium, Santa Clara, CA" },
  { id: 'ko_r32_8',  stage: 'r32', homeSlot: '1G',  awaySlot: '3AEHIJ', date: '2026-07-01', time: '4:00 PM ET',  venue: 'Lumen Field, Seattle, WA' },
  { id: 'ko_r32_9',  stage: 'r32', homeSlot: '1C',  awaySlot: '2F',     date: '2026-06-29', time: '1:00 PM ET',  venue: 'NRG Stadium, Houston, TX' },
  { id: 'ko_r32_10', stage: 'r32', homeSlot: '2E',  awaySlot: '2I',     date: '2026-06-30', time: '1:00 PM ET',  venue: 'AT&T Stadium, Arlington, TX' },
  { id: 'ko_r32_11', stage: 'r32', homeSlot: '1A',  awaySlot: '3CEFHI', date: '2026-07-01', time: '12:00 AM ET', venue: 'Estadio Azteca, Mexico City, Mexico' },
  { id: 'ko_r32_12', stage: 'r32', homeSlot: '1L',  awaySlot: '3EHIJK', date: '2026-07-01', time: '12:00 PM ET', venue: 'Mercedes-Benz Stadium, Atlanta, GA' },
  { id: 'ko_r32_13', stage: 'r32', homeSlot: '1J',  awaySlot: '2H',     date: '2026-07-03', time: '6:00 PM ET',  venue: 'Hard Rock Stadium, Miami Gardens, FL' },
  { id: 'ko_r32_14', stage: 'r32', homeSlot: '2D',  awaySlot: '2G',     date: '2026-07-03', time: '2:00 PM ET',  venue: 'AT&T Stadium, Arlington, TX' },
  { id: 'ko_r32_15', stage: 'r32', homeSlot: '1B',  awaySlot: '3EFGIJ', date: '2026-07-03', time: '12:00 AM ET', venue: 'BC Place, Vancouver, Canada' },
  { id: 'ko_r32_16', stage: 'r32', homeSlot: '1K',  awaySlot: '3DEIJL', date: '2026-07-03', time: '9:30 PM ET',  venue: 'Arrowhead Stadium, Kansas City, MO' },

  // ── Round of 16 (July 4–7) ────────────────────────────────────────
  { id: 'ko_r16_1', stage: 'r16', homeSlot: 'W_r32_1',  awaySlot: 'W_r32_2',  date: '2026-07-04', time: '5:00 PM ET',  venue: 'Lincoln Financial Field, Philadelphia, PA' },
  { id: 'ko_r16_2', stage: 'r16', homeSlot: 'W_r32_3',  awaySlot: 'W_r32_4',  date: '2026-07-04', time: '1:00 PM ET',  venue: 'NRG Stadium, Houston, TX' },
  { id: 'ko_r16_3', stage: 'r16', homeSlot: 'W_r32_5',  awaySlot: 'W_r32_6',  date: '2026-07-06', time: '3:00 PM ET',  venue: 'AT&T Stadium, Arlington, TX' },
  { id: 'ko_r16_4', stage: 'r16', homeSlot: 'W_r32_7',  awaySlot: 'W_r32_8',  date: '2026-07-06', time: '8:00 PM ET',  venue: 'Lumen Field, Seattle, WA' },
  { id: 'ko_r16_5', stage: 'r16', homeSlot: 'W_r32_9',  awaySlot: 'W_r32_10', date: '2026-07-05', time: '4:00 PM ET',  venue: 'MetLife Stadium, East Rutherford, NJ' },
  { id: 'ko_r16_6', stage: 'r16', homeSlot: 'W_r32_11', awaySlot: 'W_r32_12', date: '2026-07-05', time: '8:00 PM ET',  venue: 'Estadio Azteca, Mexico City, Mexico' },
  { id: 'ko_r16_7', stage: 'r16', homeSlot: 'W_r32_13', awaySlot: 'W_r32_14', date: '2026-07-07', time: '12:00 PM ET', venue: 'Mercedes-Benz Stadium, Atlanta, GA' },
  { id: 'ko_r16_8', stage: 'r16', homeSlot: 'W_r32_15', awaySlot: 'W_r32_16', date: '2026-07-07', time: '4:00 PM ET',  venue: 'BC Place, Vancouver, Canada' },

  // ── Quarterfinals (July 9–11) ─────────────────────────────────────
  { id: 'ko_qf_1', stage: 'qf', homeSlot: 'W_r16_1', awaySlot: 'W_r16_2', date: '2026-07-09', time: '4:00 PM ET', venue: 'Gillette Stadium, Foxborough, MA' },
  { id: 'ko_qf_2', stage: 'qf', homeSlot: 'W_r16_3', awaySlot: 'W_r16_4', date: '2026-07-10', time: '3:00 PM ET', venue: 'SoFi Stadium, Inglewood, CA' },
  { id: 'ko_qf_3', stage: 'qf', homeSlot: 'W_r16_5', awaySlot: 'W_r16_6', date: '2026-07-11', time: '5:00 PM ET', venue: 'Hard Rock Stadium, Miami Gardens, FL' },
  { id: 'ko_qf_4', stage: 'qf', homeSlot: 'W_r16_7', awaySlot: 'W_r16_8', date: '2026-07-11', time: '9:00 PM ET', venue: 'Arrowhead Stadium, Kansas City, MO' },

  // ── Semifinals (July 14–15) ───────────────────────────────────────
  { id: 'ko_sf_1', stage: 'sf', homeSlot: 'W_qf_1', awaySlot: 'W_qf_2', date: '2026-07-14', time: '3:00 PM ET', venue: 'AT&T Stadium, Arlington, TX' },
  { id: 'ko_sf_2', stage: 'sf', homeSlot: 'W_qf_3', awaySlot: 'W_qf_4', date: '2026-07-15', time: '3:00 PM ET', venue: 'Mercedes-Benz Stadium, Atlanta, GA' },

  // ── Third Place (July 18) ─────────────────────────────────────────
  { id: 'ko_3rd',   stage: '3rd',   homeSlot: 'L_sf_1', awaySlot: 'L_sf_2', date: '2026-07-18', time: '5:00 PM ET', venue: 'Hard Rock Stadium, Miami Gardens, FL' },

  // ── Final (July 19) ──────────────────────────────────────────────
  { id: 'ko_final', stage: 'final', homeSlot: 'W_sf_1', awaySlot: 'W_sf_2', date: '2026-07-19', time: '3:00 PM ET', venue: 'MetLife Stadium, East Rutherford, NJ' },
]

export const ALL_MATCHES = [...GROUP_MATCHES, ...KNOCKOUT_MATCHES]

// ── Lookup helpers ─────────────────────────────────────────────────────────────
export function getMatch(matchId) {
  return ALL_MATCHES.find((m) => m.id === matchId) || null
}

export function getGroupMatches(group) {
  return GROUP_MATCHES.filter((m) => m.group === group)
}

export function getMatchesByMatchday(group, matchday) {
  return GROUP_MATCHES.filter((m) => m.group === group && m.matchday === matchday)
}

export function getKnockoutMatchesByStage(stage) {
  return KNOCKOUT_MATCHES.filter((m) => m.stage === stage)
}
