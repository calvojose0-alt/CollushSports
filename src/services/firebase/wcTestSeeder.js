// WC 2026 – Test Data Seeder
// Creates 3 simulated users with full group-stage + playoff bracket picks.
// Adds 2 of them to the first "Test Group 1" found for the WC game.
//
// Usage: called from WCAdminPage "Dev Tools" tab.

import { supabase } from '@/supabase'

const WC_GAME_ID     = 'wc2026'
const GROUP_LETTERS  = ['A','B','C','D','E','F','G','H','I','J','K','L']

// ── 3 test users ─────────────────────────────────────────────────────────────
export const TEST_USERS = [
  { userId: '00000000-0000-0000-0000-000000000001', displayName: 'Carlos Rivera' },
  { userId: '00000000-0000-0000-0000-000000000002', displayName: 'Sofia Mendez'  },
  { userId: '00000000-0000-0000-0000-000000000003', displayName: 'James Wright'  },
]

// ── Deterministic score generator ─────────────────────────────────────────────
// Produces varied but realistic scores for each (group, matchNum, userIdx) combo.
const SCORE_TABLE = [
  [2,0],[1,0],[2,1],[1,1],[0,0],[0,1],[1,2],[0,2],[3,0],[1,0],[2,2],[3,1],
  [1,0],[2,0],[0,1],[1,1],[2,1],[1,0],[0,0],[1,2],[2,0],[2,1],[0,1],[1,1],
]
function seedScore(groupIdx, matchIdx, userIdx) {
  const i = (groupIdx * 7 + matchIdx * 3 + userIdx * 11) % SCORE_TABLE.length
  return SCORE_TABLE[i]
}

// ── Group stage picks (72 per user) ───────────────────────────────────────────
function buildGroupPicks(userId, userIdx) {
  const rows = []
  GROUP_LETTERS.forEach((g, gIdx) => {
    for (let n = 1; n <= 6; n++) {
      const matchId = `gs_${g}${n}`
      const [homeScore, awayScore] = seedScore(gIdx, n - 1, userIdx)
      rows.push({
        id:           `${WC_GAME_ID}_${userId}_${matchId}`,
        user_id:      userId,
        match_id:     matchId,
        home_score:   homeScore,
        away_score:   awayScore,
        points_earned:      null,
        is_exact:           null,
        is_correct_outcome: null,
      })
    }
  })
  return rows
}

// ── Playoff bracket definitions (r32 = qualifiers, then round-by-round winners)
// Teams listed are who each user predicts to REACH that round.
// r32  = top-2 qualifiers from each group  (24 teams)
// r16  = 16 teams advancing past R32
// qf   = 8 teams advancing past R16
// sf   = 4 teams advancing past QF
// winner = champion

const BRACKETS = [
  // ── Carlos Rivera — Brazil champion ─────────────────────────────────────────
  {
    r32: [
      'mexico','southkorea',
      'canada','switzerland',
      'brazil','morocco',
      'usa','australia',
      'germany','ivorycoast',
      'netherlands','japan',
      'belgium','iran',
      'spain','uruguay',
      'france','senegal',
      'argentina','austria',
      'portugal','colombia',
      'england','croatia',
    ],
    r16:    ['mexico','canada','brazil','usa','germany','netherlands','belgium','spain','france','argentina','portugal','england','morocco','southkorea','iran','uruguay'],
    qf:     ['brazil','germany','spain','france','argentina','portugal','england','netherlands'],
    sf:     ['brazil','france','spain','argentina'],
    winner: ['brazil'],
  },

  // ── Sofia Mendez — Argentina champion ────────────────────────────────────────
  {
    r32: [
      'mexico','southkorea',
      'canada','switzerland',
      'brazil','morocco',
      'usa','turkey',
      'germany','ivorycoast',
      'netherlands','sweden',
      'belgium','egypt',
      'spain','uruguay',
      'france','senegal',
      'argentina','austria',
      'portugal','colombia',
      'england','croatia',
    ],
    r16:    ['mexico','canada','brazil','usa','germany','netherlands','belgium','spain','france','argentina','portugal','england','switzerland','turkey','senegal','uruguay'],
    qf:     ['argentina','spain','france','germany','brazil','portugal','netherlands','england'],
    sf:     ['argentina','france','brazil','spain'],
    winner: ['argentina'],
  },

  // ── James Wright — France champion ───────────────────────────────────────────
  {
    r32: [
      'mexico','czechrepublic',
      'canada','qatar',
      'brazil','morocco',
      'usa','australia',
      'germany','ecuador',
      'netherlands','japan',
      'belgium','iran',
      'spain','saudiarabia',
      'france','norway',
      'argentina','jordan',
      'portugal','drcongo',
      'england','ghana',
    ],
    r16:    ['morocco','canada','brazil','usa','germany','netherlands','belgium','spain','france','argentina','portugal','england','mexico','czechrepublic','iran','australia'],
    qf:     ['france','england','germany','netherlands','brazil','portugal','argentina','spain'],
    sf:     ['france','germany','brazil','argentina'],
    winner: ['france'],
  },
]

