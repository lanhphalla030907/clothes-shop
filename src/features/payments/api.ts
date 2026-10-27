import { apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { isApiError } from '@/lib/api/errors'
import type { Payment, UUID } from '@/types/api'

/**
 * `POST /orders/:orderId/payments`.
 *
 * The body is empty by contract — the amount is the order's own total in the
 * order's own currency, so there is no field to put one in. Passing `undefined`
 * sends no body at all.
 *
 * The endpoint replays the pending attempt rather than creating a second one,
 * which is what makes re-reading the payment after a refresh safe.
 */

export const createPayment = (orderId: UUID, signal?: AbortSignal): Promise<Payment> =>
  apiPost<Payment>(`${API.orders}/${orderId}/payments`, undefined, { signal }).then(requirePayment)

/**
 * PayWay being unconfigured or down is a 503 (`ApiErrorKind` `'unavailable'`).
 * That is an operator problem, not a shopper's, and must never be rendered as a
 * declined payment.
 */
export const isProviderUnavailable = (error: unknown): boolean =>
  isApiError(error) && error.kind === 'unavailable'

const requirePayment = (payment: Payment | undefined): Payment => {
  if (!payment) throw new Error('The payment could not be started.')
  return payment
}