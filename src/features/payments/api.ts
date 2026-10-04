import { apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type { Payment, UUID } from '@/types/api'

/**
 * `POST /orders/:orderId/payments`.
 *
 * ## The body is empty, and that is the security property
 *
 * The amount charged is the order's own total in the order's own currency, both
 * already computed by checkout. There is deliberately no request type to send an
 * amount in, so a client cannot ask to be charged a different number.
 *
 * ## There is no way to ask a payment what happened
 *
 * The API has no "get payment status" endpoint, and an order response carries no
 * payment list. The only observable signal that a scan succeeded is the **order's
 * status changing**, because PayWay's callback is what advances it. So the flow is
 * create → show QR → re-read the order, and this module does not pretend to offer
 * a poller.
 */

export const createPayment = (orderId: UUID, signal?: AbortSignal): Promise<Payment> =>
  apiPost<Payment>(`${API.orders}/${orderId}/payments`, undefined, { signal }).then(requirePayment)

/**
 * PayWay not being configured is a **503**, not a 400 and not a generic 500.
 * That is a state the operator can fix without the shopper doing anything, and the
 * message says so — a customer must never be told their card was declined when the
 * real answer is that the payment provider is offline.
 */
export const isProviderUnavailable = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { kind?: string }).kind === 'serviceUnavailable'

const requirePayment = (payment: Payment | undefined): Payment => {
  if (!payment) throw new Error('The payment could not be started.')
  return payment
}