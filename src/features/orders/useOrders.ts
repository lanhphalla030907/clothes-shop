import { useAsyncResource } from '@/hooks/useAsyncResource'
import { fetchOrder, fetchOrders } from './api'
import type { Order, OrderSummary, UUID } from '@/types/api'

/**
 * Read hooks for the caller's orders.
 *
 * They add nothing but the wiring from the API module to the shared async hook —
 * which is the point. Every page gets cancellation, a truthful loading flag and a
 * `refetch` from one implementation.
 */

export const useOrders = () => useAsyncResource<OrderSummary[]>((signal) => fetchOrders(signal), [])

export const useOrder = (id: UUID | undefined) =>
  useAsyncResource<Order | undefined>(
    async (signal) => (id ? fetchOrder(id, signal) : undefined),
    [id],
  )