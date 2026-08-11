// Format a points value that may be fractional (ties are worth 0.5).
// 3 → "3", 2.5 → "2.5"
export function fmtPts(n) {
  const v = Number(n) || 0
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
