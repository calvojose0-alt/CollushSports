// NFL Fantasy Manager League — Admin/Commissioner Service
// Manual overrides for balances and roster ownership, each writing an
// audit-log entry with before/after state. Stat corrections go through
// scoringService.recordPlayerWeekStats, which already audit-logs itself.
import { requireSupabase, writeAuditLog } from './shared'

export { writeAuditLog }

export async function adjustBalance({ member, newBalance, actorUserId, reason }) {
  const supabase = requireSupabase()
  const before = { balance: member.balance }

  const { error } = await supabase.from('nfl_league_members').update({ balance: newBalance }).eq('id', member.id)
  if (error) throw new Error(error.message)

  const { error: txErr } = await supabase.from('nfl_transactions').insert({
    league_id: member.leagueId,
    transaction_type: 'admin_correction',
    to_manager_id: member.id,
    amount: newBalance - member.balance,
    notes: reason || 'Admin balance adjustment',
  })
  if (txErr) throw new Error(txErr.message)

  await writeAuditLog({
    actorUserId, leagueId: member.leagueId, actionType: 'adjust_balance',
    entityType: 'league_member', entityId: member.id, before, after: { balance: newBalance },
  })
}

/**
 * Assign or reassign a player's roster slot to a manager. Used as the
 * Phase 1 stand-in for market acquisition in "empty roster" leagues, and
 * for general ownership corrections. Removes the player from any prior
 * owner in the same league (nfl_roster_slots has a unique constraint on
 * league_id+player_id, so at most one owner can exist at a time).
 */
export async function overrideRosterOwnership({ league, toManagerId, playerId, actorUserId, purchasePrice = 0 }) {
  const supabase = requireSupabase()

  const { data: existing, error: existingErr } = await supabase
    .from('nfl_roster_slots').select('*').eq('league_id', league.id).eq('player_id', playerId).maybeSingle()
  if (existingErr) throw new Error(existingErr.message)

  if (existing) {
    const { error } = await supabase.from('nfl_roster_slots').update({
      manager_id: toManagerId, acquisition_type: 'admin_assign', purchase_price: purchasePrice,
    }).eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('nfl_roster_slots').insert({
      league_id: league.id, manager_id: toManagerId, player_id: playerId,
      acquisition_type: 'admin_assign', purchase_price: purchasePrice,
    })
    if (error) throw new Error(error.message)
  }

  const { error: valueErr } = await supabase.from('nfl_league_player_values').upsert({
    league_id: league.id, player_id: playerId, market_value: purchasePrice, purchase_price: purchasePrice,
  }, { onConflict: 'league_id,player_id' })
  if (valueErr) throw new Error(valueErr.message)

  const { error: txErr } = await supabase.from('nfl_transactions').insert({
    league_id: league.id,
    transaction_type: 'admin_assign',
    from_manager_id: existing?.manager_id ?? null,
    to_manager_id: toManagerId,
    player_id: playerId,
    amount: purchasePrice,
    notes: 'Admin roster override',
  })
  if (txErr) throw new Error(txErr.message)

  await writeAuditLog({
    actorUserId, leagueId: league.id, actionType: 'override_roster_ownership',
    entityType: 'roster_slot', entityId: playerId,
    before: existing, after: { manager_id: toManagerId, player_id: playerId },
  })
}

export async function getTransactions(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_transactions').select('*').eq('league_id', leagueId).order('executed_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
