import fs from 'fs'
import { WC_GROUPS, WC_TEAMS } from '../src/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '../src/data/wc2026Schedule'

// ── standings + slot map (faithful copies of the app logic) ──
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
function resolveSlot(slot, slotMap) {
  if (!slot || slot.startsWith('W_') || slot.startsWith('L_') || slot.startsWith('3rd')) return slot?.startsWith('W_')||slot?.startsWith('L_')||slot?.startsWith('3rd') ? null : null
  return slotMap[slot] || null
}
// derived R32 = the 32 teams the bracket auto-fills into R32 cards (what's visualized)
function derivedR32(slotMap) {
  const set = new Set()
  KNOCKOUT_MATCHES.filter(m => m.stage === 'r32').forEach(m => {
    [m.homeSlot, m.awaySlot].forEach(s => { const t = slotMap[s]; if (t) set.add(t) })
  })
  return set
}
const tn = id => WC_TEAMS[id]?.name || id

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const BASE = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY, H = { apikey: KEY, Authorization: 'Bearer ' + KEY }
async function fetchAll(t, sel, q='') { const out=[]; let o=0; for(;;){ const r=await fetch(`${BASE}/rest/v1/${t}?select=${sel}&limit=1000&offset=${o}${q}`,{headers:H}); const rows=await r.json(); if(!Array.isArray(rows))throw new Error(JSON.stringify(rows)); out.push(...rows); if(rows.length<1000)break; o+=1000 } return out }

const GROUP_NAME = process.argv[2] || 'Waterford'
;(async () => {
  const groups = await (await fetch(`${BASE}/rest/v1/groups?select=*,group_members(user_id,entry_number)&name=ilike.*${encodeURIComponent(GROUP_NAME)}*`,{headers:H})).json()
  if (!groups.length) { console.log('No group matching', GROUP_NAME); return }
  const grp = groups[0]
  const members = grp.group_members.map(m => ({ uid: m.user_id, en: m.entry_number ?? 1 }))

  const [players, gp, pp] = await Promise.all([
    fetchAll('wc_players', 'user_id,entry_number,entry_name,display_name'),
    fetchAll('wc_picks', 'user_id,entry_number,match_id,home_score,away_score'),
    fetchAll('wc_playoff_picks', 'user_id,entry_number,round,team_ids'),
  ])
  const nameOf = (uid, en) => { const p = players.find(p => p.user_id===uid && (p.entry_number??1)===en); return p ? `${p.display_name} — ${p.entry_name}` : uid }
  const gbk = {}; gp.forEach(p => { const k=`${p.user_id}_${p.entry_number??1}`; (gbk[k]||={})[p.match_id]={homeScore:p.home_score,awayScore:p.away_score} })
  const r32saved = {}; pp.forEach(p => { if(p.round==='r32'){ r32saved[`${p.user_id}_${p.entry_number??1}`]=p.team_ids||[] } })

  console.log(`\n══ ${grp.name} — R32: group-pick-derived (bracket visual) vs SAVED ══`)
  console.log(`${members.length} member entries\n`)

  const rows = []
  for (const { uid, en } of members.sort((a,b)=>nameOf(a.uid,a.en).localeCompare(nameOf(b.uid,b.en)))) {
    const k = `${uid}_${en}`
    const gpCount = Object.keys(gbk[k]||{}).length
    const slotMap = buildSlotMap(gbk[k]||{})
    const derived = derivedR32(slotMap)
    const saved = new Set(r32saved[k] || [])
    const inDerivedNotSaved = [...derived].filter(t => !saved.has(t))
    const inSavedNotDerived = [...saved].filter(t => !derived.has(t))
    const match = inDerivedNotSaved.length === 0 && inSavedNotDerived.length === 0 && saved.size === 32
    rows.push({ name: nameOf(uid,en), gpCount, savedSize: saved.size, derivedSize: derived.size, inDerivedNotSaved, inSavedNotDerived, match })
  }

  for (const r of rows) {
    const status = r.savedSize === 0 ? '— no bracket saved'
      : r.match ? '✓ MATCH (saved R32 == group picks)'
      : '✗ MISMATCH'
    console.log(`● ${r.name}`)
    console.log(`   group picks: ${r.gpCount}/72   |   saved R32: ${r.savedSize}   |   derived R32: ${r.derivedSize}   →   ${status}`)
    if (r.savedSize > 0 && !r.match) {
      if (r.inSavedNotDerived.length) console.log(`     saved but NOT in current group results: ${r.inSavedNotDerived.map(tn).join(', ')}`)
      if (r.inDerivedNotSaved.length) console.log(`     in current group results but NOT saved: ${r.inDerivedNotSaved.map(tn).join(', ')}`)
    }
    console.log('')
  }
  const mism = rows.filter(r => r.savedSize>0 && !r.match).length
  const empty = rows.filter(r => r.savedSize===0).length
  console.log(`Summary: ${rows.length} entries — ${rows.length-mism-empty} match, ${mism} mismatch, ${empty} no bracket.`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
