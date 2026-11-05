import { ORDER_STATUS, type Order } from '@/types/api'

/**
 * The customer-facing cancellation rule, as far as the order DTO can express it.
 *
 * The detail response carries the lifecycle status but not payment attempts, so
 * this decides only whether to offer the action. It is not an authorisation
 * boundary: the server also checks ownership and for a verified payment, and a
 * stale or hand-crafted request is still refused there.
 */
export const canCancelCustomerOrder = (
  order: Pick<Order, 'status'>,
): boolean => order.status === ORDER_STATUS.PENDING
