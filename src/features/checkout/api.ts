import { apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type { CheckoutRequest, Order } from '@/types/api'

/**
 * `POST /checkout`.
 *
 * The body is one field on purpose. What to buy comes from the cart, what it
 * costs is priced by the server at commit time, and where it goes is an address
 * this user owns — so there is nothing for a client to send about any of it.
 *
 * Failure here is usually worth showing verbatim rather than rewriting: an empty
 * cart, an out-of-stock variant and an address belonging to someone else are three
 * different problems with three different fixes, and all three come back as
 * ordinary API errors.
 */

export const placeOrder = (body: CheckoutRequest, signal?: AbortSignal): Promise<Order> =>
  apiPost<Order>(API.checkout, body, { signal }).then(requireOrder)

const requireOrder = (order: Order | undefined): Order => {
  if (!order) throw new Error('Checkout did not return the created order.')
  return order
}