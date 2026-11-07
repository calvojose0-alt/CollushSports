// Shared helpers for the NFL Fantasy Manager League service layer.
// This game requires live Supabase (see Phase 1 plan) — no localStorage
// demo-mode fallback, unlike the other single-instance games in this app.
import { supabase, isSupabaseConfigured } from '@/supabase'

export function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('NFL Fantasy Manager League requires live mode. Set VITE_APP_MODE=live with Supabase credentials configured.')
  }
  return supabase
}

export function newInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1 ambiguity
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

/** Write an audit trail row for an admin/commissioner override or system action. */
export async function writeAuditLog({ actorUserId, leagueId, actionType, entityType, entityId, before, after }) {
  const supabase = requireSupabase()
  const { error } = await supabase.from('nfl_audit_logs').insert({
    actor_user_id: actorUserId,
    league_id: leagueId ?? null,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    before_json: before ?? null,
    after_json: after ?? null,
  })
  if (error) throw new Error(error.message)
}
