import type {
  FinanceBasis,
  FinanceProductSortBy,
  FinanceRangeResponse,
  FinanceRankingMetric,
  FinanceSortOrder,
  FinanceTrendGranularity,
} from '@/types/api'

/** A view in the product-rankings panel. */
export type FinanceRankingView =
  | 'best-selling'
  | 'most-profitable'
  | 'lowest-profit'

/** A panel on the finance page. */
export type FinanceSection = 'overview' | 'trend' | 'products' | 'rankings' | 'cash'

export const FINANCE_SECTIONS: ReadonlyArray<{
  value: FinanceSection
  label: string
}> = [
  { value: 'overview', label: 'Overview' },
  { value: 'trend', label: 'Revenue trend' },
  { value: 'products', label: 'Products' },
  { value: 'rankings', label: 'Rankings' },
  { value: 'cash', label: 'Cash reconciliation' },
]

export const isFinanceSection = (
  value: string | null,
): value is FinanceSection =>
  value === 'overview' ||
  value === 'trend' ||
  value === 'products' ||
  value === 'rankings' ||
  value === 'cash'

export const FINANCE_BASIS_OPTIONS: ReadonlyArray<{
  value: FinanceBasis
  label: string
}> = [
  { value: 'delivered', label: 'Delivered' },
  { value: 'booked', label: 'Booked' },
]

export const FINANCE_GRANULARITY_OPTIONS: ReadonlyArray<{
  value: FinanceTrendGranularity
  label: string
}> = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
]

export const FINANCE_RANKING_VIEWS: ReadonlyArray<{
  value: FinanceRankingView
  label: string
  description: string
}> = [
  {
    value: 'best-selling',
    label: 'Best selling',
    description: 'Ranked by units sold.',
  },
  {
    value: 'most-profitable',
    label: 'Most profitable',
    description: 'Ranked by known-cost gross profit.',
  },
  {
    value: 'lowest-profit',
    label: 'Lowest profit',
    description: 'Server-sorted variant profitability, lowest first.',
  },
]

export const FINANCE_PRODUCT_PAGE_SIZES = [10, 20, 50, 100] as const
export const FINANCE_DEFAULT_PAGE_SIZE = 20
export const FINANCE_MAX_RANGE_DAYS = 366

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export const isFinanceBasis = (value: string | null): value is FinanceBasis =>
  value === 'delivered' || value === 'booked'

export const isFinanceGranularity = (
  value: string | null,
): value is FinanceTrendGranularity =>
  value === 'day' || value === 'week' || value === 'month'

export const isFinanceProductSortBy = (
  value: string | null,
): value is FinanceProductSortBy =>
  value === 'revenue' ||
  value === 'profit' ||
  value === 'units' ||
  value === 'margin' ||
  value === 'productName'

export const isFinanceSortOrder = (
  value: string | null,
): value is FinanceSortOrder => value === 'asc' || value === 'desc'

export const isFinanceRankingMetric = (
  value: string | null,
): value is FinanceRankingMetric =>
  value === 'revenue' || value === 'profit' || value === 'units'

export const isFinanceRankingView = (
  value: string | null,
): value is FinanceRankingView =>
  value === 'best-selling' ||
  value === 'most-profitable' ||
  value === 'lowest-profit'

/** A positive integer from a URL query value, with a safe fallback. */
export const parsePositiveInteger = (
  value: string | null,
  fallback = 1,
): number => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

/** A page size limited to the sizes the backend accepts comfortably. */
export const parseFinancePageSize = (value: string | null): number => {
  const parsed = Number(value)
  return FINANCE_PRODUCT_PAGE_SIZES.includes(
    parsed as (typeof FINANCE_PRODUCT_PAGE_SIZES)[number],
  )
    ? parsed
    : FINANCE_DEFAULT_PAGE_SIZE
}

/** True only for a real `YYYY-MM-DD` calendar date. */
export const isCalendarDate = (value: string | null): value is string => {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  )
}

