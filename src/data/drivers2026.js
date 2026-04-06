// 2026 Formula 1 Driver Roster
// Source: Official F1 entry list (updated for 2026 season)
// Notable changes: Norris carries #1 as 2025 champion, Verstappen switches to #3,
// Cadillac joins as new 11th team (Bottas + Perez), Audi rebrands from Sauber,
// Colapinto replaces Doohan at Alpine, Hadjar promoted to Red Bull, Lindblad to Racing Bulls

export const DRIVERS_2026 = [
  { id: 'NOR', name: 'Lando Norris',        team: 'McLaren',          teamColor: '#FF8000', number: 1,  nationality: '🇬🇧' },
  { id: 'PIA', name: 'Oscar Piastri',        team: 'McLaren',          teamColor: '#FF8000', number: 81, nationality: '🇦🇺' },
  { id: 'RUS', name: 'George Russell',       team: 'Mercedes',         teamColor: '#27F4D2', number: 63, nationality: '🇬🇧' },
  { id: 'ANT', name: 'Kimi Antonelli',       team: 'Mercedes',         teamColor: '#27F4D2', number: 12, nationality: '🇮🇹' },
  { id: 'VER', name: 'Max Verstappen',       team: 'Red Bull Racing',  teamColor: '#3671C6', number: 3,  nationality: '🇳🇱' },
  { id: 'HAD', name: 'Isack Hadjar',         team: 'Red Bull Racing',  teamColor: '#3671C6', number: 6,  nationality: '🇫🇷' },
  { id: 'LEC', name: 'Charles Leclerc',      team: 'Ferrari',          teamColor: '#E8002D', number: 16, nationality: '🇲🇨' },
  { id: 'HAM', name: 'Lewis Hamilton',       team: 'Ferrari',          teamColor: '#E8002D', number: 44, nationality: '🇬🇧' },
  { id: 'ALB', name: 'Alexander Albon',      team: 'Williams',         teamColor: '#64C4FF', number: 23, nationality: '🇹🇭' },
  { id: 'SAI', name: 'Carlos Sainz',         team: 'Williams',         teamColor: '#64C4FF', number: 55, nationality: '🇪🇸' },
  { id: 'LAW', name: 'Liam Lawson',          team: 'Racing Bulls',     teamColor: '#6692FF', number: 30, nationality: '🇳🇿' },
  { id: 'LIN', name: 'Arvid Lindblad',       team: 'Racing Bulls',     teamColor: '#6692FF', number: 41, nationality: '🇬🇧' },
  { id: 'ALO', name: 'Fernando Alonso',      team: 'Aston Martin',     teamColor: '#229971', number: 14, nationality: '🇪🇸' },
  { id: 'STR', name: 'Lance Stroll',         team: 'Aston Martin',     teamColor: '#229971', number: 18, nationality: '🇨🇦' },
  { id: 'OCO', name: 'Esteban Ocon',         team: 'Haas',             teamColor: '#B6BABD', number: 31, nationality: '🇫🇷' },
  { id: 'BEA', name: 'Oliver Bearman',       team: 'Haas',             teamColor: '#B6BABD', number: 87, nationality: '🇬🇧' },
  { id: 'HUL', name: 'Nico Hülkenberg',      team: 'Audi',             teamColor: '#4A4A4A', number: 27, nationality: '🇩🇪' },
  { id: 'BOR', name: 'Gabriel Bortoleto',    team: 'Audi',             teamColor: '#4A4A4A', number: 5,  nationality: '🇧🇷' },
  { id: 'GAS', name: 'Pierre Gasly',         team: 'Alpine',           teamColor: '#FF87BC', number: 10, nationality: '🇫🇷' },
  { id: 'COL', name: 'Franco Colapinto',     team: 'Alpine',           teamColor: '#FF87BC', number: 43, nationality: '🇦🇷' },
  { id: 'BOT', name: 'Valtteri Bottas',      team: 'Cadillac',         teamColor: '#C8102E', number: 77, nationality: '🇫🇮' },
  { id: 'PER', name: 'Sergio Perez',         team: 'Cadillac',         teamColor: '#C8102E', number: 11, nationality: '🇲🇽' },
]

