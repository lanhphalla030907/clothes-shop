import { apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  CheckoutQuote,
  CheckoutRequest,
  CreateCheckoutQuoteRequest,
  Order,
} from '@/types/api'

/**
 * Quote creation and quote-backed order submission.
 *
 * The quote request contains address, provider and payment selection. Checkout
 * consumes only the server quote and a UUID idempotency key.
 *
 * API failures retain their server error details for customer-facing feedback.
 */

export const createCheckoutQuote = (
  body: CreateCheckoutQuoteRequest,
  signal?: AbortSignal,
): Promise<CheckoutQuote> =>
  apiPost<CheckoutQuote>(`${API.checkout}/quote`, body, { signal }).then(requireQuote)

export const placeOrder = (body: CheckoutRequest, signal?: AbortSignal): Promise<Order> =>
  apiPost<Order>(API.checkout, body, { signal }).then(requireOrder)

const requireQuote = (quote: CheckoutQuote | undefined): CheckoutQuote => {
  if (!quote) throw new Error('Checkout did not return a quote.')
  return quote
}

const requireOrder = (order: Order | undefined): Order => {
  if (!order) throw new Error('Checkout did not return the created order.')
  return order
}