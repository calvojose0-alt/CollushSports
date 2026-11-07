/**
 * Flag – renders a country flag image from flagcdn.com.
 * Works on all platforms (Windows Chrome, iOS, Android) unlike emoji flags.
 *
 * Usage:
 *   <Flag cc={team.cc} size={24} alt={team.name} />
 *
 * Props:
 *   cc    – ISO 3166-1 alpha-2 lower-case code (e.g. "us", "gb-eng", "gb-sct")
 *   size  – rendered width in px (height auto, images are ~3:2). default 24
 *   alt   – alt text for accessibility. default ""
 *   className – extra tailwind classes
 */
export default function CountryFlag({ cc, size = 24, alt = '', className = '' }) {
  if (!cc) return null
  const w = size <= 20 ? 20 : size <= 40 ? 40 : 80
  return (
    <img
      src={`https://flagcdn.com/w${w}/${cc}.png`}
      srcSet={`https://flagcdn.com/w${w * 2}/${cc}.png 2x`}
      width={size}
      alt={alt}
      className={`inline-block rounded-sm flex-shrink-0 ${className}`}
      style={{ height: 'auto', verticalAlign: 'middle' }}
    />
  )
}
