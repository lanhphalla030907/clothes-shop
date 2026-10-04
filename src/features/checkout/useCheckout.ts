import { useCallback, useState } from 'react'
import { useMutation } from '@/hooks/useMutation'
import { placeOrder } from './api'
import type { CheckoutRequest, Order, UUID } from '@/types/api'

/**
 * Placing an order, once.
 *
 * Two things make this safe to put behind a button:
 *
 * - `useMutation` refuses a second run while one is in flight, so a
 *   double-tapped "Place order" cannot create two orders.
 * - `placedOrder` keeps the created order in component state, so a re-render
 *   cannot re-submit and a page refresh cannot replay the purchase. Checkout is
 *   the one flow with no idempotency key available, so the client must be the
 *   thing that guarantees it is only sent once.
 *
 * The cart and any prices it showed are left alone here. Checkout empties the
 * server cart server-side; the cart page re-reads and finds that out for itself,
 * which is better than being told about it by a mutation's return value.
 */

export interface CheckoutFlow {
  placeOrder: (body: CheckoutRequest) => Promise<Order | undefined>
  isPlacing: boolean
  error: unknown
  /** The order this session created, or `undefined` before a successful submit. */
  placedOrder: Order | undefined
  reset: () => void
}

export const useCheckout = (): CheckoutFlow => {
  const [placedOrder, setPlacedOrder] = useState<Order | undefined>(undefined)

  const mutation = useMutation<[CheckoutRequest], Order>((body) => placeOrder(body), {
    onSuccess: (order) => setPlacedOrder(order),
  })

  const submit = useCallback(
    async (body: CheckoutRequest) => {
      setPlacedOrder(undefined)
      return mutation.run(body)
    },
    [mutation],
  )

  const reset = useCallback(() => {
    setPlacedOrder(undefined)
    mutation.reset()
  }, [mutation])

  return {
    placeOrder: submit,
    isPlacing: mutation.isPending,
    error: mutation.error,
    placedOrder,
    reset,
  }
}

/** The address checkout should pre-select: the default, else the only one. */
export const preferredAddressId = (
  addresses: readonly { id: UUID; isDefault: boolean }[],
): UUID | undefined => {
  const preferred = addresses.find((address) => address.isDefault) ?? addresses[0]
  return preferred?.id
}