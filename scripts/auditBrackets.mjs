import fs from 'fs'
import { WC_GROUPS, WC_TEAMS } from '../src/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '../src/data/wc2026Schedule'

// ── Faithful copy of the engine's standings logic ──────────────────────────────
function breakGroupTie(tiedTeams, validMatches) {
  const ids = new Set(tiedTeams.map((t) => t.teamId))
  const mini = {}
  tiedTeams.forEach((t) => { mini[t.teamId] = { pts: 0, gf: 0, ga: 0 } })
  validMatches.forEach(({ homeTeam, awayTeam, hs, as }) => {
    if (!ids.has(homeTeam) || !ids.has(awayTeam)) return
    mini[homeTeam].gf += hs; mini[homeTeam].ga += as
    mini[awayTeam].gf += as; mini[awayTeam].ga += hs
    if (hs > as) mini[homeTeam].pts += 3
    else if (hs < as) mini[awayTeam].pts += 3
    else { mini[homeTeam].pts++; mini[awayTeam].pts++ }
  })
  return [...tiedTeams].sort((a, b) => {
    const ma = mini[a.teamId], mb = mini[b.teamId]
    const agd = ma.gf - ma.ga, bgd = mb.gf - mb.ga
    if (mb.pts !== ma.pts) return mb.pts - ma.pts
    if (bgd !== agd) return bgd - agd
    if (mb.gf !== ma.gf) return mb.gf - ma.gf
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0
  })
}
function computeGroupStandings(groupId, picks) {
  const teams = WC_GROUPS[groupId] || []
  const standings = {}
  teams.forEach((t) => { standings[t] = { teamId: t, gf: 0, ga: 0, gd: 0, pts: 0 } })
  const validMatches = []
  picks.forEach(({ homeTeam, awayTeam, homeScore, awayScore }) => {
    if (homeScore === null || homeScore === undefined || homeScore === '') return
    if (awayScore === null || awayScore === undefined || awayScore === '') return
    const hs = parseInt(homeScore, 10), as = parseInt(awayScore, 10)
    if (isNaN(hs) || isNaN(as)) return
    if (!standings[homeTeam] || !standings[awayTeam]) return
    validMatches.push({ homeTeam, awayTeam, hs, as })
    standings[homeTeam].gf += hs; standings[homeTeam].ga += as
    standings[awayTeam].gf += as; standings[awayTeam].ga += hs
    if (hs > as) standings[homeTeam].pts += 3
    else if (hs < as) standings[awayTeam].pts += 3
    else { standings[homeTeam].pts++; standings[awayTeam].pts++ }
  })
  const sorted = Object.values(standings).map((s) => ({ ...s, gd: s.gf - s.ga }))
  sorted.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || 0)
  const key = (s) => `${s.pts}|${s.gd}|${s.gf}`
  const ranked = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j < sorted.length && key(sorted[j]) === key(sorted[i])) j++
    const tied = sorted.slice(i, j)
    if (tied.length > 1) ranked.push(...breakGroupTie(tied, validMatches))
    else ranked.push(tied[0])
    i = j
  }
  return ranked
}

// ── Build slotMap from a user's group picks (mirrors BracketPage) ───────────────
const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L']
function buildSlotMap(picksByMatchId) {
  const map = {}
  const allThird = []
  GROUP_LETTERS.forEach((group) => {
    const list = GROUP_MATCHES.filter((m) => m.group === group)
    const picks = list.map((m) => {
      const p = picksByMatchId[m.id]
      return { homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: p?.homeScore ?? null, awayScore: p?.awayScore ?? null }
    })
    const st = computeGroupStandings(group, picks)
    st.forEach((s, idx) => { map[`${idx + 1}${group}`] = s.teamId })
    if (st[2]) allThird.push({ group, ...st[2] })
  })
  allThird.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  const qualified = allThird.slice(0, 8)
  const codes = []
  KNOCKOUT_MATCHES.filter((m) => m.stage === 'r32').forEach((m) => {
    if (/^3[A-L]{2,}/.test(m.homeSlot) && !codes.includes(m.homeSlot)) codes.push(m.homeSlot)
    if (/^3[A-L]{2,}/.test(m.awaySlot) && !codes.includes(m.awaySlot)) codes.push(m.awaySlot)
  })
  const used = new Set(), bt = {}
  ;(function rec(i) {
    if (i === codes.length) return true
    const elig = codes[i].slice(1).split('')
    for (const t of qualified) {
      if (!used.has(t.teamId) && elig.includes(t.group)) {
        used.add(t.teamId); bt[codes[i]] = t.teamId
        if (rec(i + 1)) return true
        used.delete(t.teamId); delete bt[codes[i]]
      }
    }
    return false
  })(0)
  Object.assign(map, bt)
  return map
}
function resolveSlot(slot, slotMap) {
  if (!slot) return null
  if (slot.startsWith('W_') || slot.startsWith('L_') || slot.startsWith('3rd')) return null
  return slotMap[slot] || null
}

// ── Supabase REST helpers (no RLS → anon key reads everything) ──────────────────
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const BASE = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY }
async function fetchAll(table, select) {
  const out = []; let offset = 0
  for (;;) {
    const r = await fetch(`${BASE}/rest/v1/${table}?select=${select}&limit=1000&offset=${offset}`, { headers: H })
    const rows = await r.json()
    if (!Array.isArray(rows)) throw new Error(JSON.stringify(rows))
    out.push(...rows)
    if (rows.length < 1000) break
    offset += 1000
  }
  return out
}

// ── Build the knockout feeder tree (matchId → [feederMatchId, feederMatchId]) ────
const matchById = Object.fromEntries(KNOCKOUT_MATCHES.map((m) => [m.id, m]))
function feeders(m) {
  const f = (slot) => (slot && slot.startsWith('W_')) ? slot.slice(2) : null
  return [f(m.homeSlot), f(m.awaySlot)]
}
const ROUND_OF = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'finalist', final: 'winner' }