export const DRIVER_MAP = Object.fromEntries(DRIVERS_2026.map((d) => [d.id, d]))

// Labels matching the recentFinishes array positions (shown on chart X-axis)
export const RECENT_RACE_LABELS = ['ABU \'25', 'QAT \'25', 'AUS \'26', 'CHN \'26', 'JPN \'26']

// Statistical tendencies for driver panel (seed data — replaced by API when connected)
// podiumRate: historical % of races finishing top 3
// top10Rate:  historical % of races finishing top 10
// recentFinishes format: [ABU_2025, QAT_2025, AUS_R01, CHN_R02, JPN_R03]
// Last 3 entries are actual 2026 results — DNS/Ret/NC = 20
export const DRIVER_STATS = {
  NOR: { podiumRate: 0.65, top10Rate: 0.92, recentFinishes: [1,  2,  5, 20,  5] },
  PIA: { podiumRate: 0.48, top10Rate: 0.87, recentFinishes: [2,  1, 20, 20,  2] },
  RUS: { podiumRate: 0.32, top10Rate: 0.82, recentFinishes: [4,  3,  1,  2,  4] },
  ANT: { podiumRate: 0.18, top10Rate: 0.68, recentFinishes: [7,  6,  2,  1,  1] },
  VER: { podiumRate: 0.62, top10Rate: 0.90, recentFinishes: [3,  2,  6, 20,  8] },
  HAD: { podiumRate: 0.10, top10Rate: 0.60, recentFinishes: [9,  8, 20,  8, 12] },
  LEC: { podiumRate: 0.42, top10Rate: 0.84, recentFinishes: [3,  4,  3,  4,  3] },
  HAM: { podiumRate: 0.35, top10Rate: 0.82, recentFinishes: [5,  3,  4,  3,  6] },
  ALB: { podiumRate: 0.02, top10Rate: 0.48, recentFinishes: [12, 11, 12, 20, 20] },
  SAI: { podiumRate: 0.25, top10Rate: 0.76, recentFinishes: [6,  5, 15,  9, 15] },
  LAW: { podiumRate: 0.06, top10Rate: 0.55, recentFinishes: [10,  9, 13,  7,  9] },
  LIN: { podiumRate: 0.01, top10Rate: 0.28, recentFinishes: [17, 16,  8, 12, 14] },
  ALO: { podiumRate: 0.18, top10Rate: 0.70, recentFinishes: [8,  7, 20, 20, 18] },
  STR: { podiumRate: 0.04, top10Rate: 0.50, recentFinishes: [11, 10, 20, 20, 20] },
  OCO: { podiumRate: 0.03, top10Rate: 0.44, recentFinishes: [13, 13, 11, 14, 10] },
  BEA: { podiumRate: 0.02, top10Rate: 0.38, recentFinishes: [15, 14,  7,  5, 20] },
  HUL: { podiumRate: 0.03, top10Rate: 0.43, recentFinishes: [14, 12, 20, 11, 11] },
  BOR: { podiumRate: 0.02, top10Rate: 0.32, recentFinishes: [18, 17,  9, 20, 13] },
  GAS: { podiumRate: 0.06, top10Rate: 0.55, recentFinishes: [10, 11, 10,  6,  7] },
  COL: { podiumRate: 0.02, top10Rate: 0.35, recentFinishes: [16, 15, 14, 10, 16] },
  BOT: { podiumRate: 0.04, top10Rate: 0.42, recentFinishes: [13, 14, 20, 13, 19] },
  PER: { podiumRate: 0.08, top10Rate: 0.55, recentFinishes: [11, 12, 16, 15, 17] },
}
