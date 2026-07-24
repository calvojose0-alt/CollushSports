// NFL Fantasy Manager League — League Service
// Create/join/browse leagues, manage settings, and the league's scoring profile.
import { requireSupabase, newInviteCode } from './shared'

// ── Row mappers ───────────────────────────────────────────────────────────

export function mapLeague(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    leagueType: row.league_type,
    inviteCode: row.invite_code,
    commissionerUserId: row.commissioner_user_id,
    seasonYear: row.season_year,
    status: row.status,
    budgetAmount: row.budget_amount,
    rosterMode: row.roster_mode,
    rosterTemplate: row.roster_template,
    lineupTemplate: row.lineup_template,
    startWeek: row.start_week,
    endWeek: row.end_week,
    maxMembers: row.max_members,
    moneyPerPoint: row.money_per_point,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapMember(row) {
  if (!row) return null
  return {
    id: row.id,
    leagueId: row.league_id,
    userId: row.user_id,
    teamName: row.team_name,
    role: row.role,
    balance: row.balance,
    seasonPoints: Number(row.season_points || 0),
    joinedAt: row.joined_at,
  }
}

export function mapScoringProfile(row) {
  if (!row) return null
  return {
    id: row.id,
    leagueId: row.league_id,
    pprValue: Number(row.ppr_value),
    passingYardRate: Number(row.passing_yard_rate),
    passingTdPoints: Number(row.passing_td_points),
    interceptionPoints: Number(row.interception_points),
    rushingYardRate: Number(row.rushing_yard_rate),
    receivingYardRate: Number(row.receiving_yard_rate),
    touchdownPoints: Number(row.touchdown_points),
    fumbleLostPoints: Number(row.fumble_lost_points),
    twoPointPoints: Number(row.two_point_points),
    kickerRules: row.kicker_rules,
    dstRules: row.dst_rules,
    bonusRules: row.bonus_rules,
  }
}

// ── League CRUD ───────────────────────────────────────────────────────────

/**
 * Create a league + its scoring profile + the commissioner's own member row.
 * `input` uses camelCase fields matching mapLeague()'s shape, plus
 * `pprValue`, `commissionerUserId`, `commissionerTeamName`.
 */
export async function createLeague(input) {
  const supabase = requireSupabase()

  const leaguePayload = {
    name: input.name,
    league_type: input.leagueType || 'private',
    invite_code: input.leagueType === 'private' ? newInviteCode() : null,
    commissioner_user_id: input.commissionerUserId,
    season_year: input.seasonYear,
    status: 'roster_build',
    budget_amount: input.budgetAmount ?? 50000000,
    roster_mode: input.rosterMode || 'random',
    roster_template: input.rosterTemplate || { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 2 },
    lineup_template: input.lineupTemplate || ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K'],
    start_week: input.startWeek ?? 1,
    end_week: input.endWeek ?? 18,
    max_members: input.maxMembers ?? 12,
    money_per_point: input.moneyPerPoint ?? 1000000,
  }

  const { data: league, error: leagueErr } = await supabase
    .from('nfl_leagues').insert(leaguePayload).select().single()
  if (leagueErr) throw new Error(leagueErr.message)

  const { error: profileErr } = await supabase.from('nfl_scoring_profiles').insert({
    league_id: league.id,
    ppr_value: input.pprValue ?? 0,
  })
  if (profileErr) throw new Error(profileErr.message)

  const { error: memberErr } = await supabase.from('nfl_league_members').insert({
    league_id: league.id,
    user_id: input.commissionerUserId,
    team_name: input.commissionerTeamName || 'Commissioner',
    role: 'commissioner',
    balance: leaguePayload.budget_amount,
  })
  if (memberErr) throw new Error(memberErr.message)

  return mapLeague(league)
}

export async function getLeague(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('nfl_leagues').select('*').eq('id', leagueId).maybeSingle()
  if (error) throw new Error(error.message)
  return mapLeague(data)
}

export async function listPublicLeagues() {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_leagues').select('*')
    .eq('league_type', 'public')
    .in('status', ['setup', 'roster_build', 'active'])
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map(mapLeague)
}

export async function listMyLeagues(userId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_league_members').select('league_id, nfl_leagues(*)').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data || []).map((row) => mapLeague(row.nfl_leagues)).filter(Boolean)
}

export async function updateLeagueSettings(leagueId, updates) {
  const supabase = requireSupabase()
  const dbUpdates = { updated_at: new Date().toISOString() }
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.leagueType !== undefined) dbUpdates.league_type = updates.leagueType
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.budgetAmount !== undefined) dbUpdates.budget_amount = updates.budgetAmount
  if (updates.rosterMode !== undefined) dbUpdates.roster_mode = updates.rosterMode
  if (updates.rosterTemplate !== undefined) dbUpdates.roster_template = updates.rosterTemplate
  if (updates.lineupTemplate !== undefined) dbUpdates.lineup_template = updates.lineupTemplate
  if (updates.startWeek !== undefined) dbUpdates.start_week = updates.startWeek
  if (updates.endWeek !== undefined) dbUpdates.end_week = updates.endWeek
  if (updates.maxMembers !== undefined) dbUpdates.max_members = updates.maxMembers
  if (updates.moneyPerPoint !== undefined) dbUpdates.money_per_point = updates.moneyPerPoint

  const { error } = await supabase.from('nfl_leagues').update(dbUpdates).eq('id', leagueId)
  if (error) throw new Error(error.message)
}

