import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Gavel, Tag, Clock, CheckCircle2 } from 'lucide-react'
import {
  getActiveCycle, getCycleListings, getMyBidsForCycle, submitBid,
  getMySaleOffers, listPlayerForSale, acceptSaleOffer, cancelSaleOffer,
} from '@/services/nflManager/marketService'
import { formatMoney } from '@/components/NflManager/NflManagerLayout'

function ListingRow({ listing, myBid, member, onBid }) {
  const [amount, setAmount] = useState(myBid?.bidAmount ?? listing.startingValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    setBusy(true); setError(null)
    try { await onBid(listing, Number(amount)) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{listing.player?.displayName}</p>
        <p className="text-xs text-gray-500">
          {listing.player?.position} · {listing.player?.nflTeam} · Bye {listing.player?.byeWeek}
          {listing.player?.injuryStatus ? ` · ${listing.player.injuryStatus}` : ''}
        </p>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">Min {formatMoney(listing.startingValue)}</span>
      <input
        type="number" className="input-field py-1.5 text-sm w-32 flex-shrink-0"
        value={amount} onChange={(e) => setAmount(e.target.value)}
      />
      <button className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0" disabled={busy} onClick={submit}>
        {myBid ? 'Update Bid' : 'Place Bid'}
      </button>
      {myBid && <span className="text-xs text-green-400 flex-shrink-0">Your bid: {formatMoney(myBid.bidAmount)}</span>}
      {error && <span className="text-xs text-red-400 w-full">{error}</span>}
    </div>
  )
}

function SaleOfferRow({ slot, offer, onList, onAccept, onCancel }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const act = async (fn) => {
    setBusy(true); setError(null)
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{slot.player?.displayName}</p>
        <p className="text-xs text-gray-500">{slot.player?.position} · {slot.player?.nflTeam}</p>
      </div>
      {offer ? (
        <>
          <span className="text-xs text-green-400 flex-shrink-0">Offer: {formatMoney(offer.startingValue)}</span>
          <button className="btn-primary text-xs px-3 py-1.5 flex-shrink-0" disabled={busy} onClick={() => act(() => onAccept(offer))}>Accept</button>
          <button className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0" disabled={busy} onClick={() => act(() => onCancel(offer))}>Decline</button>
        </>
      ) : (
        <button className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0" disabled={busy} onClick={() => act(() => onList(slot.playerId))}>Sell</button>
      )}
      {error && <span className="text-xs text-red-400 w-full">{error}</span>}
    </div>
  )
}

export default function MarketPage() {
  const { league, myMember, myRoster, refreshMembers, refreshRoster } = useOutletContext()
  const [cycle, setCycle] = useState(null)
  const [listings, setListings] = useState([])
  const [myBids, setMyBids] = useState({})
  const [saleOffers, setSaleOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const activeCycle = await getActiveCycle(league.id)
      setCycle(activeCycle)
      if (activeCycle) {
        const [listingRows, bidMap] = await Promise.all([
          getCycleListings(activeCycle.id),
          getMyBidsForCycle(activeCycle.id, myMember.id),
        ])
        setListings(listingRows.filter((l) => l.status === 'open'))
        setMyBids(bidMap)
      } else {
        setListings([]); setMyBids({})
      }
      const offers = await getMySaleOffers(league.id, myMember.id)
      setSaleOffers(offers)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [league.id, myMember.id])

  useEffect(() => { load() }, [load])

  const offersByPlayerId = Object.fromEntries(saleOffers.map((o) => [o.playerId, o]))

  const placeBid = async (listing, amount) => {
    await submitBid({ listing, bidderMemberId: myMember.id, bidAmount: amount })
    await load()
  }

  const listForSale = async (playerId) => {
    await listPlayerForSale({ league, member: myMember, playerId, actorUserId: myMember.userId })
    await load()
  }

  const accept = async (offer) => {
    await acceptSaleOffer({ listing: offer, member: myMember, actorUserId: myMember.userId })
    await load()
    await refreshMembers()
    await refreshRoster()
  }

  const cancel = async (offer) => {
    await cancelSaleOffer({ listing: offer, actorUserId: myMember.userId })
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">{error}</div>}

      <div>
        <h2 className="section-title flex items-center gap-2"><Gavel className="w-4 h-4" /> Free Agent Market</h2>
        {!cycle && <p className="text-sm text-gray-500 italic mt-1">No market cycle is open right now — check back after your commissioner opens one.</p>}
        {cycle && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Cycle #{cycle.cycleNumber} open — bids are secret, highest wins when your commissioner executes the cycle.
          </p>
        )}
      </div>

      {cycle && (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-f1light">
            {listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} myBid={myBids[listing.id]} member={myMember} onBid={placeBid} />
            ))}
            {listings.length === 0 && <p className="px-4 py-6 text-center text-gray-500 italic text-sm">No open listings.</p>}
          </div>
        </div>
      )}

      <div>
        <h2 className="section-title flex items-center gap-2"><Tag className="w-4 h-4" /> Sell a Player</h2>
        <p className="text-xs text-gray-400 mt-1">Instant system offer, 95–105% of current market value. Accept anytime, or decline to keep your player.</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-f1light">
          {myRoster.map((slot) => (
            <SaleOfferRow
              key={slot.id} slot={slot} offer={offersByPlayerId[slot.playerId]}
              onList={listForSale} onAccept={accept} onCancel={cancel}
            />
          ))}
          {myRoster.length === 0 && <p className="px-4 py-6 text-center text-gray-500 italic text-sm">You don't have a roster yet.</p>}
        </div>
      </div>
    </div>
  )
}