/**
 * Validates the user's date labels before they are sent to the API.
 *
 * The browser does not choose or shift a reporting boundary: it only rejects a
 * range the server would also reject. The server remains the authority on the
 * default range and on `Asia/Phnom_Penh` day boundaries.
 */
export const validateFinanceDateRange = (
  from: string,
  to: string,
): string | undefined => {
  if (from !== '' && !isCalendarDate(from)) {
    return 'Start date must be a real calendar date.'
  }
  if (to !== '' && !isCalendarDate(to)) {
    return 'End date must be a real calendar date.'
  }
  if (from === '' || to === '') return undefined

  const start = new Date(`${from}T00:00:00.000Z`).getTime()
  const end = new Date(`${to}T00:00:00.000Z`).getTime()
  if (start > end) return 'Start date must be on or before the end date.'

  const days = Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1
  if (days > FINANCE_MAX_RANGE_DAYS) {
    return `The reporting range must not exceed ${FINANCE_MAX_RANGE_DAYS} days.`
  }

  return undefined
}

const calendarDate = (value: string): Date | null => {
  if (!isCalendarDate(value)) return null
  return new Date(`${value}T00:00:00.000Z`)
}

/** A human date label for a `YYYY-MM-DD` reporting date. */
export const formatCalendarLabel = (value: string): string => {
  const date = calendarDate(value)
  if (date === null) return value

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** The full reporting window, e.g. `01 Oct 2026 – 30 Oct 2026`. */
export const formatFinanceRange = (range: FinanceRangeResponse): string =>
  `${formatCalendarLabel(range.from)} – ${formatCalendarLabel(range.to)}`

/** A short axis label for a trend bucket's `YYYY-MM-DD` period label. */
export const formatPeriodLabel = (
  period: string,
  granularity: FinanceTrendGranularity,
): string => {
  const date = calendarDate(period)
  if (date === null) return period

  if (granularity === 'month') {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  }

  const day = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)

  return granularity === 'week' ? `W/c ${day}` : day
}

/** A full tooltip/table label for a trend bucket. */
export const formatPeriodFullLabel = (
  period: string,
  granularity: FinanceTrendGranularity,
): string => {
  const date = calendarDate(period)
  if (date === null) return period

  if (granularity === 'week') {
    return `Week of ${formatCalendarLabel(period)}`
  }
  if (granularity === 'month') {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  }

  return formatCalendarLabel(period)
}

/** Formats a decimal ratio such as `0.2941` as `29.4%`. */
export const formatRatioPercent = (
  ratio: string | null,
  fractionDigits = 1,
): string | null => {
  if (ratio === null) return null
  const value = Number(ratio)
  if (!Number.isFinite(value)) return null

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/** A compact axis tick amount, e.g. `$1.2K`. */
export const formatCompactMoney = (
  value: number,
  currency: string,
): string => {
  if (!Number.isFinite(value)) return '—'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return `${currency} ${value}`
  }
}

export const formatCount = (value: number): string =>
  new Intl.NumberFormat('en-US').format(value)

export const basisLabel = (basis: FinanceBasis): string =>
  basis === 'booked' ? 'Booked' : 'Delivered'

export const basisDescription = (basis: FinanceBasis): string =>
  basis === 'booked'
    ? 'Revenue is recognised when an online payment or COD collection evidences the money.'
    : 'Revenue is recognised when the order is successfully delivered.'

export const granularityLabel = (granularity: FinanceTrendGranularity): string =>
  granularity === 'week'
    ? 'Weekly'
    : granularity === 'month'
      ? 'Monthly'
      : 'Daily'

export const productSortLabel = (sortBy: FinanceProductSortBy): string => {
  switch (sortBy) {
    case 'profit':
      return 'Gross profit'
    case 'units':
      return 'Units sold'
    case 'margin':
      return 'Profit margin'
    case 'productName':
      return 'Product'
    case 'revenue':
    default:
      return 'Net revenue'
  }
}

export const pageBounds = (
  page: number,
  limit: number,
  total: number,
): { first: number; last: number } => {
  if (total === 0) return { first: 0, last: 0 }
  return {
    first: (page - 1) * limit + 1,
    last: Math.min(page * limit, total),
  }
}
