import type { UUID } from './common'

/**
 * Stock alert read model for the admin dashboard.
 *
 * `available` is the server's derived `quantity - reservedQuantity`, and `status`
 * is derived from it: `IN_STOCK` above 10, `LOW_STOCK` from 1 to 10, and
 * `OUT_OF_STOCK` at 0 or below. Neither is stored, so the client never recomputes
 * the rule.
 */
export type StockAlertStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

/**
 * `alerts` is the default table view: low stock and out of stock together. The
 * other three are the explicit filters.
 */
export type StockAlertFilter = 'alerts' | 'all' | 'in' | 'low' | 'out'

export interface StockAlertItem {
  variantId: UUID
  productId: UUID
  productName: string
  productImage: string | null
  sku: string
  color: string | null
  size: string | null
  quantity: number
  reservedQuantity: number
  available: number
  status: StockAlertStatus
}

export interface StockAlertSummary {
  inStock: number
  lowStock: number
  outOfStock: number
  /** Variants that have a stock row. Variants without one are not counted. */
  total: number
}

/** Pagination metadata for the stock alerts table. */
export interface StockAlertsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface StockAlertsResponse {
  summary: StockAlertSummary
  items: StockAlertItem[]
  pagination: StockAlertsPagination
}

/** The query a client may send to the stock alerts endpoint. */
export interface StockAlertsQuery {
  page: number
  limit: number
  status?: StockAlertFilter
  search?: string
}
