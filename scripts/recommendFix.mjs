import fs from 'fs'
import { WC_GROUPS, WC_TEAMS } from '../src/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '../src/data/wc2026Schedule'

// ── standings (faithful copy) ──
function breakGroupTie(tied, vm) {
  const ids = new Set(tied.map(t => t.teamId)); const mini = {}
  tied.forEach(t => { mini[t.teamId] = { pts: 0, gf: 0, ga: 0 } })
  vm.forEach(({ homeTeam, awayTeam, hs, as }) => {
    if (!ids.has(homeTeam) || !ids.has(awayTeam)) return
    mini[homeTeam].gf += hs; mini[homeTeam].ga += as; mini[awayTeam].gf += as; mini[awayTeam].ga += hs
    if (hs > as) mini[homeTeam].pts += 3; else if (hs < as) mini[awayTeam].pts += 3
    else { mini[homeTeam].pts++; mini[awayTeam].pts++ }
  })
  return [...tied].sort((a, b) => {
    const ma = mini[a.teamId], mb = mini[b.teamId], agd = ma.gf - ma.ga, bgd = mb.gf - mb.ga
    if (mb.pts !== ma.pts) return mb.pts - ma.pts
    if (bgd !== agd) return bgd - agd
    if (mb.gf !== ma.gf) return mb.gf - ma.gf
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0
  })
}
function standings(group, picks) {
  const teams = WC_GROUPS[group] || []; const s = {}
  teams.forEach(t => { s[t] = { teamId: t, gf: 0, ga: 0, gd: 0, pts: 0 } })
  const vm = []
  picks.forEach(({ homeTeam, awayTeam, homeScore, awayScore }) => {
    if (homeScore == null || homeScore === '' || awayScore == null || awayScore === '') return
    const hs = parseInt(homeScore, 10), as = parseInt(awayScore, 10)
    if (isNaN(hs) || isNaN(as) || !s[homeTeam] || !s[awayTeam]) return
    vm.push({ homeTeam, awayTeam, hs, as })
    s[homeTeam].gf += hs; s[homeTeam].ga += as; s[awayTeam].gf += as; s[awayTeam].ga += hs
    if (hs > as) s[homeTeam].pts += 3; else if (hs < as) s[awayTeam].pts += 3
    else { s[homeTeam].pts++; s[awayTeam].pts++ }
  })
  const sorted = Object.values(s).map(x => ({ ...x, gd: x.gf - x.ga }))
  sorted.sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || 0)
  const key = x => `${x.pts}|${x.gd}|${x.gf}`; const ranked = []; let i = 0
  while (i < sorted.length) { let j = i; while (j < sorted.length && key(sorted[j]) === key(sorted[i])) j++
    const t = sorted.slice(i, j); ranked.push(...(t.length > 1 ? breakGroupTie(t, vm) : t)); i = j }
  return ranked
}
const GL = ['A','B','C','D','E','F','G','H','I','J','K','L']
function buildSlotMap(pbm) {
  const map = {}, third = []
  GL.forEach(g => {
    const list = GROUP_MATCHES.filter(m => m.group === g)
    const picks = list.map(m => ({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, homeScore: pbm[m.id]?.homeScore ?? null, awayScore: pbm[m.id]?.awayScore ?? null }))
    const st = standings(g, picks)
    st.forEach((x, idx) => { map[`${idx + 1}${g}`] = x.teamId })
    if (st[2]) third.push({ group: g, ...st[2] })
  })
  third.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  const q = third.slice(0, 8), codes = []
  KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
    if (/^3[A-L]{2,}/.test(m.homeSlot) && !codes.includes(m.homeSlot)) codes.push(m.homeSlot)
    if (/^3[A-L]{2,}/.test(m.awaySlot) && !codes.includes(m.awaySlot)) codes.push(m.awaySlot)
  })
  const used = new Set(), bt = {}
  ;(function rec(i){ if (i===codes.length) return true; const el=codes[i].slice(1).split('')
    for (const t of q){ if(!used.has(t.teamId)&&el.includes(t.group)){ used.add(t.teamId); bt[codes[i]]=t.teamId; if(rec(i+1))return true; used.delete(t.teamId); delete bt[codes[i]] } } return false })(0)
  Object.assign(map, bt); return map
}
const tn = id => WC_TEAMS[id]?.name || id
function slotLabel(slot, slotMap) {
  const team = slotMap[slot]
  let seed = slot
  if (/^1[A-L]$/.test(slot)) seed = `1st Grp ${slot[1]}`
  else if (/^2[A-L]$/.test(slot)) seed = `2nd Grp ${slot[1]}`
  else if (/^3[A-L]{2,}/.test(slot)) seed = `Best-3rd`
  return { team, label: `${tn(team)} (${seed})` }
}

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const BASE = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY, H = { apikey: KEY, Authorization: 'Bearer ' + KEY }
async function fetchAll(t, sel) { const out = []; let o = 0; for (;;) { const r = await fetch(`${BASE}/rest/v1/${t}?select=${sel}&limit=1000&offset=${o}`, { headers: H }); const rows = await r.json(); out.push(...rows); if (rows.length < 1000) break; o += 1000 } return out }

