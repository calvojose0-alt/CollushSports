import fs from 'fs'
import { WC_GROUPS, WC_TEAMS } from '../src/data/wc2026Teams'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '../src/data/wc2026Schedule'

function breakGroupTie(tied, vm){const ids=new Set(tied.map(t=>t.teamId));const mini={};tied.forEach(t=>{mini[t.teamId]={pts:0,gf:0,ga:0}});vm.forEach(({homeTeam,awayTeam,hs,as})=>{if(!ids.has(homeTeam)||!ids.has(awayTeam))return;mini[homeTeam].gf+=hs;mini[homeTeam].ga+=as;mini[awayTeam].gf+=as;mini[awayTeam].ga+=hs;if(hs>as)mini[homeTeam].pts+=3;else if(hs<as)mini[awayTeam].pts+=3;else{mini[homeTeam].pts++;mini[awayTeam].pts++}});return[...tied].sort((a,b)=>{const ma=mini[a.teamId],mb=mini[b.teamId],agd=ma.gf-ma.ga,bgd=mb.gf-mb.ga;if(mb.pts!==ma.pts)return mb.pts-ma.pts;if(bgd!==agd)return bgd-agd;if(mb.gf!==ma.gf)return mb.gf-ma.gf;return a.teamId<b.teamId?-1:a.teamId>b.teamId?1:0})}
function standings(group,picks){const teams=WC_GROUPS[group]||[];const s={};teams.forEach(t=>{s[t]={teamId:t,gf:0,ga:0,gd:0,pts:0}});const vm=[];picks.forEach(({homeTeam,awayTeam,homeScore,awayScore})=>{if(homeScore==null||homeScore===''||awayScore==null||awayScore==='')return;const hs=parseInt(homeScore,10),as=parseInt(awayScore,10);if(isNaN(hs)||isNaN(as)||!s[homeTeam]||!s[awayTeam])return;vm.push({homeTeam,awayTeam,hs,as});s[homeTeam].gf+=hs;s[homeTeam].ga+=as;s[awayTeam].gf+=as;s[awayTeam].ga+=hs;if(hs>as)s[homeTeam].pts+=3;else if(hs<as)s[awayTeam].pts+=3;else{s[homeTeam].pts++;s[awayTeam].pts++}});const sorted=Object.values(s).map(x=>({...x,gd:x.gf-x.ga}));sorted.sort((a,b)=>(b.pts-a.pts)||(b.gd-a.gd)||(b.gf-a.gf)||0);const key=x=>`${x.pts}|${x.gd}|${x.gf}`;const ranked=[];let i=0;while(i<sorted.length){let j=i;while(j<sorted.length&&key(sorted[j])===key(sorted[i]))j++;const t=sorted.slice(i,j);ranked.push(...(t.length>1?breakGroupTie(t,vm):t));i=j}return ranked}
const GL=['A','B','C','D','E','F','G','H','I','J','K','L']
const tn=id=>WC_TEAMS[id]?.name||id
const groupOf=id=>GL.find(g=>(WC_GROUPS[g]||[]).includes(id))

const env=Object.fromEntries(fs.readFileSync(new URL('../.env.local',import.meta.url),'utf8').split('\n').filter(Boolean).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const BASE=env.VITE_SUPABASE_URL,KEY=env.VITE_SUPABASE_ANON_KEY,H={apikey:KEY,Authorization:'Bearer '+KEY}

const UID='2dd5db17-535c-4c5b-babb-4f14674afc8f', EN=1
;(async()=>{
  const r=await fetch(`${BASE}/rest/v1/wc_picks?user_id=eq.${UID}&entry_number=eq.${EN}&select=match_id,home_score,away_score`,{headers:H})
  const gp=await r.json()
  const pbm={}; gp.forEach(p=>{pbm[p.match_id]={homeScore:p.home_score,awayScore:p.away_score}})

  // full predicted standings + best-3rd ranking
  const allThird=[]; const standByGroup={}
  GL.forEach(g=>{
    const list=GROUP_MATCHES.filter(m=>m.group===g)
    const picks=list.map(m=>({homeTeam:m.homeTeam,awayTeam:m.awayTeam,homeScore:pbm[m.id]?.homeScore??null,awayScore:pbm[m.id]?.awayScore??null}))
    const st=standings(g,picks); standByGroup[g]=st
    if(st[2])allThird.push({group:g,...st[2]})
  })
  allThird.sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf)
  const best8=new Set(allThird.slice(0,8).map(t=>t.teamId))

  const posLabel=(g,teamId)=>{
    const st=standByGroup[g]; const idx=st.findIndex(s=>s.teamId===teamId)
    if(idx===0)return `1st in Group ${g} (qualifies)`
    if(idx===1)return `2nd in Group ${g} (qualifies)`
    if(idx===2)return best8.has(teamId)?`3rd in Group ${g} — BEST-3rd (qualifies)`:`3rd in Group ${g} — NOT a best-3rd (eliminated)`
    return `${idx+1}th in Group ${g} (eliminated)`
  }
  for(const team of ['norway','senegal']){
    const g=groupOf(team)
    console.log(`${tn(team)}: ${posLabel(g,team)}`)
    console.log(`   Group ${g} predicted order: ${standByGroup[g].map((s,i)=>`${i+1}.${tn(s.teamId)}(${s.pts}p)`).join('  ')}`)
  }
})().catch(e=>console.error('ERR',e.message))
