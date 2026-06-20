import fs from 'fs'
import { WC_GROUPS, WC_TEAMS } from '../src/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '../src/data/wc2026Schedule'

// ── standings (faithful copy of engine) ──
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
// resolveSlot — faithful copy
function resolveSlot(slot, slotMap, picks) {
  if (!slot) return null
  if (slot.startsWith('W_')) return picks['ko_' + slot.slice(2)] || null
  if (slot.startsWith('3rd') || slot.startsWith('L_')) return null
  return slotMap[slot] || null
}
// reconstruct bracketPicks exactly like BracketPage
function reconstruct(slotMap, sets) {
  const r16=sets.r16, qf=sets.qf, sf=sets.sf, fin=sets.finalist, win=sets.winner
  const np = {}
  KNOCKOUT_MATCHES.filter(m=>m.stage==='r32').forEach(m=>{
    const h=resolveSlot(m.homeSlot,slotMap,{}), a=resolveSlot(m.awaySlot,slotMap,{})
    if(h&&r16.has(h))np[m.id]=h; else if(a&&r16.has(a))np[m.id]=a
  })
  KNOCKOUT_MATCHES.filter(m=>m.stage==='r16').forEach(m=>{
    const h=resolveSlot(m.homeSlot,slotMap,np), a=resolveSlot(m.awaySlot,slotMap,np)
    if(h&&qf.has(h))np[m.id]=h; else if(a&&qf.has(a))np[m.id]=a
  })
  KNOCKOUT_MATCHES.filter(m=>m.stage==='qf').forEach(m=>{
    const h=resolveSlot(m.homeSlot,slotMap,np), a=resolveSlot(m.awaySlot,slotMap,np)
    if(h&&sf.has(h))np[m.id]=h; else if(a&&sf.has(a))np[m.id]=a
  })
  KNOCKOUT_MATCHES.filter(m=>m.stage==='sf').forEach(m=>{
    const h=resolveSlot(m.homeSlot,slotMap,np), a=resolveSlot(m.awaySlot,slotMap,np)
    if(h&&fin.has(h))np[m.id]=h; else if(a&&fin.has(a))np[m.id]=a
  })
  const fm=KNOCKOUT_MATCHES.find(m=>m.stage==='final')
  if(fm){ const h=resolveSlot(fm.homeSlot,slotMap,np), a=resolveSlot(fm.awaySlot,slotMap,np)
    if(h&&win.has(h))np[fm.id]=h; else if(a&&win.has(a))np[fm.id]=a }
  return np
}
const tn = id => WC_TEAMS[id]?.name || id

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const BASE = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY, H = { apikey: KEY, Authorization: 'Bearer ' + KEY }
async function fetchAll(t, sel, q='') { const out=[]; let o=0; for(;;){ const r=await fetch(`${BASE}/rest/v1/${t}?select=${sel}&limit=1000&offset=${o}${q}`,{headers:H}); const rows=await r.json(); out.push(...rows); if(rows.length<1000)break; o+=1000 } return out }

const DISPLAY = process.argv[2] || 'Bryce'
;(async () => {
  const players = await fetchAll('wc_players','user_id,entry_number,entry_name,display_name')
  const pl = players.find(p => p.display_name === DISPLAY)
  if (!pl) { console.log('No player named', DISPLAY); return }
  const uid = pl.user_id, en = pl.entry_number ?? 1
  const gp = await fetchAll('wc_picks','match_id,home_score,away_score', `&user_id=eq.${uid}&entry_number=eq.${en}`)
  const pp = await fetchAll('wc_playoff_picks','round,team_ids', `&user_id=eq.${uid}&entry_number=eq.${en}`)
  const pbm = {}; gp.forEach(p => { pbm[p.match_id] = { homeScore: p.home_score, awayScore: p.away_score } })
  const saved = {}; pp.forEach(p => { saved[p.round] = p.team_ids || [] })
  const sets = {}; ['r16','qf','sf','finalist','winner'].forEach(r => sets[r] = new Set(saved[r] || []))

  if (process.env.SWAP_REMOVE) sets.r16.delete(process.env.SWAP_REMOVE)
  if (process.env.SWAP_ADD)    sets.r16.add(process.env.SWAP_ADD)

  const slotMap = buildSlotMap(pbm)
  const np = reconstruct(slotMap, sets)

  // Visualized set per round = winners placed advancing INTO that round
  const visual = {
    r16:      KNOCKOUT_MATCHES.filter(m=>m.stage==='r32').map(m=>np[m.id]).filter(Boolean),
    qf:       KNOCKOUT_MATCHES.filter(m=>m.stage==='r16').map(m=>np[m.id]).filter(Boolean),
    sf:       KNOCKOUT_MATCHES.filter(m=>m.stage==='qf').map(m=>np[m.id]).filter(Boolean),
    finalist: KNOCKOUT_MATCHES.filter(m=>m.stage==='sf').map(m=>np[m.id]).filter(Boolean),
    winner:   [np[KNOCKOUT_MATCHES.find(m=>m.stage==='final')?.id]].filter(Boolean),
  }
  const need = { r16:16, qf:8, sf:4, finalist:2, winner:1 }
  const lab  = { r16:'Round of 16', qf:'Quarterfinals', sf:'Semifinals', finalist:'Finalists', winner:'Champion' }

  console.log(`\nDIAGNOSIS — ${pl.display_name} / ${pl.entry_name}  (uid=${uid} entry=${en})\n`)
  if (process.env.VERBOSE) {
    console.log('--- reconstructed bracket (home / away → winner) ---')
    for (const stage of ['r32','r16','qf','sf','final']) {
      KNOCKOUT_MATCHES.filter(m=>m.stage===stage).forEach(m=>{
        const h=resolveSlot(m.homeSlot,slotMap,np), a=resolveSlot(m.awaySlot,slotMap,np)
        console.log(`  ${m.id.padEnd(10)} ${(tn(h)||'—').padEnd(15)} vs ${(tn(a)||'—').padEnd(15)} → ${tn(np[m.id])||'·· TBD ··'}`)
      })
    }
    console.log('')
  }

  for (const r of ['r16','qf','sf','finalist','winner']) {
    const savedArr = (saved[r]||[])
    const visSet = new Set(visual[r])
    const missing = savedArr.filter(t => !visSet.has(t))
    console.log(`■ ${lab[r]}  (need ${need[r]})`)
    console.log(`   SAVED (${savedArr.length}):  ${savedArr.map(tn).join(', ') || '—'}`)
    console.log(`   VISUAL(${visual[r].length}):  ${visual[r].map(tn).join(', ') || '—'}`)
    console.log(`   ► saved but NOT shown: ${missing.map(tn).join(', ') || 'none'}`)
    const tbd = need[r] - visual[r].length
    if (tbd > 0) console.log(`   ► TBD / unfilled slots: ${tbd}`)
    console.log('')
  }
})().catch(e => { console.error('FATAL', e); process.exit(1) })
