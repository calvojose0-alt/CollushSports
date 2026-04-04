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

// Statistical tendencies for driver panel (seed data — replaced by API when connected)
// podiumRate: historical % of races finishing top 3
// top10Rate:  historical % of races finishing top 10
export const DRIVER_STATS = {
  NOR: { podiumRate: 0.65, top10Rate: 0.92, recentFinishes: [1, 2, 1, 3, 1] },
  PIA: { podiumRate: 0.48, top10Rate: 0.87, recentFinishes: [2, 1, 3, 2, 4] },
  RUS: { podiumRate: 0.32, top10Rate: 0.82, recentFinishes: [4, 3, 5, 4, 3] },
  ANT: { podiumRate: 0.18, top10Rate: 0.68, recentFinishes: [7, 6, 8, 5, 7] },
  VER: { podiumRate: 0.62, top10Rate: 0.90, recentFinishes: [3, 2, 2, 1, 2] },
  HAD: { podiumRate: 0.10, top10Rate: 0.60, recentFinishes: [9, 8, 11, 7, 10] },
  LEC: { podiumRate: 0.42, top10Rate: 0.84, recentFinishes: [3, 4, 2, 3, 5] },
  HAM: { podiumRate: 0.35, top10Rate: 0.82, recentFinishes: [5, 3, 4, 6, 3] },
  ALB: { podiumRate: 0.02, top10Rate: 0.48, recentFinishes: [12, 11, 13, 10, 13] },
  SAI: { podiumRate: 0.25, top10Rate: 0.76, recentFinishes: [6, 5, 6, 8, 6] },
  LAW: { podiumRate: 0.06, top10Rate: 0.55, recentFinishes: [10, 9, 12, 9, 11] },
  LIN: { podiumRate: 0.01, top10Rate: 0.28, recentFinishes: [17, 16, 19, 18, 20] },
  ALO: { podiumRate: 0.18, top10Rate: 0.70, recentFinishes: [8, 7, 9, 7, 8] },
  STR: { podiumRate: 0.04, top10Rate: 0.50, recentFinishes: [11, 10, 10, 11, 12] },
  OCO: { podiumRate: 0.03, top10Rate: 0.44, recentFinishes: [13, 13, 14, 13, 14] },
  BEA: { podiumRate: 0.02, top10Rate: 0.38, recentFinishes: [15, 14, 16, 14, 16] },
  HUL: { podiumRate: 0.03, top10Rate: 0.43, recentFinishes: [14, 12, 15, 12, 15] },
  BOR: { podiumRate: 0.02, top10Rate: 0.32, recentFinishes: [18, 17, 18, 17, 18] },
  GAS: { podiumRate: 0.06, top10Rate: 0.55, recentFinishes: [10, 11, 9, 10, 9] },
  COL: { podiumRate: 0.02, top10Rate: 0.35, recentFinishes: [16, 15, 17, 16, 17] },
  BOT: { podiumRate: 0.04, top10Rate: 0.42, recentFinishes: [13, 14, 16, 15, 14] },
  PER: { podiumRate: 0.08, top10Rate: 0.55, recentFinishes: [11, 12, 13, 11, 12] },
}