// ── Main seeder function ───────────────────────────────────────────────────────
export async function seedTestUsers(onProgress) {
  const log = (msg) => { console.log(msg); onProgress?.(msg) }

  // 1. Insert wc_players ───────────────────────────────────────────────────────
  log('Creating 3 test players…')
  const playerRows = TEST_USERS.map(({ userId, displayName }) => ({
    id:           `${WC_GAME_ID}_${userId}`,
    user_id:      userId,
    display_name: displayName,
    total_points:   0,
    exact_hits:     0,
    outcome_hits:   0,
    playoff_points: 0,
  }))
  const { error: playerErr } = await supabase
    .from('wc_players')
    .upsert(playerRows, { onConflict: 'id' })
  if (playerErr) throw new Error(`wc_players: ${playerErr.message}`)
  log('✓ Players created')

  // 2. Insert group stage picks (72 per user) ──────────────────────────────────
  log('Inserting group stage picks…')
  const allGroupPicks = TEST_USERS.flatMap(({ userId }, i) => buildGroupPicks(userId, i))
  // Upsert in batches of 100 to stay within Supabase limits
  for (let i = 0; i < allGroupPicks.length; i += 100) {
    const batch = allGroupPicks.slice(i, i + 100)
    const { error } = await supabase.from('wc_picks').upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`wc_picks batch ${i}: ${error.message}`)
  }
  log(`✓ ${allGroupPicks.length} group stage picks inserted`)

  // 3. Insert playoff bracket picks ────────────────────────────────────────────
  log('Inserting playoff picks…')
  const playoffRows = []
  TEST_USERS.forEach(({ userId }, i) => {
    const b = BRACKETS[i]
    const rounds = ['r32', 'r16', 'qf', 'sf', 'winner']
    rounds.forEach((round) => {
      playoffRows.push({
        id:       `${WC_GAME_ID}_${userId}_${round}`,
        user_id:  userId,
        round,
        team_ids: b[round],
      })
    })
  })
  const { error: poErr } = await supabase
    .from('wc_playoff_picks')
    .upsert(playoffRows, { onConflict: 'id' })
  if (poErr) throw new Error(`wc_playoff_picks: ${poErr.message}`)
  log(`✓ ${playoffRows.length} playoff pick records inserted`)

  log('🎉 Seeding complete!')
  return { usersCreated: TEST_USERS.length, picksCreated: allGroupPicks.length + playoffRows.length }
}

// ── Cleanup: remove all test data ─────────────────────────────────────────────
export async function removeTestUsers(onProgress) {
  const log = (msg) => { console.log(msg); onProgress?.(msg) }
  const userIds = TEST_USERS.map((u) => u.userId)

  log('Removing test group memberships…')
  await supabase.from('group_members').delete().in('user_id', userIds)

  log('Removing playoff picks…')
  await supabase.from('wc_playoff_picks').delete().in('user_id', userIds)

  log('Removing group stage picks…')
  await supabase.from('wc_picks').delete().in('user_id', userIds)

  log('Removing players…')
  const playerIds = userIds.map((id) => `${WC_GAME_ID}_${id}`)
  await supabase.from('wc_players').delete().in('id', playerIds)

  log('🗑 Test users removed.')
}
