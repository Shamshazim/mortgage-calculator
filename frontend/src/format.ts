const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number): string {
  return usd.format(value)
}

export function formatPercent(value: number): string {
  // Up to 3 decimals, no trailing zeros beyond what's meaningful.
  return `${Number(value.toFixed(3))}%`
}

/** Render a count of months as e.g. "24 yr 6 mo", "30 yr", or "8 mo". */
export function formatMonths(totalMonths: number): string {
  const m = Math.max(0, Math.round(totalMonths))
  const years = Math.floor(m / 12)
  const months = m % 12
  const parts: string[] = []
  if (years > 0) parts.push(`${years} yr`)
  if (months > 0) parts.push(`${months} mo`)
  return parts.length ? parts.join(' ') : '0 mo'
}
