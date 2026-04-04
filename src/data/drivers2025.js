// 2025 Formula 1 Driver Roster
// Source: Official F1 entry list (updated for 2025 season)

export const DRIVERS_2025 = [
  { id: 'VER', name: 'Max Verstappen',      team: 'Red Bull Racing',  teamColor: '#3671C6', number: 1,  nationality: '🇳🇱' },
  { id: 'TSU', name: 'Yuki Tsunoda',        team: 'Red Bull Racing',  teamColor: '#3671C6', number: 22, nationality: '🇯🇵' },
  { id: 'NOR', name: 'Lando Norris',        team: 'McLaren',          teamColor: '#FF8000', number: 4,  nationality: '🇬🇧' },
  { id: 'PIA', name: 'Oscar Piastri',       team: 'McLaren',          teamColor: '#FF8000', number: 81, nationality: '🇦🇺' },
  { id: 'LEC', name: 'Charles Leclerc',     team: 'Ferrari',          teamColor: '#E8002D', number: 16, nationality: '🇲🇨' },
  { id: 'HAM', name: 'Lewis Hamilton',      team: 'Ferrari',          teamColor: '#E8002D', number: 44, nationality: '🇬🇧' },
  { id: 'RUS', name: 'George Russell',      team: 'Mercedes',         teamColor: '#27F4D2', number: 63, nationality: '🇬🇧' },
  { id: 'ANT', name: 'Kimi Antonelli',      team: 'Mercedes',         teamColor: '#27F4D2', number: 12, nationality: '🇮🇹' },
  { id: 'ALO', name: 'Fernando Alonso',     team: 'Aston Martin',     teamColor: '#229971', number: 14, nationality: '🇪🇸' },
  { id: 'STR', name: 'Lance Stroll',        team: 'Aston Martin',     teamColor: '#229971', number: 18, nationality: '🇨🇦' },
  { id: 'GAS', name: 'Pierre Gasly',        team: 'Alpine',           teamColor: '#FF87BC', number: 10, nationality: '🇫🇷' },
  { id: 'DOO', name: 'Jack Doohan',         team: 'Alpine',           teamColor: '#FF87BC', number: 7,  nationality: '🇦🇺' },
  { id: 'OCO', name: 'Esteban Ocon',        team: 'Haas',             teamColor: '#B6BABD', number: 31, nationality: '🇫🇷' },
  { id: 'BEA', name: 'Oliver Bearman',      team: 'Haas',             teamColor: '#B6BABD', number: 87, nationality: '🇬🇧' },
  { id: 'HUL', name: 'Nico Hülkenberg',     team: 'Sauber',           teamColor: '#52E252', number: 27, nationality: '🇩🇪' },
  { id: 'BOR', name: 'Gabriel Bortoleto',   team: 'Sauber',           teamColor: '#52E252', number: 5,  nationality: '🇧🇷' },
  { id: 'ALB', name: 'Alexander Albon',     team: 'Williams',         teamColor: '#64C4FF', number: 23, nationality: '🇹🇭' },
  { id: 'SAI', name: 'Carlos Sainz',        team: 'Williams',         teamColor: '#64C4FF', number: 55, nationality: '🇪🇸' },
  { id: 'LAW', name: 'Liam Lawson',         team: 'Racing Bulls',     teamColor: '#6692FF', number: 30, nationality: '🇳🇿' },
  { id: 'HAD', name: 'Isack Hadjar',        team: 'Racing Bulls',     teamColor: '#6692FF', number: 6,  nationality: '🇫🇷' },
]

export const DRIVER_MAP = Object.fromEntries(DRIVERS_2025.map((d) => [d.id, d]))

// Statistical tendencies for driver panel (seed data — replaced by API when connected)
// podiumRate: historical % of races finishing top 3
// top10Rate:  historical % of races finishing top 10
export const DRIVER_STATS = {
  VER: { podiumRate: 0.72, top10Rate: 0.92, recentFinishes: [1, 2, 1, 1, 3] },
  NOR: { podiumRate: 0.52, top10Rate: 0.88, recentFinishes: [2, 1, 3, 2, 4] },
  LEC: { podiumRate: 0.41, top10Rate: 0.82, recentFinishes: [3, 2, 1, 5, 2] },
  HAM: { podiumRate: 0.38, top10Rate: 0.85, recentFinishes: [4, 3, 2, 6, 3] },
  RUS: { podiumRate: 0.29, top10Rate: 0.81, recentFinishes: [5, 4, 7, 3, 6] },
  PIA: { podiumRate: 0.31, top10Rate: 0.79, recentFinishes: [3, 5, 4, 2, 8] },
  SAI: { podiumRate: 0.28, top10Rate: 0.77, recentFinishes: [6, 3, 5, 8, 4] },
  ALO: { podiumRate: 0.22, top10Rate: 0.72, recentFinishes: [7, 6, 9, 4, 7] },
  TSU: { podiumRate: 0.08, top10Rate: 0.58, recentFinishes: [10, 8, 12, 7, 11] },
  LAW: { podiumRate: 0.05, top10Rate: 0.52, recentFinishes: [11, 9, 14, 10, 13] },
  GAS: { podiumRate: 0.06, top10Rate: 0.55, recentFinishes: [9, 11, 8, 13, 10] },
  STR: { podiumRate: 0.05, top10Rate: 0.50, recentFinishes: [12, 10, 11, 14, 9] },
  ANT: { podiumRate: 0.10, top10Rate: 0.60, recentFinishes: [8, 7, 10, 9, 12] },
  ALB: { podiumRate: 0.02, top10Rate: 0.45, recentFinishes: [13, 12, 13, 11, 14] },
  HUL: { podiumRate: 0.02, top10Rate: 0.43, recentFinishes: [14, 13, 15, 12, 15] },
  OCO: { podiumRate: 0.03, top10Rate: 0.44, recentFinishes: [15, 14, 16, 16, 16] },
  BEA: { podiumRate: 0.02, top10Rate: 0.35, recentFinishes: [16, 15, 17, 15, 17] },
  DOO: { podiumRate: 0.01, top10Rate: 0.30, recentFinishes: [17, 16, 18, 17, 18] },
  HAD: { podiumRate: 0.01, top10Rate: 0.28, recentFinishes: [18, 17, 19, 18, 19] },
  BOR: { podiumRate: 0.01, top10Rate: 0.25, recentFinishes: [19, 18, 20, 19, 20] },
}
