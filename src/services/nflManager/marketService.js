// NFL Fantasy Manager League — Market Service (Phase 2)
// Three mechanics, all sharing nfl_market_listings:
//   1. Free-agent market: commissioner opens a cycle of random unrostered
//      players, managers submit secret bids, commissioner executes the
//      cycle (highest bid wins, ties go to the earliest submission).
//   2. Manager auction: a manager puts one of THEIR OWN rostered players
//      into the currently open cycle instead of an instant sale — it's
//      bid on exactly like a free-agent listing, and a winning bid pays
//      the seller (not the league) and moves the player to the winner.
//   3. Manager sale: a manager sells their own rostered player for a
//      system-generated instant offer (95-105% of market value) — no
//      rival bidder, no cycle, executes the moment it's accepted.
import { requireSupabase, writeAuditLog } from './shared'
import { getLeagueMembers } from './leagueService'
import { POSITION_WEIGHT } from './rosterService'

// ── Row mappers ───────────────────────────────────────────────────────────

function mapCycle(row) {
  if (!row) return null
  return {
    id: row.id,
    leagueId: row.league_id,
    cycleNumber: row.cycle_number,
    status: row.status,
    openedAt: row.opened_at,
    executedAt: row.executed_at,
  }
}

function mapListing(row) {
  if (!row) return null
  return {
    id: row.id,
    leagueId: row.league_id,
    marketCycleId: row.market_cycle_id,
    playerId: row.player_id,
    listingType: row.listing_type,
    startingValue: row.starting_value,
    sellerManagerId: row.seller_manager_id,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    player: row.nfl_players ? {
      id: row.nfl_players.id,
      displayName: row.nfl_players.display_name,
      position: row.nfl_players.position,
      nflTeam: row.nfl_players.nfl_team,
      byeWeek: row.nfl_players.bye_week,
      injuryStatus: row.nfl_players.injury_status,
    } : undefined,
  }
}

function mapBid(row) {
  if (!row) return null
  return {
    id: row.id,
    listingId: row.listing_id,
    bidderManagerId: row.bidder_manager_id,
    bidAmount: row.bid_amount,
    submittedAt: row.submitted_at,
    status: row.status,
  }
}

// ── Valuation ─────────────────────────────────────────────────────────────

function estimateStartingValue(position, budgetAmount) {
  const weight = POSITION_WEIGHT[position] ?? 1
  const jitter = 0.7 + Math.random() * 0.6
  const raw = (budgetAmount / 15) * weight * jitter
  return Math.max(500000, Math.round(raw / 100000) * 100000)
}

// ── Free-agent cycles ─────────────────────────────────────────────────────

