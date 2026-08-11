// A colored, rounded team badge showing the NFL abbreviation.
// Replaces the soccer flag emoji used in the Soccer Win League.

const SIZES = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
}

/** Light text on dark team colors, dark text on light ones (e.g. NO, PIT). */
function readableText(hex) {
  if (!hex || hex.length < 7) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111827' : '#ffffff'
}

export default function TeamLogo({ team, size = 'sm', className = '' }) {
  if (!team) return null
  const color = team.color && team.color !== '#000000' ? team.color : '#374151'
  return (
    <span
      className={`${SIZES[size] || SIZES.sm} rounded-lg flex items-center justify-center font-black leading-none flex-shrink-0 ${className}`}
      style={{ backgroundColor: color, color: readableText(color) }}
      title={team.name}
    >
      {team.abbr || team.shortName || '?'}
    </span>
  )
}