// ── Audit one entry ─────────────────────────────────────────────────────────────
function auditEntry(slotMap, sets) {
  const issues = []
  const need = { r32: 32, r16: 16, qf: 8, sf: 4, finalist: 2, winner: 1 }

  // Count + subset-chain checks
  const chain = ['r32', 'r16', 'qf', 'sf', 'finalist', 'winner']
  for (const r of chain) {
    const have = sets[r]?.size ?? 0
    if (have === 0) { issues.push(`${r}: empty (no picks)`); continue }
    if (have !== need[r]) issues.push(`${r}: has ${have}, expected ${need[r]}`)
  }
  for (let k = 1; k < chain.length; k++) {
    const cur = sets[chain[k]], prev = sets[chain[k - 1]]
    if (!cur || !prev) continue
    const orphans = [...cur].filter((t) => !prev.has(t))
    if (orphans.length) issues.push(`${chain[k]} not in ${chain[k - 1]}: ${orphans.join(', ')}`)
  }

  // Structural pairing check: each match must send exactly one participant forward.
  // winner(match) = the participant that appears in the next round's set.
  const winnerCache = {}
  function participants(m) {
    if (m.stage === 'r32') return [resolveSlot(m.homeSlot, slotMap), resolveSlot(m.awaySlot, slotMap)]
    const [a, b] = feeders(m)
    return [winnerOf(matchById[a]), winnerOf(matchById[b])]
  }
  function winnerOf(m) {
    if (!m) return null
    if (winnerCache[m.id] !== undefined) return winnerCache[m.id]
    const advSet = sets[ROUND_OF[m.stage]]
    const parts = participants(m).filter(Boolean)
    let w = null
    if (advSet) {
      const adv = parts.filter((t) => advSet.has(t))
      if (adv.length === 1) w = adv[0]
      else if (adv.length === 0 && parts.length === 2) {
        issues.push(`${m.id} (${m.stage}): no winner picked between ${parts.map(tn).join(' / ')} → TBD downstream`)
      } else if (adv.length === 2) {
        issues.push(`${m.id} (${m.stage}): BOTH ${adv.map(tn).join(' & ')} advanced (impossible)`)
      }
    }
    winnerCache[m.id] = w
    return w
  }
  KNOCKOUT_MATCHES.forEach(winnerOf)
  return issues
}
const tn = (id) => WC_TEAMS[id]?.name || WC_TEAMS[id]?.code || id

// ── Main ────────────────────────────────────────────────────────────────────────
const ONLY = process.argv[2] // optional: entry_name to audit just one
;(async () => {
  const [players, groupPicks, playoffPicks] = await Promise.all([
    fetchAll('wc_players', 'user_id,entry_number,entry_name,display_name'),
    fetchAll('wc_picks', 'user_id,entry_number,match_id,home_score,away_score'),
    fetchAll('wc_playoff_picks', 'user_id,entry_number,round,team_ids'),
  ])

  const groupByKey = {}   // `${uid}_${en}` → { matchId: {homeScore,awayScore} }
  groupPicks.forEach((p) => {
    const k = `${p.user_id}_${p.entry_number ?? 1}`
    ;(groupByKey[k] ||= {})[p.match_id] = { homeScore: p.home_score, awayScore: p.away_score }
  })
  const poByKey = {}      // `${uid}_${en}` → { round: Set }
  playoffPicks.forEach((p) => {
    const k = `${p.user_id}_${p.entry_number ?? 1}`
    ;(poByKey[k] ||= {})[p.round] = new Set(p.team_ids || [])
  })

  // Proposed r16 swaps (remove → add) to verify they resolve cleanly.
  const SWAPS = {
    'bd28fa2b-eaa2-4d18-b2c2-4a675fdcac80_2': { remove: 'norway',  add: 'ecuador'  }, // JC Wins
    '6e071e1b-ef7d-4064-a3e0-3444ee79cec8_1': { remove: 'senegal', add: 'norway'   }, // Thales
    'c673cce9-6fce-4f08-95f2-f31de7e0669d_1': { remove: 'usa',     add: 'paraguay' }, // Jairo
    '2dd5db17-535c-4c5b-babb-4f14674afc8f_1': { remove: 'senegal', add: 'usa'      }, // Frank
  }
  if (process.env.APPLY_SWAPS) {
    for (const [k, { remove, add }] of Object.entries(SWAPS)) {
      const s = poByKey[k]?.r16
      if (s) { s.delete(remove); s.add(add) }
    }
  }

  const results = []
  for (const pl of players) {
    if (ONLY && pl.entry_name !== ONLY) continue
    const k = `${pl.user_id}_${pl.entry_number ?? 1}`
    const slotMap = buildSlotMap(groupByKey[k] || {})
    const sets = poByKey[k] || {}
    const groupCount = Object.keys(groupByKey[k] || {}).length
    const issues = auditEntry(slotMap, sets)
    results.push({ name: `${pl.display_name} — ${pl.entry_name}`, groupCount, issues })
  }

  // Report
  const bad = results.filter((r) => r.issues.length)
  console.log(`\nAudited ${results.length} entr${results.length === 1 ? 'y' : 'ies'}. ${bad.length} with inconsistencies.\n`)
  for (const r of results) {
    if (ONLY || r.issues.length) {
      console.log(`● ${r.name}  (group picks: ${r.groupCount}/72)`)
      if (!r.issues.length) console.log('   ✓ no inconsistencies')
      r.issues.forEach((i) => console.log('   ✗ ' + i))
      console.log('')
    }
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
