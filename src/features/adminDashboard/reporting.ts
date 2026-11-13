import {
  formatCalendarLabel,
  isCalendarDate,
  validateFinanceDateRange,
} from '@/features/finance/utils'
import type { FinanceTrendGranularity } from '@/types/api'
import type {
  AdminOrderSummary,
  CashReconciliationCurrency,
  MoneyString,
  OrderStatus,
} from '@/types/api'

/**
 * Reporting helpers for the store overview.
 *
 * The dashboard uses the same reporting timezone, calendar labels and 366-day
 * limit as the finance API, so a period chosen here means exactly the same thing
 * on every panel. Amounts are never added across currencies: multi-currency
 * totals are rendered as separate lines, never combined.
 */

export const REPORTING_TIMEZONE = 'Asia/Phnom_Penh'

/** `Asia/Phnom_Penh` is a fixed UTC+7 offset with no daylight saving. */
const REPORTING_UTC_OFFSET_MS = 7 * 60 * 60 * 1000
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export type DashboardPeriodPreset = 'today' | '7d' | '30d' | 'month' | 'custom'

export type ReportingRange = {
  /** Inclusive calendar date, `YYYY-MM-DD`, in the reporting timezone. */
  from: string
  /** Inclusive calendar date, `YYYY-MM-DD`, in the reporting timezone. */
  to: string
}

export const DASHBOARD_PERIOD_PRESETS: ReadonlyArray<{
  value: Exclude<DashboardPeriodPreset, 'custom'>
  label: string
}> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
]

export const DEFAULT_DASHBOARD_PERIOD: Exclude<
  DashboardPeriodPreset,
  'custom'
> = '30d'

export const isDashboardPeriodPreset = (
  value: string | null,
): value is DashboardPeriodPreset =>
  value === 'today' ||
  value === '7d' ||
  value === '30d' ||
  value === 'month' ||
  value === 'custom'

/** Today's calendar date in the reporting timezone, as the finance API defines it. */
export const reportingToday = (now: Date = new Date()): string =>
  new Date(now.getTime() + REPORTING_UTC_OFFSET_MS)
    .toISOString()
    .slice(0, 10)

/** Adds whole calendar days to a `YYYY-MM-DD` label without using local time. */
export const addCalendarDays = (value: string, days: number): string => {
  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

/** Resolves a preset to the inclusive calendar window it describes. */
export const periodRange = (
  preset: Exclude<DashboardPeriodPreset, 'custom'>,
  today: string,
): ReportingRange => {
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case '7d':
      return { from: addCalendarDays(today, -6), to: today }
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today }
    case '30d':
    default:
      return { from: addCalendarDays(today, -29), to: today }
  }
}

/** Inclusive day count, used only to choose a chart bucket size. */
export const inclusiveDays = (range: ReportingRange): number => {
  const from = new Date(`${range.from}T00:00:00.000Z`).getTime()
  const to = new Date(`${range.to}T00:00:00.000Z`).getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 1
  return Math.floor((to - from) / MILLISECONDS_PER_DAY) + 1
}

/**
 * A bucket size the finance API supports.
 *
 * Short windows stay daily; a long custom range is grouped so the chart keeps a
 * readable number of points. The API still owns the actual bucket boundaries.
 */
export const granularityForRange = (
  range: ReportingRange,
): FinanceTrendGranularity => {
  const days = inclusiveDays(range)
  if (days <= 31) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

/** A range is only applied when both dates are real and within the API limit. */
export const validateReportingRange = (
  from: string,
  to: string,
): string | undefined => {
  if (!isCalendarDate(from)) return 'Start date must be a real calendar date.'
  if (!isCalendarDate(to)) return 'End date must be a real calendar date.'
  return validateFinanceDateRange(from, to)
}

/** Start of a reporting day as an ISO instant, for `createdFrom`. */
export const toReportingStartTimestamp = (date: string): string =>
  new Date(`${date}T00:00:00.000+07:00`).toISOString()

/** End of a reporting day as an ISO instant, for `createdTo`. */
export const toReportingEndTimestamp = (date: string): string =>
  new Date(`${date}T23:59:59.999+07:00`).toISOString()

export const formatReportingRange = (range: ReportingRange): string =>
  `${formatCalendarLabel(range.from)} – ${formatCalendarLabel(range.to)}`

/** A percentage of a collected total, never a share of a client-computed sum. */
export const formatShare = (part: number, total: number): string => {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return '0%'
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(part / total)
}

const parseMoney = (amount: MoneyString | null | undefined): number => {
  const value = Number(amount)
  return Number.isFinite(value) ? value : 0
}

export type PaymentBreakdownSegment = {
  key: 'online' | 'cod'
  label: string
  amount: MoneyString
  value: number
  share: string
}

export type PaymentBreakdown = {
  currency: string
  total: MoneyString
  totalValue: number
  segments: PaymentBreakdownSegment[]
  /**
   * True when the backend's collected total is exactly the two cash components.
   * The dashboard never substitutes a client sum for the server total.
   */
  reconciles: boolean
}

/**
 * Payment collection as the finance API measures it.
 *
 * `onlineCash` is successfully paid online cash (ABA PayWay) and `codCash` is
 * collected cash on delivery. The API's `cashCollected` is one cash event per
 * order, so the UI uses it as the denominator and only draws these two segments.
 * Pending, failed, expired and cancelled payments are not cash and never appear.
 */
export const paymentBreakdown = (
  row: CashReconciliationCurrency,
): PaymentBreakdown => {
  const totalValue = parseMoney(row.cashCollected)
  const onlineValue = parseMoney(row.onlineCash)
  const codValue = parseMoney(row.codCash)

  const segments: PaymentBreakdownSegment[] = (
    [
      {
        key: 'online',
        label: 'ABA PayWay',
        amount: row.onlineCash,
        value: onlineValue,
        share: formatShare(onlineValue, totalValue),
      },
      {
        key: 'cod',
        label: 'Cash on delivery',
        amount: row.codCash,
        value: codValue,
        share: formatShare(codValue, totalValue),
      },
    ] satisfies PaymentBreakdownSegment[]
  ).filter((segment) => segment.value > 0)

  return {
    currency: row.currency,
    total: row.cashCollected,
    totalValue,
    segments,
    reconciles: Math.abs(onlineValue + codValue - totalValue) < 0.005,
  }
}

export const emptyOrderStatusCounts = (): Record<OrderStatus, number> => ({
  PENDING: 0,
  CONFIRMED: 0,
  PROCESSING: 0,
  SHIPPED: 0,
  DELIVERED: 0,
  CANCELLED: 0,
})

export const sumOrderStatusCounts = (
  counts: Record<OrderStatus, number>,
): number =>
  Object.values(counts).reduce((total, count) => total + count, 0)

export const orderCustomerName = (order: AdminOrderSummary): string =>
  `${order.customer.firstName} ${order.customer.lastName}`.trim() ||
  order.customer.email
