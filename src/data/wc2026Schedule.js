// 2026 FIFA World Cup – Full Match Schedule
// Group stage: 72 matches (12 groups × 6 matches each)
// Knockout: 63 matches (R32 × 16, R16 × 8, QF × 4, SF × 2, 3rd × 1, Final × 1)
//
// Match IDs: gs_{group}{n}  (e.g. gs_A1) for group stage
//            ko_{round}_{n}  (e.g. ko_r32_1) for knockouts
//
// Dates are approximate; the official FIFA schedule will be confirmed in 2026.
// Venues listed are host city abbreviations (NY=New York/NJ, LA=Los Angeles,
// DAL=Dallas, SF=San Francisco, SEA=Seattle, BOS=Boston, MIA=Miami,
// KC=Kansas City, ATL=Atlanta, PHI=Philadelphia, HOU=Houston, TOR=Toronto,
// VAN=Vancouver, GDL=Guadalajara, MTY=Monterrey, MEX=Mexico City).

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
export const GROUP_MATCHES = [
  // Group A – MD1: Jun 11-12, MD2: Jun 17-18, MD3: Jun 24
  ...buildGroupMatches('A',
    ['2026-06-11','2026-06-12','2026-06-17','2026-06-18','2026-06-24','2026-06-24'],
    ['MetLife Stadium, NY','SoFi Stadium, LA','MetLife Stadium, NY','SoFi Stadium, LA','MetLife Stadium, NY','SoFi Stadium, LA'],
    ['8:00 PM ET','9:00 PM PT','3:00 PM ET','6:00 PM PT','3:00 PM ET','6:00 PM PT']),

  // Group B – MD1: Jun 11-12, MD2: Jun 17-18, MD3: Jun 24-25
  ...buildGroupMatches('B',
    ['2026-06-11','2026-06-12','2026-06-18','2026-06-19','2026-06-25','2026-06-25'],
    ['Estadio Azteca, MEX','AT&T Stadium, DAL','Estadio Azteca, MEX','AT&T Stadium, DAL','Estadio Azteca, MEX','AT&T Stadium, DAL'],
    ['5:00 PM CT','6:00 PM CT','5:00 PM CT','6:00 PM CT','5:00 PM CT','6:00 PM CT']),

  // Group C – MD1: Jun 12-13, MD2: Jun 18-19, MD3: Jun 25-26
  ...buildGroupMatches('C',
    ['2026-06-12','2026-06-13','2026-06-19','2026-06-20','2026-06-25','2026-06-26'],
    ['BMO Field, TOR','BC Place, VAN','BMO Field, TOR','BC Place, VAN','BMO Field, TOR','BC Place, VAN'],
    ['3:00 PM ET','9:00 PM ET','3:00 PM ET','9:00 PM ET','3:00 PM ET','9:00 PM ET']),

  // Group D – MD1: Jun 13-14, MD2: Jun 19-20, MD3: Jun 26
  ...buildGroupMatches('D',
    ['2026-06-13','2026-06-14','2026-06-20','2026-06-21','2026-06-26','2026-06-26'],
    ['Levi\'s Stadium, SF','Hard Rock Stadium, MIA','Levi\'s Stadium, SF','Hard Rock Stadium, MIA','Levi\'s Stadium, SF','Hard Rock Stadium, MIA'],
    ['9:00 PM ET','6:00 PM ET','9:00 PM ET','6:00 PM ET','6:00 PM ET','9:00 PM ET']),

  // Group E – MD1: Jun 14-15, MD2: Jun 20-21, MD3: Jun 27
  ...buildGroupMatches('E',
    ['2026-06-14','2026-06-15','2026-06-21','2026-06-22','2026-06-27','2026-06-27'],
    ['Lincoln Financial Field, PHI','NRG Stadium, HOU','Lincoln Financial Field, PHI','NRG Stadium, HOU','Lincoln Financial Field, PHI','NRG Stadium, HOU'],
    ['3:00 PM ET','6:00 PM CT','3:00 PM ET','6:00 PM CT','3:00 PM ET','6:00 PM CT']),

  // Group F – MD1: Jun 15-16, MD2: Jun 21-22, MD3: Jun 27-28
  ...buildGroupMatches('F',
    ['2026-06-15','2026-06-16','2026-06-22','2026-06-23','2026-06-28','2026-06-28'],
    ['Arrowhead Stadium, KC','Mercedes-Benz Stadium, ATL','Arrowhead Stadium, KC','Mercedes-Benz Stadium, ATL','Arrowhead Stadium, KC','Mercedes-Benz Stadium, ATL'],
    ['6:00 PM CT','6:00 PM ET','6:00 PM CT','6:00 PM ET','6:00 PM CT','6:00 PM ET']),

  // Group G – MD1: Jun 13-14, MD2: Jun 19-20, MD3: Jun 26-27
  ...buildGroupMatches('G',
    ['2026-06-13','2026-06-14','2026-06-20','2026-06-21','2026-06-26','2026-06-27'],
    ['Estadio BBVA, MTY','AT&T Stadium, DAL','Estadio BBVA, MTY','AT&T Stadium, DAL','Estadio BBVA, MTY','AT&T Stadium, DAL'],
    ['8:00 PM CT','9:00 PM CT','8:00 PM CT','9:00 PM CT','8:00 PM CT','9:00 PM CT']),

  // Group H – MD1: Jun 16-17, MD2: Jun 22-23, MD3: Jun 29
  ...buildGroupMatches('H',
    ['2026-06-16','2026-06-17','2026-06-23','2026-06-24','2026-06-29','2026-06-29'],
    ['Estadio Jalisco, GDL','Lumen Field, SEA','Estadio Jalisco, GDL','Lumen Field, SEA','Estadio Jalisco, GDL','Lumen Field, SEA'],
    ['8:00 PM CT','9:00 PM PT','8:00 PM CT','9:00 PM PT','3:00 PM CT','6:00 PM PT']),

  // Group I – MD1: Jun 15-16, MD2: Jun 21-22, MD3: Jun 28-29
  ...buildGroupMatches('I',
    ['2026-06-15','2026-06-16','2026-06-22','2026-06-23','2026-06-28','2026-06-29'],
    ['MetLife Stadium, NY','Hard Rock Stadium, MIA','MetLife Stadium, NY','Hard Rock Stadium, MIA','MetLife Stadium, NY','Hard Rock Stadium, MIA'],
    ['6:00 PM ET','9:00 PM ET','6:00 PM ET','9:00 PM ET','6:00 PM ET','9:00 PM ET']),

  // Group J – MD1: Jun 17-18, MD2: Jun 23-24, MD3: Jun 30
  ...buildGroupMatches('J',
    ['2026-06-17','2026-06-18','2026-06-24','2026-06-25','2026-06-30','2026-06-30'],
    ['SoFi Stadium, LA','Levi\'s Stadium, SF','SoFi Stadium, LA','Levi\'s Stadium, SF','SoFi Stadium, LA','Levi\'s Stadium, SF'],
    ['9:00 PM PT','9:00 PM PT','9:00 PM PT','9:00 PM PT','6:00 PM PT','9:00 PM PT']),

  // Group K – MD1: Jun 18-19, MD2: Jun 24-25, MD3: Jul 1
  ...buildGroupMatches('K',
    ['2026-06-18','2026-06-19','2026-06-25','2026-06-26','2026-07-01','2026-07-01'],
    ['BC Place, VAN','Mercedes-Benz Stadium, ATL','BC Place, VAN','Mercedes-Benz Stadium, ATL','BC Place, VAN','Mercedes-Benz Stadium, ATL'],
    ['6:00 PM PT','6:00 PM ET','6:00 PM PT','6:00 PM ET','6:00 PM PT','6:00 PM ET']),

  // Group L – MD1: Jun 19-20, MD2: Jun 25-26, MD3: Jul 2
  ...buildGroupMatches('L',
    ['2026-06-19','2026-06-20','2026-06-26','2026-06-27','2026-07-02','2026-07-02'],
    ['NRG Stadium, HOU','BMO Field, TOR','NRG Stadium, HOU','BMO Field, TOR','NRG Stadium, HOU','BMO Field, TOR'],
    ['6:00 PM CT','3:00 PM ET','6:00 PM CT','3:00 PM ET','6:00 PM CT','3:00 PM ET']),
]

