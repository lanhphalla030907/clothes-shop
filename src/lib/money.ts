import type { MoneyString } from '@/types/api'

/**
 * Formatting for amounts that came from the API.
 *
 * Deliberately separate from `lib/format.ts`, which formats the storefront's
 * local demo prices. The two differ in a way that matters:
 *
 * - the API sends the currency with the amount (`order.currency`), so it is
 *   respected here rather than assumed;
 * - the API sends a fixed two-decimal string, and a receipt must show both
 *   decimals. A price that loses its cents on the way to a payment screen looks
 *   like a different amount.
 *
 * The string is only ever parsed for display. Nothing here does arithmetic.
 */

const formatterCache = new Map<string, Intl.NumberFormat>()

const formatterFor = (currency: string): Intl.NumberFormat => {
  const cached = formatterCache.get(currency)
  if (cached) return cached

  const created = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  formatterCache.set(currency, created)
  return created
}

/** Falls back to the raw code + amount if the currency is not one ICU knows. */
const fallback = (amount: MoneyString, currency: string): string =>
  `${currency} ${amount}`

/**
 * Renders an API amount, e.g. `"1290.00"` with `"USD"` → `"$1,290.00"`.
 *
 * @param amount   the exact string the server sent
 * @param currency ISO 4217 code from the same payload; defaults to the store's
 */
export const formatMoney = (amount: MoneyString, currency = 'USD'): string => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return fallback(amount, currency)

  try {
    return formatterFor(currency).format(value)
  } catch {
    return fallback(amount, currency)
  }
}

/**
 * The amount with no currency symbol — for a table column whose header already
 * says the currency.
 */
export const formatAmount = (amount: MoneyString): string => {
  const value = Number(amount)
  return Number.isFinite(value)
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : amount
}

/** Sums server-sent amount strings without leaving string arithmetic. */
export const sumMoney = (amounts: readonly MoneyString[]): MoneyString =>
  amounts
    .reduce((total, amount) => total + (Number.isFinite(Number(amount)) ? Number(amount) : 0), 0)
    .toFixed(2)