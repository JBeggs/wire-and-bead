/**
 * Client-safe money formatting (no `server-only`).
 */
export function formatMoney(
  amount: number,
  currencyCode: string,
  locale: string
): string {
  const currency = (currencyCode || 'ZAR').trim() || 'ZAR'
  const loc = (locale || 'en-ZA').trim() || 'en-ZA'
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    try {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${currency} ${amount.toFixed(2)}`
    }
  }
}