export async function getActiveCycle(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_market_cycles').select('*').eq('league_id', leagueId).eq('status', 'open')
    .order('cycle_number', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return mapCycle(data)
}

export async function getLatestCycle(leagueId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_market_cycles').select('*').eq('league_id', leagueId)
    .order('cycle_number', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return mapCycle(data)
}

export async function getCycleListings(cycleId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_market_listings').select('*, nfl_players(*)').eq('market_cycle_id', cycleId)
    .order('starting_value', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map(mapListing)
}

/** Bid counts per listing (visible to the commissioner) without exposing amounts or bidders. */
export async function getListingBidCounts(listingIds) {
  const supabase = requireSupabase()
  if (listingIds.length === 0) return {}
  const { data, error } = await supabase.from('nfl_bids').select('listing_id').in('listing_id', listingIds)
  if (error) throw new Error(error.message)
  const counts = {}
  for (const row of data || []) counts[row.listing_id] = (counts[row.listing_id] || 0) + 1
  return counts
}

/** Commissioner action: open a new cycle of random unrostered free-agent listings. */
export async function openMarketCycle({ league, actorUserId, listingCount = 10 }) {
  const supabase = requireSupabase()

  const existingOpen = await getActiveCycle(league.id)
  if (existingOpen) throw new Error('A market cycle is already open. Execute it before opening a new one.')

  const [{ data: ownedRows, error: ownedErr }, { data: openListingRows, error: listErr }] = await Promise.all([
    supabase.from('nfl_roster_slots').select('player_id').eq('league_id', league.id),
    supabase.from('nfl_market_listings').select('player_id').eq('league_id', league.id).eq('status', 'open'),
  ])
  if (ownedErr) throw new Error(ownedErr.message)
  if (listErr) throw new Error(listErr.message)
  const excludeIds = new Set([...(ownedRows || []), ...(openListingRows || [])].map((r) => r.player_id))

  const { data: candidates, error: candErr } = await supabase
    .from('nfl_players').select('*').eq('active_flag', true)
  if (candErr) throw new Error(candErr.message)
  const pool = (candidates || []).filter((p) => !excludeIds.has(p.id))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const chosen = pool.slice(0, listingCount)
  if (chosen.length === 0) throw new Error('No unrostered players available to list.')

  const latest = await getLatestCycle(league.id)
  const cycleNumber = (latest?.cycleNumber ?? 0) + 1

  const { data: cycle, error: cycleErr } = await supabase.from('nfl_market_cycles').insert({
    league_id: league.id, cycle_number: cycleNumber,
  }).select().single()
  if (cycleErr) throw new Error(cycleErr.message)

  const listingRows = chosen.map((p) => ({
    league_id: league.id, market_cycle_id: cycle.id, player_id: p.id,
    listing_type: 'free_agent', starting_value: estimateStartingValue(p.position, league.budgetAmount),
  }))
  const { error: insertErr } = await supabase.from('nfl_market_listings').insert(listingRows)
  if (insertErr) throw new Error(insertErr.message)

  await writeAuditLog({
    actorUserId, leagueId: league.id, actionType: 'open_market_cycle', entityType: 'market_cycle', entityId: cycle.id,
    before: null, after: { cycleNumber, listingCount: chosen.length },
  })

  return mapCycle(cycle)
}

/**
 * Manager action: put one of your own rostered players into the currently
 * open cycle for rival secret bidding, instead of an instant system sale.
 * Requires an open cycle (it resolves alongside the free-agent listings
 * when the commissioner executes it). Starting ask defaults to the
 * player's current market value; a winning bid pays the seller directly.
 */
export async function listPlayerForAuction({ league, cycleId, member, playerId, actorUserId }) {
  const supabase = requireSupabase()

  const { data: rosterSlot, error: rosterErr } = await supabase
    .from('nfl_roster_slots').select('id').eq('league_id', league.id).eq('player_id', playerId).eq('manager_id', member.id).maybeSingle()
  if (rosterErr) throw new Error(rosterErr.message)
  if (!rosterSlot) throw new Error('You do not own this player.')

  const { data: existing } = await supabase
    .from('nfl_market_listings').select('id').eq('league_id', league.id).eq('player_id', playerId).eq('status', 'open').maybeSingle()
  if (existing) throw new Error('This player already has an open listing.')

  const { data: valueRow, error: valueErr } = await supabase
    .from('nfl_league_player_values').select('market_value, purchase_price').eq('league_id', league.id).eq('player_id', playerId).maybeSingle()
  if (valueErr) throw new Error(valueErr.message)
  const startingValue = valueRow?.market_value ?? valueRow?.purchase_price ?? 500000

  const { data, error } = await supabase.from('nfl_market_listings').insert({
    league_id: league.id, market_cycle_id: cycleId, player_id: playerId,
    listing_type: 'manager_auction', starting_value: startingValue, seller_manager_id: member.id,
  }).select('*, nfl_players(*)').single()
  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorUserId, leagueId: league.id, actionType: 'list_player_for_auction', entityType: 'market_listing', entityId: data.id,
    before: null, after: { startingValue },
  })

  return mapListing(data)
}

export async function submitBid({ listing, bidderMemberId, bidAmount }) {
  const supabase = requireSupabase()
  if (listing.status !== 'open') throw new Error('This listing is no longer open.')
  if (listing.sellerManagerId === bidderMemberId) throw new Error('You cannot bid on your own listed player.')
  if (bidAmount < listing.startingValue) throw new Error(`Bid must be at least ${listing.startingValue}.`)

  const { data: member, error: memberErr } = await supabase
    .from('nfl_league_members').select('balance').eq('id', bidderMemberId).single()
  if (memberErr) throw new Error(memberErr.message)
  if (member.balance < bidAmount) throw new Error('Bid exceeds your available balance.')

  const { error } = await supabase.from('nfl_bids').upsert({
    listing_id: listing.id, league_id: listing.leagueId, bidder_manager_id: bidderMemberId,
    bid_amount: bidAmount, submitted_at: new Date().toISOString(), status: 'pending',
  }, { onConflict: 'listing_id,bidder_manager_id' })
  if (error) throw new Error(error.message)
}

export async function getMyBid(listingId, managerId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_bids').select('*').eq('listing_id', listingId).eq('bidder_manager_id', managerId).maybeSingle()
  if (error) throw new Error(error.message)
  return mapBid(data)
}

export async function getMyBidsForCycle(cycleId, managerId) {
  const supabase = requireSupabase()
  const { data: listings, error: listErr } = await supabase
    .from('nfl_market_listings').select('id').eq('market_cycle_id', cycleId)
  if (listErr) throw new Error(listErr.message)
  const listingIds = (listings || []).map((l) => l.id)
  if (listingIds.length === 0) return {}
  const { data, error } = await supabase
    .from('nfl_bids').select('*').in('listing_id', listingIds).eq('bidder_manager_id', managerId)
  if (error) throw new Error(error.message)
  return Object.fromEntries((data || []).map((row) => [row.listing_id, mapBid(row)]))
}

/**
 * Commissioner action: resolve every open listing in a cycle. Highest bid
 * wins (tie -> earliest submitted_at). Processes listings highest-value
 * first and tracks a running per-manager balance across the whole cycle so
 * a manager can't win more than they can actually afford across multiple
 * listings — if the top bidder can no longer afford it given earlier wins
 * this same cycle, resolution cascades to the next-highest bidder.
 */
export async function executeCycle({ league, cycleId, actorUserId }) {
  const supabase = requireSupabase()

  const listings = (await getCycleListings(cycleId)).filter((l) => l.status === 'open')
  const members = await getLeagueMembers(league.id)
  const runningBalance = Object.fromEntries(members.map((m) => [m.id, m.balance]))
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))

  const ordered = [...listings].sort((a, b) => b.startingValue - a.startingValue)
  const results = []

  for (const listing of ordered) {
    const { data: bidRows, error: bidErr } = await supabase
      .from('nfl_bids').select('*').eq('listing_id', listing.id)
      .order('bid_amount', { ascending: false }).order('submitted_at', { ascending: true })
    if (bidErr) throw new Error(bidErr.message)

    let winner = null
    for (const bid of bidRows || []) {
      if (runningBalance[bid.bidder_manager_id] >= bid.bid_amount) { winner = bid; break }
    }

    if (!winner) {
      await supabase.from('nfl_market_listings').update({ status: 'unsold', resolved_at: new Date().toISOString() }).eq('id', listing.id)
      if ((bidRows || []).length > 0) {
        await supabase.from('nfl_bids').update({ status: 'lost' }).eq('listing_id', listing.id)
      }
      results.push({ listing, winnerManagerId: null, amount: null })
      continue
    }

    const isManagerAuction = !!listing.sellerManagerId
    runningBalance[winner.bidder_manager_id] -= winner.bid_amount

    // Manager-auctioned player: the seller currently owns the roster slot —
    // it has to be removed before the winner's insert, or the unique
    // (league_id, player_id) constraint on nfl_roster_slots would reject it.
    if (isManagerAuction) {
      runningBalance[listing.sellerManagerId] = (runningBalance[listing.sellerManagerId] ?? 0) + winner.bid_amount
      await supabase.from('nfl_roster_slots').delete().eq('league_id', league.id).eq('player_id', listing.playerId)
    }

    const { error: rosterErr } = await supabase.from('nfl_roster_slots').insert({
      league_id: league.id, manager_id: winner.bidder_manager_id, player_id: listing.playerId,
      acquisition_type: 'market_win', purchase_price: winner.bid_amount,
    })
    if (rosterErr) {
      // Player was somehow already rostered (e.g. concurrent admin override) — skip this listing.
      await supabase.from('nfl_market_listings').update({ status: 'unsold', resolved_at: new Date().toISOString() }).eq('id', listing.id)
      runningBalance[winner.bidder_manager_id] += winner.bid_amount
      if (isManagerAuction) {
        runningBalance[listing.sellerManagerId] -= winner.bid_amount
        await supabase.from('nfl_roster_slots').insert({
          league_id: league.id, manager_id: listing.sellerManagerId, player_id: listing.playerId,
          acquisition_type: 'admin_assign', purchase_price: 0,
        })
      }
      results.push({ listing, winnerManagerId: null, amount: null, error: rosterErr.message })
      continue
    }

    await supabase.from('nfl_league_player_values').upsert({
      league_id: league.id, player_id: listing.playerId, market_value: winner.bid_amount, purchase_price: winner.bid_amount,
    }, { onConflict: 'league_id,player_id' })

    await supabase.from('nfl_transactions').insert({
      league_id: league.id, transaction_type: 'market_win',
      from_manager_id: isManagerAuction ? listing.sellerManagerId : null,
      to_manager_id: winner.bidder_manager_id,
      player_id: listing.playerId, amount: winner.bid_amount, notes: `Market cycle — ${listing.player?.displayName ?? listing.playerId}`,
    })

    await supabase.from('nfl_market_listings').update({ status: 'sold', resolved_at: new Date().toISOString() }).eq('id', listing.id)
    await supabase.from('nfl_bids').update({ status: 'won' }).eq('id', winner.id)
    const otherBidIds = (bidRows || []).filter((b) => b.id !== winner.id).map((b) => b.id)
    if (otherBidIds.length > 0) await supabase.from('nfl_bids').update({ status: 'lost' }).in('id', otherBidIds)

    results.push({
      listing, winnerManagerId: winner.bidder_manager_id, amount: winner.bid_amount,
      teamName: memberById[winner.bidder_manager_id]?.teamName,
      sellerManagerId: isManagerAuction ? listing.sellerManagerId : null,
      sellerTeamName: isManagerAuction ? memberById[listing.sellerManagerId]?.teamName : null,
    })
  }

  const changedManagerIds = new Set()
  for (const r of results) {
    if (r.winnerManagerId) changedManagerIds.add(r.winnerManagerId)
    if (r.sellerManagerId) changedManagerIds.add(r.sellerManagerId)
  }
  for (const managerId of changedManagerIds) {
    await supabase.from('nfl_league_members').update({ balance: runningBalance[managerId] }).eq('id', managerId)
  }

  await supabase.from('nfl_market_cycles').update({ status: 'executed', executed_at: new Date().toISOString() }).eq('id', cycleId)

  await writeAuditLog({
    actorUserId, leagueId: league.id, actionType: 'execute_market_cycle', entityType: 'market_cycle', entityId: cycleId,
    before: null, after: { sold: results.filter((r) => r.winnerManagerId).length, unsold: results.filter((r) => !r.winnerManagerId).length },
  })

  return results
}