// ── Knockout Stage Template ───────────────────────────────────────────────────
// homeSlot/awaySlot are placeholders; actual team IDs are filled in by admin.
export const KNOCKOUT_MATCHES = [
  // ── Round of 32 (July 4–7) ────────────────────────────────────────
  { id: 'ko_r32_1',  stage: 'r32', homeSlot: '1A', awaySlot: '2B', date: '2026-07-04', time: '12:00 PM ET', venue: 'MetLife Stadium, NY' },
  { id: 'ko_r32_2',  stage: 'r32', homeSlot: '1B', awaySlot: '2A', date: '2026-07-04', time: '3:00 PM ET',  venue: 'SoFi Stadium, LA' },
  { id: 'ko_r32_3',  stage: 'r32', homeSlot: '1C', awaySlot: '2D', date: '2026-07-04', time: '6:00 PM ET',  venue: 'AT&T Stadium, DAL' },
  { id: 'ko_r32_4',  stage: 'r32', homeSlot: '1D', awaySlot: '2C', date: '2026-07-04', time: '9:00 PM ET',  venue: 'Hard Rock Stadium, MIA' },
  { id: 'ko_r32_5',  stage: 'r32', homeSlot: '1E', awaySlot: '2F', date: '2026-07-05', time: '12:00 PM ET', venue: 'Levi\'s Stadium, SF' },
  { id: 'ko_r32_6',  stage: 'r32', homeSlot: '1F', awaySlot: '2E', date: '2026-07-05', time: '3:00 PM ET',  venue: 'Estadio Azteca, MEX' },
  { id: 'ko_r32_7',  stage: 'r32', homeSlot: '1G', awaySlot: '2H', date: '2026-07-05', time: '6:00 PM ET',  venue: 'Lumen Field, SEA' },
  { id: 'ko_r32_8',  stage: 'r32', homeSlot: '1H', awaySlot: '2G', date: '2026-07-05', time: '9:00 PM ET',  venue: 'BMO Field, TOR' },
  { id: 'ko_r32_9',  stage: 'r32', homeSlot: '1I', awaySlot: '2J', date: '2026-07-06', time: '12:00 PM ET', venue: 'Mercedes-Benz Stadium, ATL' },
  { id: 'ko_r32_10', stage: 'r32', homeSlot: '1J', awaySlot: '2I', date: '2026-07-06', time: '3:00 PM ET',  venue: 'NRG Stadium, HOU' },
  { id: 'ko_r32_11', stage: 'r32', homeSlot: '1K', awaySlot: '2L', date: '2026-07-06', time: '6:00 PM ET',  venue: 'Arrowhead Stadium, KC' },
  { id: 'ko_r32_12', stage: 'r32', homeSlot: '1L', awaySlot: '2K', date: '2026-07-06', time: '9:00 PM ET',  venue: 'Lincoln Financial Field, PHI' },
  { id: 'ko_r32_13', stage: 'r32', homeSlot: '3rd1', awaySlot: '3rd2', date: '2026-07-07', time: '12:00 PM ET', venue: 'Estadio Jalisco, GDL' },
  { id: 'ko_r32_14', stage: 'r32', homeSlot: '3rd3', awaySlot: '3rd4', date: '2026-07-07', time: '3:00 PM ET',  venue: 'Estadio BBVA, MTY' },
  { id: 'ko_r32_15', stage: 'r32', homeSlot: '3rd5', awaySlot: '3rd6', date: '2026-07-07', time: '6:00 PM ET',  venue: 'BC Place, VAN' },
  { id: 'ko_r32_16', stage: 'r32', homeSlot: '3rd7', awaySlot: '3rd8', date: '2026-07-07', time: '9:00 PM ET',  venue: 'MetLife Stadium, NY' },

  // ── Round of 16 (July 9–12) ───────────────────────────────────────
  { id: 'ko_r16_1', stage: 'r16', homeSlot: 'W_r32_1',  awaySlot: 'W_r32_2',  date: '2026-07-09', time: '3:00 PM ET',  venue: 'MetLife Stadium, NY' },
  { id: 'ko_r16_2', stage: 'r16', homeSlot: 'W_r32_3',  awaySlot: 'W_r32_4',  date: '2026-07-09', time: '9:00 PM ET',  venue: 'SoFi Stadium, LA' },
  { id: 'ko_r16_3', stage: 'r16', homeSlot: 'W_r32_5',  awaySlot: 'W_r32_6',  date: '2026-07-10', time: '3:00 PM ET',  venue: 'AT&T Stadium, DAL' },
  { id: 'ko_r16_4', stage: 'r16', homeSlot: 'W_r32_7',  awaySlot: 'W_r32_8',  date: '2026-07-10', time: '9:00 PM ET',  venue: 'Hard Rock Stadium, MIA' },
  { id: 'ko_r16_5', stage: 'r16', homeSlot: 'W_r32_9',  awaySlot: 'W_r32_10', date: '2026-07-11', time: '3:00 PM ET',  venue: 'Levi\'s Stadium, SF' },
  { id: 'ko_r16_6', stage: 'r16', homeSlot: 'W_r32_11', awaySlot: 'W_r32_12', date: '2026-07-11', time: '9:00 PM ET',  venue: 'Mercedes-Benz Stadium, ATL' },
  { id: 'ko_r16_7', stage: 'r16', homeSlot: 'W_r32_13', awaySlot: 'W_r32_14', date: '2026-07-12', time: '3:00 PM ET',  venue: 'Estadio Azteca, MEX' },
  { id: 'ko_r16_8', stage: 'r16', homeSlot: 'W_r32_15', awaySlot: 'W_r32_16', date: '2026-07-12', time: '9:00 PM ET',  venue: 'Lumen Field, SEA' },

  // ── Quarterfinals (July 14–15) ────────────────────────────────────
  { id: 'ko_qf_1', stage: 'qf', homeSlot: 'W_r16_1', awaySlot: 'W_r16_2', date: '2026-07-14', time: '3:00 PM ET',  venue: 'MetLife Stadium, NY' },
  { id: 'ko_qf_2', stage: 'qf', homeSlot: 'W_r16_3', awaySlot: 'W_r16_4', date: '2026-07-14', time: '9:00 PM ET',  venue: 'SoFi Stadium, LA' },
  { id: 'ko_qf_3', stage: 'qf', homeSlot: 'W_r16_5', awaySlot: 'W_r16_6', date: '2026-07-15', time: '3:00 PM ET',  venue: 'Estadio Azteca, MEX' },
  { id: 'ko_qf_4', stage: 'qf', homeSlot: 'W_r16_7', awaySlot: 'W_r16_8', date: '2026-07-15', time: '9:00 PM ET',  venue: 'AT&T Stadium, DAL' },

  // ── Semifinals (July 17–18) ───────────────────────────────────────
  { id: 'ko_sf_1', stage: 'sf', homeSlot: 'W_qf_1', awaySlot: 'W_qf_2', date: '2026-07-17', time: '6:00 PM ET', venue: 'MetLife Stadium, NY' },
  { id: 'ko_sf_2', stage: 'sf', homeSlot: 'W_qf_3', awaySlot: 'W_qf_4', date: '2026-07-18', time: '6:00 PM ET', venue: 'SoFi Stadium, LA' },

  // ── Third Place (July 21) ─────────────────────────────────────────
  { id: 'ko_3rd',   stage: '3rd',   homeSlot: 'L_sf_1', awaySlot: 'L_sf_2', date: '2026-07-21', time: '6:00 PM ET', venue: 'AT&T Stadium, DAL' },

  // ── Final (July 22) ──────────────────────────────────────────────
  { id: 'ko_final', stage: 'final', homeSlot: 'W_sf_1', awaySlot: 'W_sf_2', date: '2026-07-22', time: '6:00 PM ET', venue: 'MetLife Stadium, NY' },
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
