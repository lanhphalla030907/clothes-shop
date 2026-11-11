import type {
  AdminCustomerPagination,
  AdminCustomerStats,
  AdminCustomerSummary,
  ISODateTime,
} from '@/types/api'

/** Page sizes the backend accepts. */
export const ADMIN_CUSTOMER_PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_ADMIN_CUSTOMER_PAGE_SIZE = 20

/** Sort columns the customer listing accepts. */
export const ADMIN_CUSTOMER_SORT_BY = [
  'createdAt',
  'name',
  'totalOrders',
  'totalSpent',
] as const
export type AdminCustomerSortBy = (typeof ADMIN_CUSTOMER_SORT_BY)[number]

/** Sort directions. */
export const ADMIN_CUSTOMER_SORT_ORDERS = ['asc', 'desc'] as const
export type AdminCustomerSortOrder = (typeof ADMIN_CUSTOMER_SORT_ORDERS)[number]

/** Default sort: newest registrations first. */
export const DEFAULT_ADMIN_CUSTOMER_SORT_BY: AdminCustomerSortBy = 'createdAt'
export const DEFAULT_ADMIN_CUSTOMER_SORT_ORDER: AdminCustomerSortOrder = 'desc'

const sortByLabels: Record<AdminCustomerSortBy, string> = {
  createdAt: 'Registration date',
  name: 'Name',
  totalOrders: 'Total orders',
  totalSpent: 'Total spent',
}

export const adminCustomerSortByLabel = (sortBy: AdminCustomerSortBy): string =>
  sortByLabels[sortBy] ?? sortBy

const orderActivityLabels: Record<string, string> = {
  WITH_ORDERS: 'Has placed orders',
  WITHOUT_ORDERS: 'No orders yet',
}

export const adminCustomerOrderActivityLabel = (
  value: string | undefined,
): string => orderActivityLabels[value ?? ''] ?? value

/** A value that is safe to pass to the API as a one-based page number. */
export const parsePositivePage = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

/** Page size is capped by the backend; an unsupported value falls back. */
export const parsePageSize = (value: string | null): number => {
  const parsed = Number(value)
  return (ADMIN_CUSTOMER_PAGE_SIZES as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_ADMIN_CUSTOMER_PAGE_SIZE
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Accepts the `YYYY-MM-DD` a date input produces and rejects impossible dates. */
const parseDateOnly = (value: string): Date | undefined => {
  if (!DATE_ONLY.test(value)) return undefined

  const [year, month, day] = value.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}

/** Inclusive start of the selected local day, as an ISO-8601 timestamp. */
export const toRegisteredFromTimestamp = (
  value: string | null,
): ISODateTime | undefined => {
  const date = value !== null ? parseDateOnly(value) : undefined
  return date?.toISOString()
}

/** Inclusive end of the selected local day, as an ISO-8601 timestamp. */
export const toRegisteredToTimestamp = (value: string | null): ISODateTime | undefined => {
  const date = value !== null ? parseDateOnly(value) : undefined
  if (date === undefined) return undefined

  date.setHours(23, 59, 59, 999)
  return date.toISOString()
}

/** A date input value that is safe to render, or `''`. */
export const safeDateParameter = (value: string | null): string =>
  value !== null && parseDateOnly(value) !== undefined ? value : ''

/** 0-based bounds shown in a "showing X–Y of Z" label. */
export const pageBounds = (
  pagination: AdminCustomerPagination,
): { first: number; last: number } =>
  pagination.total === 0
    ? { first: 0, last: 0 }
    : {
        first: (pagination.page - 1) * pagination.limit + 1,
        last: Math.min(pagination.page * pagination.limit, pagination.total),
      }

/** Formats a date as `11 Jan 2026`. */
export const formatCustomerDate = (value: ISODateTime): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Formats a date-time as `11 Jan 2026, 14:30`. */
export const formatCustomerDateTime = (value: ISODateTime | null): string => {
  if (value === null) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A customer's full name, falling back to email when both names are blank. */
export const customerName = (
  customer: Pick<AdminCustomerSummary, 'firstName' | 'lastName' | 'email'>,
): string =>
  `${customer.firstName} ${customer.lastName}`.trim() || customer.email

/** A per-currency money amount as `USD 129.00` — never combined across currencies. */
export const formatCustomerMoney = (entry: {
  currency: string
  amount: string
}): string => `${entry.currency} ${entry.amount}`

/** The per-currency spend shown compactly, e.g. `USD 129.00 · KHR 490,000`. */
export const formatCustomerSpend = (
  spend: readonly { currency: string; amount: string }[],
): string =>
  spend.length === 0
    ? '—'
    : spend.map((entry) => formatCustomerMoney(entry)).join(' · ')

/** The number of customers without orders, computed from the stats counters. */
export const customersWithoutOrders = (
  stats: AdminCustomerStats,
): number => stats.totalCustomers - stats.customersWithOrders