export async function updateScoringProfile(leagueId, updates) {
  const supabase = requireSupabase()
  const dbUpdates = { updated_at: new Date().toISOString() }
  if (updates.pprValue !== undefined) dbUpdates.ppr_value = updates.pprValue
  if (updates.passingYardRate !== undefined) dbUpdates.passing_yard_rate = updates.passingYardRate
  if (updates.passingTdPoints !== undefined) dbUpdates.passing_td_points = updates.passingTdPoints
  if (updates.interceptionPoints !== undefined) dbUpdates.interception_points = updates.interceptionPoints
  if (updates.rushingYardRate !== undefined) dbUpdates.rushing_yard_rate = updates.rushingYardRate
  if (updates.receivingYardRate !== undefined) dbUpdates.receiving_yard_rate = updates.receivingYardRate
  if (updates.touchdownPoints !== undefined) dbUpdates.touchdown_points = updates.touchdownPoints
  if (updates.fumbleLostPoints !== undefined) dbUpdates.fumble_lost_points = updates.fumbleLostPoints
  if (updates.twoPointPoints !== undefined) dbUpdates.two_point_points = updates.twoPointPoints
  if (updates.kickerRules !== undefined) dbUpdates.kicker_rules = updates.kickerRules
  if (updates.dstRules !== undefined) dbUpdates.dst_rules = updates.dstRules
  if (updates.bonusRules !== undefined) dbUpdates.bonus_rules = updates.bonusRules

  const { error } = await supabase.from('nfl_scoring_profiles').update(dbUpdates).eq('league_id', leagueId)
  if (error) throw new Error(error.message)
}

export async function getScoringProfile(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_scoring_profiles').select('*').eq('league_id', leagueId).maybeSingle()
  if (error) throw new Error(error.message)
  return mapScoringProfile(data)
}

// ── Membership ────────────────────────────────────────────────────────────

export async function getLeagueMembers(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_league_members').select('*').eq('league_id', leagueId).order('season_points', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map(mapMember)
}

async function insertMember({ leagueId, userId, teamName, balance }) {
  const supabase = requireSupabase()
  const { data, error } = await supabase.from('nfl_league_members').insert({
    league_id: leagueId, user_id: userId, team_name: teamName, role: 'manager', balance,
  }).select().single()
  if (error) {
    if (error.code === '23505') throw new Error('You have already joined this league.')
    throw new Error(error.message)
  }
  return mapMember(data)
}

export async function joinLeague({ leagueId, userId, teamName }) {
  const league = await getLeague(leagueId)
  if (!league) throw new Error('League not found.')
  if (league.status === 'complete') throw new Error('This league has already finished its season.')
  const members = await getLeagueMembers(leagueId)
  if (members.length >= league.maxMembers) throw new Error('This league is full.')
  return insertMember({ leagueId, userId, teamName, balance: league.budgetAmount })
}

export async function getLeagueByInviteCode(inviteCode) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_leagues').select('*').eq('invite_code', inviteCode.toUpperCase()).maybeSingle()
  if (error) throw new Error(error.message)
  return mapLeague(data)
}

export async function joinLeagueByInviteCode({ inviteCode, userId, teamName }) {
  const league = await getLeagueByInviteCode(inviteCode)
  if (!league) throw new Error('Invalid invite code.')
  const member = await joinLeague({ leagueId: league.id, userId, teamName })
  return { league, member }
}

// ── Realtime ──────────────────────────────────────────────────────────────

export function subscribeToLeague(leagueId, callback) {
  const supabase = requireSupabase()
  getLeague(leagueId).then(callback)
  const channel = supabase
    .channel(`nfl-league-${leagueId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nfl_leagues', filter: `id=eq.${leagueId}` },
      async () => callback(await getLeague(leagueId)))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export function subscribeToLeagueMembers(leagueId, callback) {
  const supabase = requireSupabase()
  getLeagueMembers(leagueId).then(callback)
  const channel = supabase
    .channel(`nfl-members-${leagueId}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'nfl_league_members', filter: `league_id=eq.${leagueId}` },
      async () => callback(await getLeagueMembers(leagueId)))
    .subscribe()
  return () => supabase.removeChannel(channel)
}
