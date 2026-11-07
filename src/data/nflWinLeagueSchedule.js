// 2026 NFL regular-season schedule (Weeks 1–18), as [away, home] matchups per
// week using the abbreviations in NFL_WL_TEAMS. Drives the admin's per-game
// results entry. Teams absent from a week are on a bye (no game, no points).
//
// Validated: 272 games, every team plays 17 games + 1 bye, no team twice/week.
// Source: ESPN NFL schedule, 2026 regular season.

export const NFL_2026_SCHEDULE = {
  1: [
    ['NE','SEA'], ['SF','LAR'], ['TB','CIN'], ['NO','DET'], ['NYJ','TEN'], ['BAL','IND'],
    ['ATL','PIT'], ['CHI','CAR'], ['CLE','JAX'], ['BUF','HOU'], ['MIA','LV'], ['GB','MIN'],
    ['WAS','PHI'], ['ARI','LAC'], ['DAL','NYG'], ['DEN','KC'],
  ],
  2: [
    ['DET','BUF'], ['CAR','ATL'], ['MIN','CHI'], ['PHI','TEN'], ['PIT','NE'], ['GB','NYJ'],
    ['CLE','TB'], ['NO','BAL'], ['CIN','HOU'], ['JAX','DEN'], ['LV','LAC'], ['WAS','DAL'],
    ['SEA','ARI'], ['MIA','SF'], ['IND','KC'], ['NYG','LAR'],
  ],
  3: [
    ['ATL','GB'], ['LAC','BUF'], ['CAR','CLE'], ['NYJ','DET'], ['HOU','IND'], ['KC','MIA'],
    ['TEN','NYG'], ['CIN','PIT'], ['SEA','WAS'], ['NE','JAX'], ['ARI','SF'], ['MIN','TB'],
    ['BAL','DAL'], ['LV','NO'], ['LAR','DEN'], ['PHI','CHI'],
  ],
  4: [
    ['PIT','CLE'], ['IND','WAS'], ['NE','BUF'], ['NYJ','CHI'], ['JAX','CIN'], ['ARI','NYG'],
    ['LAR','PHI'], ['GB','TB'], ['TEN','BAL'], ['DAL','HOU'], ['MIA','MIN'], ['KC','LV'],
    ['DEN','SF'], ['LAC','SEA'], ['DET','CAR'], ['ATL','NO'],
  ],
  5: [
    ['TB','DAL'], ['PHI','JAX'], ['HOU','TEN'], ['CIN','MIA'], ['LV','NE'], ['MIN','NO'],
    ['CLE','NYJ'], ['IND','PIT'], ['NYG','WAS'], ['DEN','LAC'], ['CHI','GB'], ['DET','ARI'],
    ['SF','SEA'], ['BAL','ATL'], ['BUF','LAR'],
  ],
  6: [
    ['SEA','DEN'], ['HOU','JAX'], ['CHI','ATL'], ['BAL','CLE'], ['TEN','IND'], ['NYJ','NE'],
    ['NO','NYG'], ['CAR','PHI'], ['PIT','TB'], ['ARI','LAR'], ['LAC','KC'], ['BUF','LV'],
    ['DAL','GB'], ['WAS','SF'],
  ],
  7: [
    ['NE','CHI'], ['PIT','NO'], ['SF','ATL'], ['CLE','TEN'], ['IND','MIN'], ['MIA','NYJ'],
    ['TB','CAR'], ['CIN','BAL'], ['NYG','HOU'], ['DEN','ARI'], ['GB','DET'], ['LAR','LV'],
    ['KC','SEA'], ['DAL','PHI'],
  ],
  8: [
    ['CAR','GB'], ['BAL','BUF'], ['TEN','CIN'], ['ARI','DAL'], ['MIN','DET'], ['LV','NYJ'],
    ['CLE','PIT'], ['ATL','TB'], ['IND','JAX'], ['LAC','LAR'], ['KC','DEN'], ['NE','MIA'],
    ['PHI','WAS'], ['CHI','SEA'],
  ],
  9: [
    ['JAX','BAL'], ['CIN','ATL'], ['DAL','IND'], ['NYJ','KC'], ['DET','MIA'], ['CLE','NO'],
    ['NYG','PHI'], ['LAR','WAS'], ['DEN','CAR'], ['HOU','LAC'], ['LV','SF'], ['GB','NE'],
    ['ARI','SEA'], ['TB','CHI'], ['BUF','MIN'],
  ],
  10: [
    ['WAS','NYG'], ['NE','DET'], ['KC','ATL'], ['HOU','CLE'], ['MIN','GB'], ['JAX','TEN'],
    ['MIA','IND'], ['CAR','NO'], ['BUF','NYJ'], ['SEA','LV'], ['LAR','ARI'], ['SF','DAL'],
    ['PIT','CIN'], ['LAC','BAL'],
  ],
  11: [
    ['IND','HOU'], ['MIA','BUF'], ['NO','CHI'], ['TEN','DAL'], ['TB','DET'], ['ARI','KC'],
    ['JAX','NYG'], ['BAL','CAR'], ['NYJ','LAC'], ['LV','DEN'], ['PIT','PHI'], ['MIN','SF'],
    ['CIN','WAS'],
  ],
  12: [
    ['GB','LAR'], ['CHI','DET'], ['PHI','DAL'], ['KC','BUF'], ['DEN','PIT'], ['NO','CIN'],
    ['LV','CLE'], ['NYG','IND'], ['NYJ','MIA'], ['ATL','MIN'], ['BAL','HOU'], ['TEN','JAX'],
    ['WAS','ARI'], ['SEA','SF'], ['NE','LAC'], ['CAR','TB'],
  ],
  13: [
    ['KC','LAR'], ['DET','ATL'], ['JAX','CHI'], ['CIN','CLE'], ['WAS','TEN'], ['GB','NO'],
    ['SF','NYG'], ['LAC','TB'], ['MIA','DEN'], ['PHI','ARI'], ['CAR','MIN'], ['BUF','NE'],
    ['HOU','PIT'], ['DAL','SEA'],
  ],
  14: [
    ['MIN','NE'], ['ATL','CLE'], ['TEN','DET'], ['CHI','MIA'], ['DEN','NYJ'], ['IND','PHI'],
    ['HOU','WAS'], ['NO','CAR'], ['TB','BAL'], ['LAC','LV'], ['KC','CIN'], ['LAR','SF'],
    ['NYG','SEA'], ['BUF','GB'], ['PIT','JAX'],
  ],
  15: [
    ['SF','LAC'], ['SEA','PHI'], ['CHI','BUF'], ['MIA','GB'], ['IND','TEN'], ['CLE','NYG'],
    ['BAL','PIT'], ['NO','TB'], ['ATL','WAS'], ['CIN','CAR'], ['JAX','HOU'], ['NYJ','ARI'],
    ['DEN','LV'], ['DAL','LAR'], ['DET','MIN'], ['NE','KC'],
  ],
  16: [
    ['HOU','PHI'], ['GB','CHI'], ['BUF','DEN'], ['LAR','SEA'], ['LAC','MIA'], ['ARI','NO'],
    ['NE','NYJ'], ['CLE','BAL'], ['TEN','LV'], ['SF','KC'], ['JAX','DAL'], ['NYG','DET'],
    ['TB','ATL'], ['CIN','IND'], ['WAS','MIN'], ['CAR','PIT'],
  ],
  17: [
    ['BAL','CIN'], ['NO','ATL'], ['IND','CLE'], ['NYG','DAL'], ['PIT','TEN'], ['BUF','MIA'],
    ['MIN','NYJ'], ['SEA','CAR'], ['LV','ARI'], ['DET','CHI'], ['PHI','SF'], ['HOU','GB'],
    ['DEN','NE'], ['KC','LAC'], ['LAR','TB'], ['WAS','JAX'],
  ],
  18: [
    ['NYJ','BUF'], ['CLE','CIN'], ['LAC','DEN'], ['DET','GB'], ['JAX','IND'], ['LV','KC'],
    ['SEA','LAR'], ['CHI','MIN'], ['MIA','NE'], ['TB','NO'], ['PHI','NYG'], ['SF','ARI'],
    ['DAL','WAS'], ['ATL','CAR'], ['PIT','BAL'], ['TEN','HOU'],
  ],
}
