import type { MoneyString } from './common'

/**
 * Finance reporting contracts.
 *
 * These mirror the read-only admin finance endpoints exactly. Money is always a
 * fixed two-decimal string and ratios are decimal strings such as `"0.2941"`.
 * The browser formats these values; it never recalculates them.
 */

export type FinanceBasis = 'delivered' | 'booked'
export type FinanceTrendGranularity = 'day' | 'week' | 'month'
export type FinanceProductSortBy =
  | 'revenue'
  | 'profit'
  | 'units'
  | 'margin'
  | 'productName'
export type FinanceSortOrder = 'asc' | 'desc'
export type FinanceRankingMetric = 'revenue' | 'profit' | 'units'

/** The reporting window echoed back with every finance response. */
export interface FinanceRangeResponse {
  from: string
  to: string
  basis: FinanceBasis
  timezone: string
  currency?: string
}

/** Revenue, discounts and known-cost profit for one currency. */
export interface FinanceOverviewCurrency {
  currency: string
  orderCount: number
  grossSales: MoneyString
  productDiscounts: MoneyString
  shippingDiscounts: MoneyString
  totalDiscounts: MoneyString
  shippingRevenue: MoneyString
  netProductRevenue: MoneyString
  netRevenue: MoneyString
  averageOrderValue: MoneyString | null
  cogs: MoneyString | null
  knownCostNetRevenue: MoneyString
  grossProfit: MoneyString | null
  grossMargin: string | null
  costCoverage: string | null
  isProfitPartial: boolean
  discountMismatchCount: number
  codOrderCount: number
  onlinePaidOrderCount: number
}

/** Cash and receivable totals for one currency. */
export interface CashReconciliationCurrency {
  currency: string
  onlineCash: MoneyString
  codCash: MoneyString
  cashCollected: MoneyString
  orphanCash: MoneyString
  deferredCash: MoneyString
  codReceivable: MoneyString
  unpaidOnline: MoneyString
  accrualRevenue: MoneyString
  reconciliationVariance: MoneyString
  counts: {
    onlinePaidOrders: number
    codCollectedOrders: number
    orphanCashOrders: number
    deferredCashOrders: number
    codReceivableOrders: number
    unpaidOnlineOrders: number
    deliveredOrders: number
  }
}

export interface FinanceOverviewResponse {
  range: FinanceRangeResponse
  byCurrency: FinanceOverviewCurrency[]
  cashByCurrency: CashReconciliationCurrency[]
}

export interface RevenueTrendBucket {
  period: string
  orderCount: number
  grossSales: MoneyString
  productDiscounts: MoneyString
  shippingDiscounts: MoneyString
  totalDiscounts: MoneyString
  shippingRevenue: MoneyString
  netProductRevenue: MoneyString
  netRevenue: MoneyString
  cogs: MoneyString | null
  knownCostNetRevenue: MoneyString
  grossProfit: MoneyString | null
  grossMargin: string | null
  costCoverage: string | null
  isProfitPartial: boolean
}

export interface RevenueTrendSeries {
  currency: string
  buckets: RevenueTrendBucket[]
}

export interface RevenueTrendResponse {
  range: FinanceRangeResponse
  granularity: FinanceTrendGranularity
  timezone: string
  series: RevenueTrendSeries[]
}

export interface ProductProfitItem {
  productId: string
  productName: string
  variantId: string
  variantSku: string
  currency: string
  orderCount: number
  unitsSold: number
  grossRevenue: MoneyString
  productDiscounts: MoneyString
  netRevenue: MoneyString
  cogs: MoneyString | null
  knownCostNetRevenue: MoneyString
  grossProfit: MoneyString | null
  grossMargin: string | null
  costCoverage: string | null
  isProfitPartial: boolean
}

export interface ProductProfitResponse {
  range: FinanceRangeResponse
  items: ProductProfitItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ProductRankingItem {
  rank: number
  productId: string
  productName: string
  currency: string
  unitsSold: number
  netRevenue: MoneyString
  cogs: MoneyString | null
  grossProfit: MoneyString | null
  grossMargin: string | null
  costCoverage: string | null
  isProfitPartial: boolean
}

export interface ProductRankingsResponse {
  range: FinanceRangeResponse
  metric: FinanceRankingMetric
  items: ProductRankingItem[]
}

export interface CashReconciliationResponse {
  range: FinanceRangeResponse
  byCurrency: CashReconciliationCurrency[]
}

/** Date range and currency filter accepted by every finance endpoint. */
export interface FinanceDateRangeQuery {
  from?: string
  to?: string
  currency?: string
}

/** Revenue queries additionally choose the recognition basis. */
export interface FinanceQuery extends FinanceDateRangeQuery {
  basis?: FinanceBasis
}

export interface RevenueTrendQuery extends FinanceQuery {
  granularity?: FinanceTrendGranularity
}

export interface ProductProfitQuery extends FinanceQuery {
  page?: number
  limit?: number
  sortBy?: FinanceProductSortBy
  sortOrder?: FinanceSortOrder
}

export interface RankingsQuery extends FinanceQuery {
  metric?: FinanceRankingMetric
  limit?: number
}

/** Cash reconciliation deliberately has no `basis` parameter. */
export type CashReconciliationQuery = FinanceDateRangeQuery
