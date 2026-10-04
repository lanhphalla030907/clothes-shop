import { apiGet, apiGetOne } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type { Order, OrderSummary, UUID } from '@/types/api'

/**
 * `GET /orders` and `GET /orders/:id`.
 *
 * Read-only by design: the API exposes no way to change an order, so neither does
 * this module. `recoverIdentity` is set on the collection read only — a 404 there
 * can mean nothing except "the claimed user does not exist", whereas on the
 * detail read 404 deliberately conflates "absent" with "not yours".
 */

/** The caller's orders, newest first. An empty array is a success, not a 404. */
export const fetchOrders = async (signal?: AbortSignal): Promise<OrderSummary[]> => {
  const orders = await apiGet<OrderSummary[]>(API.orders, { signal, recoverIdentity: true })
  return orders ?? []
}

export const fetchOrder = (id: UUID, signal?: AbortSignal): Promise<Order> =>
  apiGetOne<Order>(`${API.orders}/${id}`, { signal })

/** Joins a path segment that is already known to be a UUID. */
export const orderPath = (id: UUID): string => `${API.orders}/${id}`