// ── Manager sales ─────────────────────────────────────────────────────────

export async function listPlayerForSale({ league, member, playerId, actorUserId }) {
  const supabase = requireSupabase()

  const { data: valueRow, error: valueErr } = await supabase
    .from('nfl_league_player_values').select('*').eq('league_id', league.id).eq('player_id', playerId).maybeSingle()
  if (valueErr) throw new Error(valueErr.message)
  const marketValue = valueRow?.market_value ?? 0

  const { data: existing } = await supabase
    .from('nfl_market_listings').select('id').eq('league_id', league.id).eq('player_id', playerId).eq('status', 'open').maybeSingle()
  if (existing) throw new Error('This player already has an open sale offer.')

  const offer = Math.round((marketValue * (0.95 + Math.random() * 0.1)) / 100000) * 100000

  const { data, error } = await supabase.from('nfl_market_listings').insert({
    league_id: league.id, player_id: playerId, listing_type: 'manager_sale',
    starting_value: offer, seller_manager_id: member.id,
  }).select().single()
  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorUserId, leagueId: league.id, actionType: 'list_player_for_sale', entityType: 'market_listing', entityId: data.id,
    before: { marketValue }, after: { offer },
  })

  return mapListing(data)
}

export async function getMySaleOffers(leagueId, managerId) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('nfl_market_listings').select('*, nfl_players(*)')
    .eq('league_id', leagueId).eq('seller_manager_id', managerId).eq('status', 'open')
  if (error) throw new Error(error.message)
  return (data || []).map(mapListing)
}

