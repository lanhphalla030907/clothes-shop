import { apiGet, apiGetOne, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { ApiError } from '@/lib/api/errors'
import type { Order, OrderSummary, UUID } from '@/types/api'

/**
 * `GET /orders`, `GET /orders/:id` and customer cancellation.
 *
 * The reads are the customer's own orders. Cancellation is a named action rather
 * than a status update: the backend accepts it only for the caller's own pending,
 * unpaid order and releases its stock transactionally. On the detail read a 404
 * deliberately conflates "absent" with "not yours", so a missing order and someone
 * else's order are the same answer.
 */

/** The caller's orders, newest first. An empty array is a success, not a 404. */
export const fetchOrders = async (signal?: AbortSignal): Promise<OrderSummary[]> => {
  const orders = await apiGet<OrderSummary[]>(API.orders, { signal })
  return orders ?? []
}

export const fetchOrder = (id: UUID, signal?: AbortSignal): Promise<Order> =>
  apiGetOne<Order>(`${API.orders}/${id}`, { signal })

/**
 * Cancels one of the caller's own pending, unpaid orders.
 *
 * The server re-checks ownership, status and payment before it changes anything,
 * so a stale page cannot force a cancellation the customer is not entitled to.
 */
export const cancelOrder = (id: UUID): Promise<Order> =>
  apiPost<Order>(`${API.orders}/${id}/cancel`, undefined).then(requireOrder)

const requireOrder = (order: Order | undefined): Order => {
  if (order === undefined) {
    throw new Error('The order was not returned by the server.')
  }
  return order
}

/**
 * Downloads one order's receipt as a binary PDF blob.
 *
 * `GET /orders/:id/receipt` returns an A4 PDF. Ownership is enforced by the
 * server, so a caller only ever receives their own receipt.
 */
export const downloadReceipt = (orderId: UUID): Promise<Blob> =>
  apiGet<Blob>(`${API.orders}/${orderId}/receipt`, { responseType: 'blob' }).then((blob) => {
    if (blob === undefined) {
      throw new ApiError('The receipt could not be downloaded.', { kind: 'notFound', status: 404 })
    }
    return blob
  })

/** Joins a path segment that is already known to be a UUID. */
export const orderPath = (id: UUID): string => `${API.orders}/${id}`