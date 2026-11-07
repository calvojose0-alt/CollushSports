// Comma-formatted currency input — displays "5,900,000" while the caller
// only ever sees/stores a plain number (or '' while empty).
export default function MoneyInput({ value, onChange, className = '', placeholder, disabled }) {
  const display = value === '' || value == null ? '' : Number(value).toLocaleString('en-US')

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '')
        onChange(digits === '' ? '' : Number(digits))
      }}
    />
  )
}
