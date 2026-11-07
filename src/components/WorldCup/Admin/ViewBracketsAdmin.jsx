import { useState, useMemo } from 'react'
import { Eye, Users } from 'lucide-react'
import { WCGameContext, useWCGameContext } from '@/contexts/WCGameContext'
import BracketPage from '@/components/WorldCup/Bracket/BracketPage'

// Admin-only, read-only viewer: pick any player+entry and see their Knockout
// Bracket exactly as they see it. Reuses the real BracketPage in viewOnly mode,
// fed the selected user's data through the same context it normally consumes.
export default function ViewBracketsAdmin() {
  const base = useWCGameContext()
  const { players = [], allPicks = [], allPlayoffPicks = [] } = base

  // One option per player entry, sorted by name then entry number.
  const options = useMemo(() => {
    return [...players].sort(
      (a, b) =>
        (a.displayName || '').localeCompare(b.displayName || '') ||
        (a.entryNumber ?? 1) - (b.entryNumber ?? 1)
    )
  }, [players])

  const [selUserId, setSelUserId]   = useState(null)
  const [selEntryNum, setSelEntryNum] = useState(1)
  const [version, setVersion]       = useState(0) // bumped to re-init the bracket

  const selectKey = selUserId ? `${selUserId}__${selEntryNum}` : ''

  const select = (key) => {
    if (!key) { setSelUserId(null); return }
    const [uid, en] = key.split('__')
    setSelUserId(uid)
    setSelEntryNum(Number(en))
    setVersion((v) => v + 1)
  }

  // Derive the selected user's data from the already-loaded global picks.
  const derived = useMemo(() => {
    if (!selUserId) return null
    const sameEntry = (p) => p.userId === selUserId && (p.entryNumber ?? 1) === selEntryNum
    const myPicks = allPicks.filter(sameEntry)
    const myPicksByMatchId = {}
    myPicks.forEach((p) => { myPicksByMatchId[p.matchId] = p })
    const myPlayoffPicks = allPlayoffPicks.filter(sameEntry)
    const myPlayoffPicksByRound = {}
    myPlayoffPicks.forEach((p) => { myPlayoffPicksByRound[p.round] = p })
    const myEntries = players
      .filter((p) => p.userId === selUserId)
      .sort((a, b) => (a.entryNumber ?? 1) - (b.entryNumber ?? 1))
    const myPlayer = myEntries.find((p) => (p.entryNumber ?? 1) === selEntryNum) || myEntries[0] || null
    return { myPicks, myPicksByMatchId, myPlayoffPicks, myPlayoffPicksByRound, myEntries, myPlayer }
  }, [selUserId, selEntryNum, allPicks, allPlayoffPicks, players])

  // Build the context the viewed BracketPage will consume: real global data
  // (results, community picks, schedule) + the selected user's "my*" fields.
  const viewCtx = useMemo(() => {
    if (!derived) return null
    return {
      ...base,
      ...derived,
      activeEntryNum: selEntryNum,
      switchEntry: (n) => { setSelEntryNum(n); setVersion((v) => v + 1) },
      createEntry: async () => {}, // disabled in viewer
      refreshPicks: async () => {},
      reload: async () => {},
      picksVersion: version,
    }
  }, [base, derived, selEntryNum, version])

  const selectedLabel = derived?.myPlayer
    ? `${derived.myPlayer.displayName} — ${derived.myPlayer.entryName}`
    : null

  return (
    <div className="space-y-4">
      <div className="card bg-gray-900 border-blue-700/50">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-4 h-4 text-blue-400" />
          <p className="text-sm font-semibold text-white">View Player Brackets</p>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Read-only. Select a player to see their Knockout Bracket exactly as it appears to them. You cannot change any picks here.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Users className="w-4 h-4 text-gray-500" />
          <select
            value={selectKey}
            onChange={(e) => select(e.target.value)}
            className="input-field text-sm min-w-[16rem]"
          >
            <option value="">— Select a player / entry —</option>
            {options.map((p) => (
              <option key={`${p.userId}__${p.entryNumber ?? 1}`} value={`${p.userId}__${p.entryNumber ?? 1}`}>
                {p.displayName} — {p.entryName}
              </option>
            ))}
          </select>
          {selectedLabel && (
            <span className="text-xs text-blue-300">Viewing: <strong>{selectedLabel}</strong></span>
          )}
        </div>
      </div>

      {viewCtx ? (
        <WCGameContext.Provider value={viewCtx}>
          {/* key forces a clean remount when switching player/entry */}
          <BracketPage key={selectKey} viewOnly />
        </WCGameContext.Provider>
      ) : (
        <div className="card text-center py-12 text-gray-500 text-sm">
          Select a player above to view their bracket.
        </div>
      )}
    </div>
  )
}
