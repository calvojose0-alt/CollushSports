// World Cup Quiniela — "who can still win the group" engine.
// Everything except the knockout bracket is locked once the group stage ends, so
// the only variable left is which teams win the remaining knockout games. When few
// games remain we can enumerate EVERY possible bracket completion and compute, for
// each entry, the best finishing position they can still reach and — if they can
// still win — exactly what must happen. Pure client-side, exact (not modelled).

import { KNOCKOUT_MATCHES } from '@/data/wc2026Schedule'
import { WC_TEAMS } from '@/data/wc2026Teams'

const PTS = { r16: 4, qf: 6, sf: 8, finalist: 10, winner: 15 }
const MAX_LEAVES = 8192          // ~13 undecided games — keeps the memo instant
const VARIES = '__varies__'
const sn = (id) => WC_TEAMS[id]?.name || id

// entries: [{ key, exact, base, r16:Set, qf:Set, sf:Set, finalist:Set, winner:Set }]
//   base = locked non-knockout points (total - playoff), so the full knockout is
//   recomputed here from scratch and can't be double-counted.
// resultsByMatchId: { matchId: { status, homeTeam } }  (homeTeam = advancing team)
// Returns { [key]: { status:'win'|'podium'|'out', best, condition } } or null when
// too many games remain to enumerate (feature simply hides until then).
export function computeWinChances(entries, resultsByMatchId) {
  if (!entries || !entries.length) return {}

  const won = {}
  KNOCKOUT_MATCHES.forEach((m) => {
    const r = resultsByMatchId?.[m.id]
    if (r?.status === 'final' && r.homeTeam) won[m.id] = r.homeTeam
  })

  // Only knockout rounds whose participants resolve from prior winners (W_… slots)
  // can be enumerated; require R32 to be decided so every remaining slot resolves.
  const r32Undecided = KNOCKOUT_MATCHES.some((m) => m.stage === 'r32' && !won[m.id])
  const rem = ['r16', 'qf', 'sf', 'final'].flatMap((s) => KNOCKOUT_MATCHES.filter((m) => m.stage === s)).filter((m) => !won[m.id])
  if (r32Undecided || rem.length === 0 || Math.pow(2, rem.length) > MAX_LEAVES) return null

  const byStage = (s) => KNOCKOUT_MATCHES.filter((m) => m.stage === s)
  const r32M = byStage('r32'), r16M = byStage('r16'), qfM = byStage('qf'), sfM = byStage('sf')
  const finalM = KNOCKOUT_MATCHES.find((m) => m.stage === 'final')
  const resolve = (slot, dec) => (slot.startsWith('W_') ? (dec['ko_' + slot.slice(2)] ?? won['ko_' + slot.slice(2)] ?? null) : null)
  const count = (picks, reached) => { let n = 0; picks.forEach((t) => { if (reached.has(t)) n++ }); return n }

  const bestPos = {}, winCount = {}, cond = {}
  entries.forEach((e) => { bestPos[e.key] = Infinity; winCount[e.key] = 0; cond[e.key] = null })

  const dec = {}
  const evalLeaf = () => {
    const rR16 = new Set(r32M.map((m) => dec[m.id] ?? won[m.id]).filter(Boolean))
    const rQF  = new Set(r16M.map((m) => dec[m.id] ?? won[m.id]).filter(Boolean))
    const rSF  = new Set(qfM.map((m)  => dec[m.id] ?? won[m.id]).filter(Boolean))
    const rFin = new Set(sfM.map((m)  => dec[m.id] ?? won[m.id]).filter(Boolean))
    const champ = dec[finalM.id] ?? won[finalM.id]
    const tot = {}
    entries.forEach((e) => {
      tot[e.key] = e.base
        + PTS.r16 * count(e.r16, rR16)
        + PTS.qf * count(e.qf, rQF)
        + PTS.sf * count(e.sf, rSF)
        + PTS.finalist * count(e.finalist, rFin)
        + PTS.winner * (champ && e.winner.has(champ) ? 1 : 0)
    })
    entries.forEach((e) => {
      let ahead = 0
      for (const o of entries) {
        if (o === e) continue
        if (tot[o.key] > tot[e.key] || (tot[o.key] === tot[e.key] && o.exact > e.exact)) ahead++
      }
      const pos = 1 + ahead
      if (pos < bestPos[e.key]) bestPos[e.key] = pos
      if (pos === 1) {
        winCount[e.key]++
        if (cond[e.key] === null) { cond[e.key] = {}; rem.forEach((m) => { cond[e.key][m.id] = dec[m.id] ?? won[m.id] }) }
        else rem.forEach((m) => { const w = dec[m.id] ?? won[m.id]; if (cond[e.key][m.id] !== w) cond[e.key][m.id] = VARIES })
      }
    })
  }
  const recur = (i) => {
    if (i === rem.length) return evalLeaf()
    const m = rem[i]
    const home = resolve(m.homeSlot, dec), away = resolve(m.awaySlot, dec)
    if (home) { dec[m.id] = home; recur(i + 1) }
    if (away) { dec[m.id] = away; recur(i + 1) }
    delete dec[m.id]
  }
  recur(0)

  const describe = (c) => {
    if (!c) return 'Leads in almost every remaining outcome.'
    const champ = c[finalM.id] && c[finalM.id] !== VARIES ? c[finalM.id] : null
    const finalists = sfM.map((m) => c[m.id]).filter((w) => w && w !== VARIES)
    if (champ) {
      const others = finalists.filter((t) => t !== champ)
      return others.length
        ? `${sn(champ)} must win the title, with ${others.map(sn).join(' & ')} as runner-up.`
        : `${sn(champ)} must win the title.`
    }
    if (finalists.length) return `${finalists.map(sn).join(' & ')} must reach the final.`
    return 'Leads in almost every remaining outcome.'
  }

  const out = {}
  entries.forEach((e) => {
    const best = bestPos[e.key]
    if (best > 3 || best === Infinity) out[e.key] = { status: 'out', best }
    else if (best === 1) out[e.key] = { status: 'win', best, condition: describe(cond[e.key]) }
    else out[e.key] = { status: 'podium', best }
  })
  return out
}
