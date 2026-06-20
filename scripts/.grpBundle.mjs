// scripts/diagnoseGroupR32.mjs
import fs from "fs";

// src/data/wc2026Teams.js
var WC_TEAMS = {
  // ── Group A ────────────────────────────────────────────────────────
  mexico: { id: "mexico", name: "Mexico", shortName: "MEX", flag: "\u{1F1F2}\u{1F1FD}", cc: "mx", group: "A", confed: "CONCACAF", color: "#006847" },
  southkorea: { id: "southkorea", name: "South Korea", shortName: "KOR", flag: "\u{1F1F0}\u{1F1F7}", cc: "kr", group: "A", confed: "AFC", color: "#003478" },
  southafrica: { id: "southafrica", name: "South Africa", shortName: "RSA", flag: "\u{1F1FF}\u{1F1E6}", cc: "za", group: "A", confed: "CAF", color: "#007749" },
  czechrepublic: { id: "czechrepublic", name: "Czech Republic", shortName: "CZE", flag: "\u{1F1E8}\u{1F1FF}", cc: "cz", group: "A", confed: "UEFA", color: "#D7141A" },
  // ── Group B ────────────────────────────────────────────────────────
  canada: { id: "canada", name: "Canada", shortName: "CAN", flag: "\u{1F1E8}\u{1F1E6}", cc: "ca", group: "B", confed: "CONCACAF", color: "#FF0000" },
  switzerland: { id: "switzerland", name: "Switzerland", shortName: "SUI", flag: "\u{1F1E8}\u{1F1ED}", cc: "ch", group: "B", confed: "UEFA", color: "#FF0000" },
  qatar: { id: "qatar", name: "Qatar", shortName: "QAT", flag: "\u{1F1F6}\u{1F1E6}", cc: "qa", group: "B", confed: "AFC", color: "#8D1B3D" },
  bosnia: { id: "bosnia", name: "Bosnia & Herzegovina", shortName: "BIH", flag: "\u{1F1E7}\u{1F1E6}", cc: "ba", group: "B", confed: "UEFA", color: "#003DA5" },
  // ── Group C ────────────────────────────────────────────────────────
  brazil: { id: "brazil", name: "Brazil", shortName: "BRA", flag: "\u{1F1E7}\u{1F1F7}", cc: "br", group: "C", confed: "CONMEBOL", color: "#009C3B" },
  morocco: { id: "morocco", name: "Morocco", shortName: "MAR", flag: "\u{1F1F2}\u{1F1E6}", cc: "ma", group: "C", confed: "CAF", color: "#C1272D" },
  scotland: { id: "scotland", name: "Scotland", shortName: "SCO", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", cc: "gb-sct", group: "C", confed: "UEFA", color: "#005EB8" },
  haiti: { id: "haiti", name: "Haiti", shortName: "HAI", flag: "\u{1F1ED}\u{1F1F9}", cc: "ht", group: "C", confed: "CONCACAF", color: "#00209F" },
  // ── Group D ────────────────────────────────────────────────────────
  usa: { id: "usa", name: "United States", shortName: "USA", flag: "\u{1F1FA}\u{1F1F8}", cc: "us", group: "D", confed: "CONCACAF", color: "#002868" },
  paraguay: { id: "paraguay", name: "Paraguay", shortName: "PAR", flag: "\u{1F1F5}\u{1F1FE}", cc: "py", group: "D", confed: "CONMEBOL", color: "#0038A8" },
  australia: { id: "australia", name: "Australia", shortName: "AUS", flag: "\u{1F1E6}\u{1F1FA}", cc: "au", group: "D", confed: "AFC", color: "#00843D" },
  turkey: { id: "turkey", name: "T\xFCrkiye", shortName: "TUR", flag: "\u{1F1F9}\u{1F1F7}", cc: "tr", group: "D", confed: "UEFA", color: "#E30A17" },
  // ── Group E ────────────────────────────────────────────────────────
  germany: { id: "germany", name: "Germany", shortName: "GER", flag: "\u{1F1E9}\u{1F1EA}", cc: "de", group: "E", confed: "UEFA", color: "#000000" },
  ecuador: { id: "ecuador", name: "Ecuador", shortName: "ECU", flag: "\u{1F1EA}\u{1F1E8}", cc: "ec", group: "E", confed: "CONMEBOL", color: "#FFD100" },
  ivorycoast: { id: "ivorycoast", name: "Ivory Coast", shortName: "CIV", flag: "\u{1F1E8}\u{1F1EE}", cc: "ci", group: "E", confed: "CAF", color: "#F77F00" },
  curacao: { id: "curacao", name: "Cura\xE7ao", shortName: "CUW", flag: "\u{1F1E8}\u{1F1FC}", cc: "cw", group: "E", confed: "CONCACAF", color: "#002B7F" },
  // ── Group F ────────────────────────────────────────────────────────
  netherlands: { id: "netherlands", name: "Netherlands", shortName: "NED", flag: "\u{1F1F3}\u{1F1F1}", cc: "nl", group: "F", confed: "UEFA", color: "#FF6600" },
  japan: { id: "japan", name: "Japan", shortName: "JPN", flag: "\u{1F1EF}\u{1F1F5}", cc: "jp", group: "F", confed: "AFC", color: "#BC002D" },
  sweden: { id: "sweden", name: "Sweden", shortName: "SWE", flag: "\u{1F1F8}\u{1F1EA}", cc: "se", group: "F", confed: "UEFA", color: "#006AA7" },
  tunisia: { id: "tunisia", name: "Tunisia", shortName: "TUN", flag: "\u{1F1F9}\u{1F1F3}", cc: "tn", group: "F", confed: "CAF", color: "#E70013" },
  // ── Group G ────────────────────────────────────────────────────────
  belgium: { id: "belgium", name: "Belgium", shortName: "BEL", flag: "\u{1F1E7}\u{1F1EA}", cc: "be", group: "G", confed: "UEFA", color: "#EF3340" },
  iran: { id: "iran", name: "Iran", shortName: "IRN", flag: "\u{1F1EE}\u{1F1F7}", cc: "ir", group: "G", confed: "AFC", color: "#239F40" },
  egypt: { id: "egypt", name: "Egypt", shortName: "EGY", flag: "\u{1F1EA}\u{1F1EC}", cc: "eg", group: "G", confed: "CAF", color: "#CE1126" },
  newzealand: { id: "newzealand", name: "New Zealand", shortName: "NZL", flag: "\u{1F1F3}\u{1F1FF}", cc: "nz", group: "G", confed: "OFC", color: "#00247D" },
  // ── Group H ────────────────────────────────────────────────────────
  spain: { id: "spain", name: "Spain", shortName: "ESP", flag: "\u{1F1EA}\u{1F1F8}", cc: "es", group: "H", confed: "UEFA", color: "#AA151B" },
  uruguay: { id: "uruguay", name: "Uruguay", shortName: "URU", flag: "\u{1F1FA}\u{1F1FE}", cc: "uy", group: "H", confed: "CONMEBOL", color: "#75AADB" },
  saudiarabia: { id: "saudiarabia", name: "Saudi Arabia", shortName: "KSA", flag: "\u{1F1F8}\u{1F1E6}", cc: "sa", group: "H", confed: "AFC", color: "#006C35" },
  capeverde: { id: "capeverde", name: "Cape Verde", shortName: "CPV", flag: "\u{1F1E8}\u{1F1FB}", cc: "cv", group: "H", confed: "CAF", color: "#003893" },
  // ── Group I ────────────────────────────────────────────────────────
  france: { id: "france", name: "France", shortName: "FRA", flag: "\u{1F1EB}\u{1F1F7}", cc: "fr", group: "I", confed: "UEFA", color: "#003189" },
  senegal: { id: "senegal", name: "Senegal", shortName: "SEN", flag: "\u{1F1F8}\u{1F1F3}", cc: "sn", group: "I", confed: "CAF", color: "#00853F" },
  norway: { id: "norway", name: "Norway", shortName: "NOR", flag: "\u{1F1F3}\u{1F1F4}", cc: "no", group: "I", confed: "UEFA", color: "#EF2B2D" },
  iraq: { id: "iraq", name: "Iraq", shortName: "IRQ", flag: "\u{1F1EE}\u{1F1F6}", cc: "iq", group: "I", confed: "AFC", color: "#007A3D" },
  // ── Group J ────────────────────────────────────────────────────────
  argentina: { id: "argentina", name: "Argentina", shortName: "ARG", flag: "\u{1F1E6}\u{1F1F7}", cc: "ar", group: "J", confed: "CONMEBOL", color: "#74ACDF" },
  austria: { id: "austria", name: "Austria", shortName: "AUT", flag: "\u{1F1E6}\u{1F1F9}", cc: "at", group: "J", confed: "UEFA", color: "#ED2939" },
  algeria: { id: "algeria", name: "Algeria", shortName: "ALG", flag: "\u{1F1E9}\u{1F1FF}", cc: "dz", group: "J", confed: "CAF", color: "#006233" },
  jordan: { id: "jordan", name: "Jordan", shortName: "JOR", flag: "\u{1F1EF}\u{1F1F4}", cc: "jo", group: "J", confed: "AFC", color: "#007A3D" },
  // ── Group K ────────────────────────────────────────────────────────
  portugal: { id: "portugal", name: "Portugal", shortName: "POR", flag: "\u{1F1F5}\u{1F1F9}", cc: "pt", group: "K", confed: "UEFA", color: "#006600" },
  colombia: { id: "colombia", name: "Colombia", shortName: "COL", flag: "\u{1F1E8}\u{1F1F4}", cc: "co", group: "K", confed: "CONMEBOL", color: "#FCD116" },
  uzbekistan: { id: "uzbekistan", name: "Uzbekistan", shortName: "UZB", flag: "\u{1F1FA}\u{1F1FF}", cc: "uz", group: "K", confed: "AFC", color: "#1EB53A" },
  drcongo: { id: "drcongo", name: "DR Congo", shortName: "COD", flag: "\u{1F1E8}\u{1F1E9}", cc: "cd", group: "K", confed: "CAF", color: "#007FFF" },
  // ── Group L ────────────────────────────────────────────────────────
  england: { id: "england", name: "England", shortName: "ENG", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", cc: "gb-eng", group: "L", confed: "UEFA", color: "#003078" },
  croatia: { id: "croatia", name: "Croatia", shortName: "CRO", flag: "\u{1F1ED}\u{1F1F7}", cc: "hr", group: "L", confed: "UEFA", color: "#FF0000" },
  panama: { id: "panama", name: "Panama", shortName: "PAN", flag: "\u{1F1F5}\u{1F1E6}", cc: "pa", group: "L", confed: "CONCACAF", color: "#005093" },
  ghana: { id: "ghana", name: "Ghana", shortName: "GHA", flag: "\u{1F1EC}\u{1F1ED}", cc: "gh", group: "L", confed: "CAF", color: "#006B3F" }
};
var WC_GROUPS = {
  A: ["mexico", "southafrica", "southkorea", "czechrepublic"],
  B: ["canada", "bosnia", "qatar", "switzerland"],
  C: ["brazil", "morocco", "haiti", "scotland"],
  D: ["usa", "paraguay", "australia", "turkey"],
  E: ["germany", "curacao", "ivorycoast", "ecuador"],
  F: ["netherlands", "japan", "sweden", "tunisia"],
  G: ["belgium", "egypt", "iran", "newzealand"],
  H: ["spain", "capeverde", "saudiarabia", "uruguay"],
  I: ["france", "senegal", "iraq", "norway"],
  J: ["argentina", "algeria", "austria", "jordan"],
  K: ["portugal", "drcongo", "uzbekistan", "colombia"],
  L: ["england", "croatia", "ghana", "panama"]
};
var SCORING = {
  GROUP_EXACT_SCORE: 4,
  GROUP_CORRECT_OUTCOME: 2,
  GROUP_QUALIFY_EXACT: 4,
  // picked team to qualify AND in the exact position
  GROUP_QUALIFY_POSITION: 2,
  // picked team to qualify but in the wrong position
  PLAYOFF_R32: 0,
  // no points — R32 advancement is covered by group qualification scoring
  PLAYOFF_R16: 4,
  // per team correctly predicted to reach Round of 16
  PLAYOFF_QF: 6,
  // per team correctly predicted to reach Quarterfinals
  PLAYOFF_SF: 8,
  // per team correctly predicted to reach Semifinals
  PLAYOFF_FINALIST: 10,
  // per team correctly predicted to reach the Final (2 finalists)
  PLAYOFF_WINNER: 15
  // champion
};
var PLAYOFF_ROUNDS = [
  { id: "r32", label: "Round of 32", shortLabel: "R32", teamsNeeded: 32, points: SCORING.PLAYOFF_R32 },
  { id: "r16", label: "Round of 16", shortLabel: "R16", teamsNeeded: 16, points: SCORING.PLAYOFF_R16 },
  { id: "qf", label: "Quarterfinals", shortLabel: "QF", teamsNeeded: 8, points: SCORING.PLAYOFF_QF },
  { id: "sf", label: "Semifinals", shortLabel: "SF", teamsNeeded: 4, points: SCORING.PLAYOFF_SF },
  { id: "finalist", label: "Final", shortLabel: "FIN", teamsNeeded: 2, points: SCORING.PLAYOFF_FINALIST },
  { id: "winner", label: "Champion", shortLabel: "WIN", teamsNeeded: 1, points: SCORING.PLAYOFF_WINNER }
];

// src/data/wc2026Schedule.js
function buildGroupMatches(group, dates, venues, times) {
  const [t1, t2, t3, t4] = WC_GROUPS[group];
  return [
    { id: `gs_${group}1`, group, matchday: 1, homeTeam: t1, awayTeam: t2, date: dates[0], venue: venues[0], time: times[0] },
    { id: `gs_${group}2`, group, matchday: 1, homeTeam: t3, awayTeam: t4, date: dates[1], venue: venues[1], time: times[1] },
    { id: `gs_${group}3`, group, matchday: 2, homeTeam: t1, awayTeam: t3, date: dates[2], venue: venues[2], time: times[2] },
    { id: `gs_${group}4`, group, matchday: 2, homeTeam: t2, awayTeam: t4, date: dates[3], venue: venues[3], time: times[3] },
    { id: `gs_${group}5`, group, matchday: 3, homeTeam: t1, awayTeam: t4, date: dates[4], venue: venues[4], time: times[4] },
    { id: `gs_${group}6`, group, matchday: 3, homeTeam: t2, awayTeam: t3, date: dates[5], venue: venues[5], time: times[5] }
  ];
}
var GROUP_MATCHES = [
  // Group A: mexico(t1) vs southafrica(t2), southkorea(t3) vs czechrepublic(t4)
  ...buildGroupMatches(
    "A",
    ["2026-06-11", "2026-06-11", "2026-06-18", "2026-06-18", "2026-06-24", "2026-06-24"],
    ["Estadio Azteca, Mexico City, Mexico", "Estadio Akron, Zapopan, Mexico", "Estadio Akron, Zapopan, Mexico", "Mercedes-Benz Stadium, Atlanta, GA", "Estadio Azteca, Mexico City, Mexico", "Estadio BBVA, Monterrey, Mexico"],
    ["3:00 PM ET", "10:00 PM ET", "9:00 PM ET", "12:00 PM ET", "9:00 PM ET", "9:00 PM ET"]
  ),
  // Group B: canada(t1) vs bosnia(t2), qatar(t3) vs switzerland(t4)
  ...buildGroupMatches(
    "B",
    ["2026-06-12", "2026-06-13", "2026-06-18", "2026-06-18", "2026-06-24", "2026-06-24"],
    ["BMO Field, Toronto, Canada", "Levi's Stadium, Santa Clara, CA", "BC Place, Vancouver, Canada", "SoFi Stadium, Inglewood, CA", "BC Place, Vancouver, Canada", "Lumen Field, Seattle, WA"],
    ["3:00 PM ET", "3:00 PM ET", "6:00 PM ET", "3:00 PM ET", "3:00 PM ET", "3:00 PM ET"]
  ),
  // Group C: brazil(t1) vs morocco(t2), haiti(t3) vs scotland(t4)
  ...buildGroupMatches(
    "C",
    ["2026-06-13", "2026-06-13", "2026-06-19", "2026-06-19", "2026-06-24", "2026-06-24"],
    ["MetLife Stadium, East Rutherford, NJ", "Gillette Stadium, Foxborough, MA", "Lincoln Financial Field, Philadelphia, PA", "Gillette Stadium, Foxborough, MA", "Hard Rock Stadium, Miami Gardens, FL", "Mercedes-Benz Stadium, Atlanta, GA"],
    ["6:00 PM ET", "9:00 PM ET", "9:00 PM ET", "6:00 PM ET", "6:00 PM ET", "6:00 PM ET"]
  ),
  // Group D: usa(t1) vs paraguay(t2), australia(t3) vs turkey(t4)
  ...buildGroupMatches(
    "D",
    ["2026-06-12", "2026-06-13", "2026-06-19", "2026-06-20", "2026-06-25", "2026-06-25"],
    ["SoFi Stadium, Inglewood, CA", "BC Place, Vancouver, Canada", "Lumen Field, Seattle, WA", "Levi's Stadium, Santa Clara, CA", "SoFi Stadium, Inglewood, CA", "Levi's Stadium, Santa Clara, CA"],
    ["9:00 PM ET", "12:00 AM ET", "3:00 PM ET", "12:00 AM ET", "10:00 PM ET", "10:00 PM ET"]
  ),
  // Group E: germany(t1) vs curacao(t2), ivorycoast(t3) vs ecuador(t4)
  ...buildGroupMatches(
    "E",
    ["2026-06-14", "2026-06-14", "2026-06-20", "2026-06-20", "2026-06-25", "2026-06-25"],
    ["NRG Stadium, Houston, TX", "Lincoln Financial Field, Philadelphia, PA", "BMO Field, Toronto, Canada", "Arrowhead Stadium, Kansas City, MO", "MetLife Stadium, East Rutherford, NJ", "Lincoln Financial Field, Philadelphia, PA"],
    ["1:00 PM ET", "7:00 PM ET", "4:00 PM ET", "8:00 PM ET", "4:00 PM ET", "4:00 PM ET"]
  ),
  // Group F: netherlands(t1) vs japan(t2), sweden(t3) vs tunisia(t4)
  ...buildGroupMatches(
    "F",
    ["2026-06-14", "2026-06-14", "2026-06-20", "2026-06-22", "2026-06-25", "2026-06-25"],
    ["AT&T Stadium, Arlington, TX", "Estadio BBVA, Monterrey, Mexico", "NRG Stadium, Houston, TX", "Estadio BBVA, Monterrey, Mexico", "Arrowhead Stadium, Kansas City, MO", "AT&T Stadium, Arlington, TX"],
    ["4:00 PM ET", "10:00 PM ET", "1:00 PM ET", "12:00 AM ET", "7:00 PM ET", "7:00 PM ET"]
  ),
  // Group G: belgium(t1) vs egypt(t2), iran(t3) vs newzealand(t4)
  ...buildGroupMatches(
    "G",
    ["2026-06-15", "2026-06-15", "2026-06-21", "2026-06-21", "2026-06-26", "2026-06-26"],
    ["Lumen Field, Seattle, WA", "SoFi Stadium, Inglewood, CA", "SoFi Stadium, Inglewood, CA", "BC Place, Vancouver, Canada", "BC Place, Vancouver, Canada", "Lumen Field, Seattle, WA"],
    ["3:00 PM ET", "9:00 PM ET", "3:00 PM ET", "9:00 PM ET", "11:00 PM ET", "11:00 PM ET"]
  ),
  // Group H: spain(t1) vs capeverde(t2), saudiarabia(t3) vs uruguay(t4)
  ...buildGroupMatches(
    "H",
    ["2026-06-15", "2026-06-15", "2026-06-21", "2026-06-21", "2026-06-26", "2026-06-26"],
    ["Mercedes-Benz Stadium, Atlanta, GA", "Hard Rock Stadium, Miami Gardens, FL", "Mercedes-Benz Stadium, Atlanta, GA", "Hard Rock Stadium, Miami Gardens, FL", "Estadio Akron, Zapopan, Mexico", "NRG Stadium, Houston, TX"],
    ["12:00 PM ET", "6:00 PM ET", "12:00 PM ET", "6:00 PM ET", "8:00 PM ET", "8:00 PM ET"]
  ),
  // Group I: france(t1) vs senegal(t2), iraq(t3) vs norway(t4)
  ...buildGroupMatches(
    "I",
    ["2026-06-16", "2026-06-16", "2026-06-22", "2026-06-22", "2026-06-26", "2026-06-26"],
    ["MetLife Stadium, East Rutherford, NJ", "Gillette Stadium, Foxborough, MA", "Lincoln Financial Field, Philadelphia, PA", "MetLife Stadium, East Rutherford, NJ", "Gillette Stadium, Foxborough, MA", "BMO Field, Toronto, Canada"],
    ["3:00 PM ET", "6:00 PM ET", "5:00 PM ET", "8:00 PM ET", "3:00 PM ET", "3:00 PM ET"]
  ),
  // Group J: argentina(t1) vs algeria(t2), austria(t3) vs jordan(t4)
  ...buildGroupMatches(
    "J",
    ["2026-06-16", "2026-06-17", "2026-06-22", "2026-06-23", "2026-06-27", "2026-06-27"],
    ["Arrowhead Stadium, Kansas City, MO", "Levi's Stadium, Santa Clara, CA", "AT&T Stadium, Arlington, TX", "Levi's Stadium, Santa Clara, CA", "AT&T Stadium, Arlington, TX", "Arrowhead Stadium, Kansas City, MO"],
    ["9:00 PM ET", "12:00 AM ET", "1:00 PM ET", "12:00 AM ET", "10:00 PM ET", "10:00 PM ET"]
  ),
  // Group K: portugal(t1) vs drcongo(t2), uzbekistan(t3) vs colombia(t4)
  ...buildGroupMatches(
    "K",
    ["2026-06-17", "2026-06-17", "2026-06-23", "2026-06-23", "2026-06-27", "2026-06-27"],
    ["NRG Stadium, Houston, TX", "Estadio Azteca, Mexico City, Mexico", "NRG Stadium, Houston, TX", "Estadio Akron, Zapopan, Mexico", "Hard Rock Stadium, Miami Gardens, FL", "Mercedes-Benz Stadium, Atlanta, GA"],
    ["1:00 PM ET", "10:00 PM ET", "1:00 PM ET", "10:00 PM ET", "7:30 PM ET", "7:30 PM ET"]
  ),
  // Group L: england(t1) vs croatia(t2), ghana(t3) vs panama(t4)
  ...buildGroupMatches(
    "L",
    ["2026-06-17", "2026-06-17", "2026-06-23", "2026-06-23", "2026-06-27", "2026-06-27"],
    ["AT&T Stadium, Arlington, TX", "BMO Field, Toronto, Canada", "Gillette Stadium, Foxborough, MA", "BMO Field, Toronto, Canada", "MetLife Stadium, East Rutherford, NJ", "Lincoln Financial Field, Philadelphia, PA"],
    ["4:00 PM ET", "7:00 PM ET", "4:00 PM ET", "7:00 PM ET", "5:00 PM ET", "5:00 PM ET"]
  )
];
var KNOCKOUT_MATCHES = [
  // ── Round of 32 (Jun 28 – Jul 3) — official FIFA matchups ──────────
  // '3ABCDF' = best 3rd-place team from one of those groups (TBD after group stage)
  { id: "ko_r32_1", stage: "r32", homeSlot: "1E", awaySlot: "3ABCDF", date: "2026-06-29", time: "4:30 PM ET", venue: "Gillette Stadium, Foxborough, MA" },
  { id: "ko_r32_2", stage: "r32", homeSlot: "1I", awaySlot: "3CDFGH", date: "2026-06-30", time: "5:00 PM ET", venue: "MetLife Stadium, East Rutherford, NJ" },
  { id: "ko_r32_3", stage: "r32", homeSlot: "2A", awaySlot: "2B", date: "2026-06-28", time: "3:00 PM ET", venue: "SoFi Stadium, Inglewood, CA" },
  { id: "ko_r32_4", stage: "r32", homeSlot: "1F", awaySlot: "2C", date: "2026-06-29", time: "9:00 PM ET", venue: "Estadio BBVA, Monterrey, Mexico" },
  { id: "ko_r32_5", stage: "r32", homeSlot: "2K", awaySlot: "2L", date: "2026-07-02", time: "7:00 PM ET", venue: "BMO Field, Toronto, Canada" },
  { id: "ko_r32_6", stage: "r32", homeSlot: "1H", awaySlot: "2J", date: "2026-07-02", time: "3:00 PM ET", venue: "SoFi Stadium, Inglewood, CA" },
  { id: "ko_r32_7", stage: "r32", homeSlot: "1D", awaySlot: "3BEFIJ", date: "2026-07-01", time: "8:00 PM ET", venue: "Levi's Stadium, Santa Clara, CA" },
  { id: "ko_r32_8", stage: "r32", homeSlot: "1G", awaySlot: "3AEHIJ", date: "2026-07-01", time: "4:00 PM ET", venue: "Lumen Field, Seattle, WA" },
  { id: "ko_r32_9", stage: "r32", homeSlot: "1C", awaySlot: "2F", date: "2026-06-29", time: "1:00 PM ET", venue: "NRG Stadium, Houston, TX" },
  { id: "ko_r32_10", stage: "r32", homeSlot: "2E", awaySlot: "2I", date: "2026-06-30", time: "1:00 PM ET", venue: "AT&T Stadium, Arlington, TX" },
  { id: "ko_r32_11", stage: "r32", homeSlot: "1A", awaySlot: "3CEFHI", date: "2026-07-01", time: "12:00 AM ET", venue: "Estadio Azteca, Mexico City, Mexico" },
  { id: "ko_r32_12", stage: "r32", homeSlot: "1L", awaySlot: "3EHIJK", date: "2026-07-01", time: "12:00 PM ET", venue: "Mercedes-Benz Stadium, Atlanta, GA" },
  { id: "ko_r32_13", stage: "r32", homeSlot: "1J", awaySlot: "2H", date: "2026-07-03", time: "6:00 PM ET", venue: "Hard Rock Stadium, Miami Gardens, FL" },
  { id: "ko_r32_14", stage: "r32", homeSlot: "2D", awaySlot: "2G", date: "2026-07-03", time: "2:00 PM ET", venue: "AT&T Stadium, Arlington, TX" },
  { id: "ko_r32_15", stage: "r32", homeSlot: "1B", awaySlot: "3EFGIJ", date: "2026-07-03", time: "12:00 AM ET", venue: "BC Place, Vancouver, Canada" },
  { id: "ko_r32_16", stage: "r32", homeSlot: "1K", awaySlot: "3DEIJL", date: "2026-07-03", time: "9:30 PM ET", venue: "Arrowhead Stadium, Kansas City, MO" },
  // ── Round of 16 (July 4–7) ────────────────────────────────────────
  { id: "ko_r16_1", stage: "r16", homeSlot: "W_r32_1", awaySlot: "W_r32_2", date: "2026-07-04", time: "5:00 PM ET", venue: "Lincoln Financial Field, Philadelphia, PA" },
  { id: "ko_r16_2", stage: "r16", homeSlot: "W_r32_3", awaySlot: "W_r32_4", date: "2026-07-04", time: "1:00 PM ET", venue: "NRG Stadium, Houston, TX" },
  { id: "ko_r16_3", stage: "r16", homeSlot: "W_r32_5", awaySlot: "W_r32_6", date: "2026-07-06", time: "3:00 PM ET", venue: "AT&T Stadium, Arlington, TX" },
  { id: "ko_r16_4", stage: "r16", homeSlot: "W_r32_7", awaySlot: "W_r32_8", date: "2026-07-06", time: "8:00 PM ET", venue: "Lumen Field, Seattle, WA" },
  { id: "ko_r16_5", stage: "r16", homeSlot: "W_r32_9", awaySlot: "W_r32_10", date: "2026-07-05", time: "4:00 PM ET", venue: "MetLife Stadium, East Rutherford, NJ" },
  { id: "ko_r16_6", stage: "r16", homeSlot: "W_r32_11", awaySlot: "W_r32_12", date: "2026-07-05", time: "8:00 PM ET", venue: "Estadio Azteca, Mexico City, Mexico" },
  { id: "ko_r16_7", stage: "r16", homeSlot: "W_r32_13", awaySlot: "W_r32_14", date: "2026-07-07", time: "12:00 PM ET", venue: "Mercedes-Benz Stadium, Atlanta, GA" },
  { id: "ko_r16_8", stage: "r16", homeSlot: "W_r32_15", awaySlot: "W_r32_16", date: "2026-07-07", time: "4:00 PM ET", venue: "BC Place, Vancouver, Canada" },
  // ── Quarterfinals (July 9–11) ─────────────────────────────────────
  { id: "ko_qf_1", stage: "qf", homeSlot: "W_r16_1", awaySlot: "W_r16_2", date: "2026-07-09", time: "4:00 PM ET", venue: "Gillette Stadium, Foxborough, MA" },
  { id: "ko_qf_2", stage: "qf", homeSlot: "W_r16_3", awaySlot: "W_r16_4", date: "2026-07-10", time: "3:00 PM ET", venue: "SoFi Stadium, Inglewood, CA" },
  { id: "ko_qf_3", stage: "qf", homeSlot: "W_r16_5", awaySlot: "W_r16_6", date: "2026-07-11", time: "5:00 PM ET", venue: "Hard Rock Stadium, Miami Gardens, FL" },
  { id: "ko_qf_4", stage: "qf", homeSlot: "W_r16_7", awaySlot: "W_r16_8", date: "2026-07-11", time: "9:00 PM ET", venue: "Arrowhead Stadium, Kansas City, MO" },
  // ── Semifinals (July 14–15) ───────────────────────────────────────
  { id: "ko_sf_1", stage: "sf", homeSlot: "W_qf_1", awaySlot: "W_qf_2", date: "2026-07-14", time: "3:00 PM ET", venue: "AT&T Stadium, Arlington, TX" },
  { id: "ko_sf_2", stage: "sf", homeSlot: "W_qf_3", awaySlot: "W_qf_4", date: "2026-07-15", time: "3:00 PM ET", venue: "Mercedes-Benz Stadium, Atlanta, GA" },
  // ── Third Place (July 18) ─────────────────────────────────────────
  { id: "ko_3rd", stage: "3rd", homeSlot: "L_sf_1", awaySlot: "L_sf_2", date: "2026-07-18", time: "5:00 PM ET", venue: "Hard Rock Stadium, Miami Gardens, FL" },
  // ── Final (July 19) ──────────────────────────────────────────────
  { id: "ko_final", stage: "final", homeSlot: "W_sf_1", awaySlot: "W_sf_2", date: "2026-07-19", time: "3:00 PM ET", venue: "MetLife Stadium, East Rutherford, NJ" }
];
var ALL_MATCHES = [...GROUP_MATCHES, ...KNOCKOUT_MATCHES];

// scripts/diagnoseGroupR32.mjs
function breakGroupTie(tied, vm) {
  const ids = new Set(tied.map((t) => t.teamId));
  const mini = {};
  tied.forEach((t) => {
    mini[t.teamId] = { pts: 0, gf: 0, ga: 0 };
  });
  vm.forEach(({ homeTeam, awayTeam, hs, as }) => {
    if (!ids.has(homeTeam) || !ids.has(awayTeam)) return;
    mini[homeTeam].gf += hs;
    mini[homeTeam].ga += as;
    mini[awayTeam].gf += as;
    mini[awayTeam].ga += hs;
    if (hs > as) mini[homeTeam].pts += 3;
    else if (hs < as) mini[awayTeam].pts += 3;
    else {
      mini[homeTeam].pts++;
      mini[awayTeam].pts++;
    }
  });
  return [...tied].sort((a, b) => {
    const ma = mini[a.teamId], mb = mini[b.teamId], agd = ma.gf - ma.ga, bgd = mb.gf - mb.ga;
    if (mb.pts !== ma.pts) return mb.pts - ma.pts;
    if (bgd !== agd) return bgd - agd;
    if (mb.gf !== ma.gf) return mb.gf - ma.gf;
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0;
  });
}
function standings(group, picks) {
  const teams = WC_GROUPS[group] || [];
  const s = {};
  teams.forEach((t) => {
    s[t] = { teamId: t, gf: 0, ga: 0, gd: 0, pts: 0 };
  });
  const vm = [];
  picks.forEach(({ homeTeam, awayTeam, homeScore, awayScore }) => {
    if (homeScore == null || homeScore === "" || awayScore == null || awayScore === "") return;
    const hs = parseInt(homeScore, 10), as = parseInt(awayScore, 10);
    if (isNaN(hs) || isNaN(as) || !s[homeTeam] || !s[awayTeam]) return;
    vm.push({ homeTeam, awayTeam, hs, as });
    s[homeTeam].gf += hs;
    s[homeTeam].ga += as;
    s[awayTeam].gf += as;
    s[awayTeam].ga += hs;
    if (hs > as) s[homeTeam].pts += 3;
    else if (hs < as) s[awayTeam].pts += 3;
    else {
      s[homeTeam].pts++;
      s[awayTeam].pts++;
    }
  });
  const sorted = Object.values(s).map((x) => ({ ...x, gd: x.gf - x.ga }));
  sorted.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || 0);
  const key = (x) => `${x.pts}|${x.gd}|${x.gf}`;
  const ranked = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && key(sorted[j]) === key(sorted[i])) j++;
    const t = sorted.slice(i, j);
    ranked.push(...t.length > 1 ? breakGroupTie(t, vm) : t);
    i = j;
  }
  return ranked;
}
var GL = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
function buildSlotMap(pbm) {
  const map = {}, third = [];
  GL.forEach((g) => {
    const list = GROUP_MATCHES.filter((m) => m.group === g);
    const picks = list.map((m) => ({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: pbm[m.id]?.homeScore ?? null, awayScore: pbm[m.id]?.awayScore ?? null }));
    const st = standings(g, picks);
    st.forEach((x, idx) => {
      map[`${idx + 1}${g}`] = x.teamId;
    });
    if (st[2]) third.push({ group: g, ...st[2] });
  });
  third.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const q = third.slice(0, 8), codes = [];
  KNOCKOUT_MATCHES.filter((m) => m.stage === "r32").forEach((m) => {
    if (/^3[A-L]{2,}/.test(m.homeSlot) && !codes.includes(m.homeSlot)) codes.push(m.homeSlot);
    if (/^3[A-L]{2,}/.test(m.awaySlot) && !codes.includes(m.awaySlot)) codes.push(m.awaySlot);
  });
  const used = /* @__PURE__ */ new Set(), bt = {};
  (function rec(i) {
    if (i === codes.length) return true;
    const el = codes[i].slice(1).split("");
    for (const t of q) {
      if (!used.has(t.teamId) && el.includes(t.group)) {
        used.add(t.teamId);
        bt[codes[i]] = t.teamId;
        if (rec(i + 1)) return true;
        used.delete(t.teamId);
        delete bt[codes[i]];
      }
    }
    return false;
  })(0);
  Object.assign(map, bt);
  return map;
}
function derivedR32(slotMap) {
  const set = /* @__PURE__ */ new Set();
  KNOCKOUT_MATCHES.filter((m) => m.stage === "r32").forEach((m) => {
    [m.homeSlot, m.awaySlot].forEach((s) => {
      const t = slotMap[s];
      if (t) set.add(t);
    });
  });
  return set;
}
var tn = (id) => WC_TEAMS[id]?.name || id;
var env = Object.fromEntries(fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n").filter(Boolean).map((l) => {
  const i = l.indexOf("=");
  return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
}));
var BASE = env.VITE_SUPABASE_URL;
var KEY = env.VITE_SUPABASE_ANON_KEY;
var H = { apikey: KEY, Authorization: "Bearer " + KEY };
async function fetchAll(t, sel, q = "") {
  const out = [];
  let o = 0;
  for (; ; ) {
    const r = await fetch(`${BASE}/rest/v1/${t}?select=${sel}&limit=1000&offset=${o}${q}`, { headers: H });
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error(JSON.stringify(rows));
    out.push(...rows);
    if (rows.length < 1e3) break;
    o += 1e3;
  }
  return out;
}
var GROUP_NAME = process.argv[2] || "Waterford";
(async () => {
  const groups = await (await fetch(`${BASE}/rest/v1/groups?select=*,group_members(user_id,entry_number)&name=ilike.*${encodeURIComponent(GROUP_NAME)}*`, { headers: H })).json();
  if (!groups.length) {
    console.log("No group matching", GROUP_NAME);
    return;
  }
  const grp = groups[0];
  const members = grp.group_members.map((m) => ({ uid: m.user_id, en: m.entry_number ?? 1 }));
  const [players, gp, pp] = await Promise.all([
    fetchAll("wc_players", "user_id,entry_number,entry_name,display_name"),
    fetchAll("wc_picks", "user_id,entry_number,match_id,home_score,away_score"),
    fetchAll("wc_playoff_picks", "user_id,entry_number,round,team_ids")
  ]);
  const nameOf = (uid, en) => {
    const p = players.find((p2) => p2.user_id === uid && (p2.entry_number ?? 1) === en);
    return p ? `${p.display_name} \u2014 ${p.entry_name}` : uid;
  };
  const gbk = {};
  gp.forEach((p) => {
    const k = `${p.user_id}_${p.entry_number ?? 1}`;
    (gbk[k] ||= {})[p.match_id] = { homeScore: p.home_score, awayScore: p.away_score };
  });
  const r32saved = {};
  pp.forEach((p) => {
    if (p.round === "r32") {
      r32saved[`${p.user_id}_${p.entry_number ?? 1}`] = p.team_ids || [];
    }
  });
  console.log(`
\u2550\u2550 ${grp.name} \u2014 R32: group-pick-derived (bracket visual) vs SAVED \u2550\u2550`);
  console.log(`${members.length} member entries
`);
  const rows = [];
  for (const { uid, en } of members.sort((a, b) => nameOf(a.uid, a.en).localeCompare(nameOf(b.uid, b.en)))) {
    const k = `${uid}_${en}`;
    const gpCount = Object.keys(gbk[k] || {}).length;
    const slotMap = buildSlotMap(gbk[k] || {});
    const derived = derivedR32(slotMap);
    const saved = new Set(r32saved[k] || []);
    const inDerivedNotSaved = [...derived].filter((t) => !saved.has(t));
    const inSavedNotDerived = [...saved].filter((t) => !derived.has(t));
    const match = inDerivedNotSaved.length === 0 && inSavedNotDerived.length === 0 && saved.size === 32;
    rows.push({ name: nameOf(uid, en), gpCount, savedSize: saved.size, derivedSize: derived.size, inDerivedNotSaved, inSavedNotDerived, match });
  }
  for (const r of rows) {
    const status = r.savedSize === 0 ? "\u2014 no bracket saved" : r.match ? "\u2713 MATCH (saved R32 == group picks)" : "\u2717 MISMATCH";
    console.log(`\u25CF ${r.name}`);
    console.log(`   group picks: ${r.gpCount}/72   |   saved R32: ${r.savedSize}   |   derived R32: ${r.derivedSize}   \u2192   ${status}`);
    if (r.savedSize > 0 && !r.match) {
      if (r.inSavedNotDerived.length) console.log(`     saved but NOT in current group results: ${r.inSavedNotDerived.map(tn).join(", ")}`);
      if (r.inDerivedNotSaved.length) console.log(`     in current group results but NOT saved: ${r.inDerivedNotSaved.map(tn).join(", ")}`);
    }
    console.log("");
  }
  const mism = rows.filter((r) => r.savedSize > 0 && !r.match).length;
  const empty = rows.filter((r) => r.savedSize === 0).length;
  console.log(`Summary: ${rows.length} entries \u2014 ${rows.length - mism - empty} match, ${mism} mismatch, ${empty} no bracket.`);
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
