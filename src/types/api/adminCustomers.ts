import type { ISODateTime, MoneyString, UUID } from './common'

/** One currency's money total for a customer. Currencies are never combined. */
export interface AdminCustomerMoney {
  currency: string
  amount: MoneyString
}

/** One row of `GET /admin/customers` — a customer summary with order aggregates. */
export interface AdminCustomerSummary {
  id: UUID
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: string
  createdAt: ISODateTime
  /** Every order, in any status, including `CANCELLED`. */
  totalOrders: number
  /** Spendable spend per currency, never combined across currencies. */
  totalSpentByCurrency: AdminCustomerMoney[]
  /** When the customer's most recent order was placed, any status. */
  lastOrderAt: ISODateTime | null
}

/** Pagination metadata beside the customer listing page. */
export interface AdminCustomerPagination {
  page: number
  limit: number
  total: number
  /** Zero when the filters match no customers. */
  totalPages: number
}

/** The administrative customer listing. */
export interface AdminCustomerListResponse {
  items: AdminCustomerSummary[]
  pagination: AdminCustomerPagination
}

/** Filters the customer listing accepts — every one is a server-side filter. */
export interface AdminCustomerListQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  registeredFrom?: ISODateTime
  registeredTo?: ISODateTime
  orderActivity?: 'WITH_ORDERS' | 'WITHOUT_ORDERS'
  sortBy?: 'createdAt' | 'name' | 'totalOrders' | 'totalSpent'
  sortOrder?: 'asc' | 'desc'
}

/** One of a customer's recent orders, enough to recognise and route to it. */
export interface AdminCustomerRecentOrder {
  id: UUID
  orderNumber: string
  status: string
  paymentMethod: string | null
  totalAmount: MoneyString
  currency: string
  /** Total units across the order's lines. */
  itemCount: number
  createdAt: ISODateTime
  /** Whether money moved for this order. */
  isPaid: boolean
}

/** One saved address of a customer, as the customer's own book shows it. */
export interface AdminCustomerAddress {
  id: UUID
  label: string
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string | null
  stateProvince: string | null
  administrativeLocationPcode: string | null
  postalCode: string | null
  countryCode: string
  isDefault: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** One customer, read-only, for the administrative detail view. */
export interface AdminCustomerDetail {
  id: UUID
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  emailVerifiedAt: ISODateTime | null
  lastLoginAt: ISODateTime | null
  /** Every order, in any status, including `CANCELLED`. */
  totalOrders: number
  /** Orders in `CANCELLED`, a subset of `totalOrders`. */
  cancelledOrders: number
  /** Orders that count toward spending. */
  spendingOrders: number
  /** Per-currency spendable totals, never combined. */
  totalSpentByCurrency: AdminCustomerMoney[]
  /** Per-currency average order value, absent for currencies with no spend. */
  averageOrderValueByCurrency: AdminCustomerMoney[]
  lastOrderAt: ISODateTime | null
  recentOrders: AdminCustomerRecentOrder[]
  addresses: AdminCustomerAddress[]
}

/** The headline counters returned by `GET /admin/customers/stats`. */
export interface AdminCustomerStats {
  totalCustomers: number
  activeCustomers: number
  newCustomers: number
  customersWithOrders: number
  newCustomerWindowDays: number
}
