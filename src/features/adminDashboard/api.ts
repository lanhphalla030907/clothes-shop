import { apiGetOne } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { fetchAdminOrders } from '@/features/adminOrders/api'
import { ORDER_STATUS_OPTIONS } from '@/features/adminOrders/rules'
import type {
  AdminOrderListResponse,
  OrderStatus,
  StockAlertsQuery,
  StockAlertsResponse,
} from '@/types/api'
import { emptyOrderStatusCounts } from './reporting'

export type OrderStatusCounts = Record<OrderStatus, number>

/**
 * Current order counts for each lifecycle status.
 *
 * The order listing has no aggregate endpoint, but each filtered listing returns
 * its real `pagination.total`. Six one-row requests therefore give exact counts
 * without inventing a backend route or downloading the order table. The same
 * reporting range is applied to every request.
 */
export const fetchOrderStatusCounts = async (
  query: { createdFrom?: string; createdTo?: string },
  signal?: AbortSignal,
): Promise<OrderStatusCounts> => {
  const responses = await Promise.all(
    ORDER_STATUS_OPTIONS.map((status) =>
      fetchAdminOrders(
        {
          page: 1,
          limit: 1,
          status,
          createdFrom: query.createdFrom,
          createdTo: query.createdTo,
        },
        signal,
      ),
    ),
  )

  const counts = emptyOrderStatusCounts()
  ORDER_STATUS_OPTIONS.forEach((status, index) => {
    counts[status] = responses[index]?.pagination.total ?? 0
  })
  return counts
}

/** The latest orders across all statuses, newest first. */
export const fetchRecentOrders = (
  limit: number,
  signal?: AbortSignal,
): Promise<AdminOrderListResponse> =>
  fetchAdminOrders({ page: 1, limit }, signal)

/**
 * The stock alert table and its summary counts.
 *
 * The server always returns the three full totals, so the cards do not change
 * when the table is filtered. `alerts` is the default view and means low stock
 * plus out of stock. `page`/`limit` are paginated in the database; `search`
 * matches the product name or variant SKU.
 */
export const fetchStockAlerts = (
  query: StockAlertsQuery,
  signal?: AbortSignal,
): Promise<StockAlertsResponse> =>
  apiGetOne<StockAlertsResponse>(API.adminStockAlerts, {
    signal,
    query: {
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
    },
  })
