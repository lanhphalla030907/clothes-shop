/**
 * Primitives shared by every API model.
 *
 * These mirror what the server actually sends, not what would be convenient.
 * Where the wire format is deliberately unusual — money as a fixed two-decimal
 * *string*, dates as ISO-8601 — the type says so, so a feature cannot quietly
 * reintroduce float arithmetic or a locale-dependent date.
 */

/** A `uuid` column. Always a string; never parsed. */
export type UUID = string

/**
 * An ISO-8601 timestamp, exactly as `JSON.stringify(new Date())` emits it.
 *
 * Kept as a string rather than a `Date` so no component can mutate a shared
 * value, and so formatting stays a deliberate, local decision.
 */
export type ISODateTime = string

/**
 * A money amount: a fixed two-decimal string such as `"129.00"`.
 *
 * A JSON number cannot represent every two-decimal value exactly, which is why
 * the server refuses to send one. Treat this as opaque — pass it to
 * `formatMoney` and never do arithmetic on it.
 */
export type MoneyString = string

/** ISO 3166-1 alpha-2, normalised to uppercase by the server. */
export type CountryCode = string

/** One axis of a variant: `{ optionName: 'Color', optionValue: 'Black' }`. */
export interface VariantOption {
  optionName: string
  optionValue: string
}

/** Joins option pairs into the `Color / Black` form used across the UI. */
export const formatVariantOptions = (options: readonly VariantOption[]): string =>
  options.map((option) => `${option.optionName} ${option.optionValue}`).join(' / ')