import { useCallback, useState } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { addCartLine, clearCart, fetchCart, removeCartLine, updateCartLine } from './api'
import type { Cart, CartLine, UUID } from '@/types/api'

/**
 * The account cart: one hook that owns the read, every write, and the refresh
 * that follows each one.
 *
 * Writes re-read the cart instead of patching local state. That is deliberate
 * even though it costs a round trip: `addCartLine` is an *increment* for a
 * variant already present, stock can change under a line, and the server
 * recomputes `lineTotal`. Patching locally would mean re-implementing those rules
 * on the client, and the client is not allowed to decide prices.
 *
 * `pendingLineIds` exists so a row can show its own spinner without freezing the
 * whole cart — a quantity change should not blank the page.
 */

export interface AccountCart {
  cart: Cart | undefined
  lines: readonly CartLine[]
  isLoading: boolean
  isRefreshing: boolean
  error: unknown
  refetch: () => void
  /** The most recent write failure, cleared by the next write. */
  actionError: unknown
  isPendingLine: (lineId: UUID) => boolean
  isClearing: boolean
  isAdding: boolean
  addVariant: (variantId: UUID, quantity?: number) => Promise<boolean>
  setQuantity: (lineId: UUID, quantity: number) => Promise<boolean>
  removeLine: (lineId: UUID) => Promise<boolean>
  clear: () => Promise<boolean>
  dismissActionError: () => void
}

export const useAccountCart = (): AccountCart => {
  const resource = useAsyncResource<Cart | undefined>((signal) => fetchCart(signal), [])

  const [pendingLineIds, setPendingLineIds] = useState<ReadonlySet<UUID>>(() => new Set())
  const [isClearing, setIsClearing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [actionError, setActionError] = useState<unknown>(undefined)

  const markPending = useCallback((lineId: UUID | null, pending: boolean) => {
    setPendingLineIds((current) => {
      const next = new Set(current)
      if (pending && lineId) next.add(lineId)
      else if (lineId) next.delete(lineId)

      // Drop the set entirely when idle so `isPendingLine` stays cheap.
      return next.size === 0 ? new Set() : next
    })
  }, [])

  /** Runs a write, tracks it, and refreshes. Returns whether it succeeded. */
  const perform = useCallback(
    async (lineId: UUID | null, write: () => Promise<unknown>): Promise<boolean> => {
      markPending(lineId, true)
      setActionError(undefined)

      try {
        await write()
        resource.refetch()
        return true
      } catch (cause) {
        setActionError(cause)
        // A failed quantity change can leave the cart stale in either direction,
        // so re-read rather than guess what the server holds now.
        resource.refetch()
        return false
      } finally {
        markPending(lineId, false)
      }
    },
    [markPending, resource],
  )

  const addVariant = useCallback(
    async (variantId: UUID, quantity = 1): Promise<boolean> => {
      setIsAdding(true)
      try {
        return await perform(null, () => addCartLine({ variantId, quantity }))
      } finally {
        setIsAdding(false)
      }
    },
    [perform],
  )

  const setQuantity = useCallback(
    (lineId: UUID, quantity: number) =>
      perform(lineId, () => updateCartLine(lineId, { quantity })),
    [perform],
  )

  const removeLine = useCallback(
    (lineId: UUID) => perform(lineId, () => removeCartLine(lineId)),
    [perform],
  )

  const clear = useCallback(async (): Promise<boolean> => {
    setIsClearing(true)
    try {
      return await perform(null, () => clearCart())
    } finally {
      setIsClearing(false)
    }
  }, [perform])

  const dismissActionError = useCallback(() => setActionError(undefined), [])

  return {
    cart: resource.data,
    lines: resource.data?.items ?? [],
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    refetch: resource.refetch,
    actionError,
    isPendingLine: (lineId) => pendingLineIds.has(lineId),
    isClearing,
    isAdding,
    addVariant,
    setQuantity,
    removeLine,
    clear,
    dismissActionError,
  }
}