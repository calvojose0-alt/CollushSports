// ColumnPick — single column selection (A = Podium, B = Top 10)
import { useState } from 'react'
import { DRIVERS_2026 } from '@/data/drivers2026'
import { ChevronDown, CheckCircle2, AlertCircle, Search } from 'lucide-react'

function DriverOption({ driver, disabled, selected, onSelect }) {
  return (
    <button
      onClick={() => !disabled && onSelect(driver)}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
        transition-all duration-150
        ${selected
          ? 'bg-f1red/20 border border-f1red text-white'
          : disabled
            ? 'opacity-40 cursor-not-allowed text-gray-500'
            : 'hover:bg-f1light text-gray-200 cursor-pointer'
        }
      `}
    >
      <div
        className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
        style={{ background: driver.teamColor }}
      >
        {driver.number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{driver.name}</p>
        <p className="text-xs text-gray-500 truncate">{driver.team}</p>
      </div>
      {disabled && <span className="text-xs text-red-400 flex-shrink-0">Used</span>}
      {selected && <CheckCircle2 className="w-4 h-4 text-f1red flex-shrink-0" />}
    </button>
  )
}

export default function ColumnPick({ column, label, description, selectedDriver, usedDriverIds, onSelect, onInspect }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = DRIVERS_2026
    .filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.team.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aBottom = usedDriverIds.has(a.id) || selectedDriver?.id === a.id
      const bBottom = usedDriverIds.has(b.id) || selectedDriver?.id === b.id
      return aBottom - bBottom
    })

  const handleSelect = (driver) => {
    onSelect(driver)
    if (onInspect) onInspect(driver.id)
    setOpen(false)
    setSearch('')
  }

  const labelColor = column === 'A' ? 'text-f1gold' : 'text-green-400'
  const borderColor = column === 'A' ? 'border-f1gold/40' : 'border-green-500/40'
  const bgSelected = column === 'A' ? 'bg-f1gold/10' : 'bg-green-900/20'

  return (
    <div className={`card border ${borderColor}`}>
      {/* Column header */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-black ${labelColor} tracking-widest`}>{column === 'A' ? 'PODIUM PICK' : 'TOP 10 PICK'}</span>
        </div>
        <p className="text-xs text-gray-400">{description}</p>
      </div>

      {/* Selected driver display */}
      {selectedDriver ? (
        <div
          className={`flex items-center gap-3 p-3 rounded-xl mb-3 cursor-pointer hover:opacity-90 transition ${bgSelected} border ${borderColor}`}
          onClick={() => { setOpen((v) => !v); onInspect && onInspect(selectedDriver.id) }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{ background: selectedDriver.teamColor }}
          >
            {selectedDriver.number}
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{selectedDriver.name}</p>
            <p className="text-xs" style={{ color: selectedDriver.teamColor }}>{selectedDriver.team}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center justify-between p-3 rounded-xl mb-3 border ${borderColor} border-dashed text-gray-400 hover:text-white hover:border-solid transition`}
        >
          <span className="text-sm">Select a driver…</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="bg-f1dark border border-f1light rounded-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-f1light flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search drivers or teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.map((d) => (
              <DriverOption
                key={d.id}
                driver={d}
                disabled={usedDriverIds.has(d.id)}
                selected={selectedDriver?.id === d.id}
                onSelect={handleSelect}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">No drivers found</p>
            )}
          </div>
        </div>
      )}

      {/* Constraint hint */}
      {usedDriverIds.size > 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3" />
          {usedDriverIds.size} driver{usedDriverIds.size > 1 ? 's' : ''} already used this season
        </p>
      )}
    </div>
  )
}