export async function acceptSaleOffer({ listing, member, actorUserId }) {
  const supabase = requireSupabase()
  if (listing.status !== 'open') throw new Error('This offer is no longer available.')

  const { error: deleteErr } = await supabase
    .from('nfl_roster_slots').delete().eq('league_id', listing.leagueId).eq('player_id', listing.playerId)
  if (deleteErr) throw new Error(deleteErr.message)

  const newBalance = member.balance + listing.startingValue
  const { error: balErr } = await supabase.from('nfl_league_members').update({ balance: newBalance }).eq('id', member.id)
  if (balErr) throw new Error(balErr.message)

  await supabase.from('nfl_market_listings').update({ status: 'sold', resolved_at: new Date().toISOString() }).eq('id', listing.id)

  await supabase.from('nfl_transactions').insert({
    league_id: listing.leagueId, transaction_type: 'manager_sale', from_manager_id: member.id,
    player_id: listing.playerId, amount: listing.startingValue, notes: 'Accepted system sale offer',
  })

  await writeAuditLog({
    actorUserId, leagueId: listing.leagueId, actionType: 'accept_sale_offer', entityType: 'market_listing', entityId: listing.id,
    before: { balance: member.balance }, after: { balance: newBalance },
  })

  return { newBalance }
}

export async function cancelSaleOffer({ listing, actorUserId }) {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('nfl_market_listings').update({ status: 'cancelled', resolved_at: new Date().toISOString() }).eq('id', listing.id)
  if (error) throw new Error(error.message)

  await writeAuditLog({
    actorUserId, leagueId: listing.leagueId, actionType: 'cancel_sale_offer', entityType: 'market_listing', entityId: listing.id,
    before: { status: 'open' }, after: { status: 'cancelled' },
  })
}