const matchById = Object.fromEntries(KNOCKOUT_MATCHES.map(m => [m.id, m]))
const feeders = m => [m.homeSlot, m.awaySlot].map(s => s?.startsWith('W_') ? s.slice(2) : null)
const ROUND_OF = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'finalist', final: 'winner' }
const ROUND_LABEL = { r16: 'R16', qf: 'QF', sf: 'SF', finalist: 'Final', winner: 'Champion' }

const TARGETS = process.argv.slice(2) // entry names

;(async () => {
  const [players, gp, pp] = await Promise.all([
    fetchAll('wc_players', 'user_id,entry_number,entry_name,display_name'),
    fetchAll('wc_picks', 'user_id,entry_number,match_id,home_score,away_score'),
    fetchAll('wc_playoff_picks', 'user_id,entry_number,round,team_ids'),
  ])
  const gbk = {}; gp.forEach(p => { const k = `${p.user_id}_${p.entry_number ?? 1}`; (gbk[k] ||= {})[p.match_id] = { homeScore: p.home_score, awayScore: p.away_score } })
  const pbk = {}; pp.forEach(p => { const k = `${p.user_id}_${p.entry_number ?? 1}`; (pbk[k] ||= {})[p.round] = new Set(p.team_ids || []) })

  for (const pl of players) {
    const k = `${pl.user_id}_${pl.entry_number ?? 1}`
    const slotMap = buildSlotMap(gbk[k] || {})
    const sets = pbk[k] || {}
    if (!sets.r16 || sets.r16.size === 0) continue // skip the never-finished ones
    const deeperRounds = (team) => ['r16','qf','sf','finalist','winner'].filter(r => sets[r]?.has(team)).map(r => ROUND_LABEL[r] || r)

    const lines = []
    KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
      const adv = sets.r16
      const home = slotLabel(m.homeSlot, slotMap), away = slotLabel(m.awaySlot, slotMap)
      const inR16 = [home.team, away.team].filter(t => adv.has(t))
      if (inR16.length === 2) {
        lines.push(`\n  ⚠ DUPLICATE @ ${m.id}: both advanced`)
        ;[home, away].forEach(s => lines.push(`      ${s.label}  → deeper: ${deeperRounds(s.team).join(' → ') || 'none'}`))
      } else if (inR16.length === 0) {
        lines.push(`\n  ⚠ EMPTY (TBD) @ ${m.id}: neither advanced`)
        ;[home, away].forEach(s => lines.push(`      ${s.label}  → deeper: ${deeperRounds(s.team).join(' → ') || 'none'}`))
      }
    })
    if (!lines.length) continue
    // Orphans: teams in r16 that aren't in ANY resolved R32 slot for this user.
    const r32Participants = new Set()
    KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
      ;[m.homeSlot, m.awaySlot].forEach(s => { const t = slotMap[s]; if (t) r32Participants.add(t) })
    })
    const orphans = [...sets.r16].filter(t => !r32Participants.has(t))
    console.log(`\n══════════════════════════════════════════`)
    console.log(`${pl.display_name} — ${pl.entry_name}  [r16 size: ${sets.r16.size}]  uid=${pl.user_id} entry=${pl.entry_number ?? 1}`)
    lines.forEach(l => console.log(l))
    if (orphans.length) console.log(`\n  ⚑ ORPHAN r16 teams (not in any R32 slot): ${orphans.map(t => `${tn(t)} [deeper: ${deeperRounds(t).join(' → ') || 'none'}]`).join(', ')}`)
  }
})().catch(e => { console.error('FATAL', e); process.exit(1) })
