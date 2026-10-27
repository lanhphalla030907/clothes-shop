import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useAuth } from '@/features/auth/useAuth'
import { addCartLine, clearCart, fetchCart, removeCartLine, updateCartLine } from './api'
import { CartActionsContext, type CartActions } from './cartActions'
import type { Cart, UUID } from '@/types/api'

type PendingKey = { kind: 'line' | 'variant'; id: UUID }

const track = (current: ReadonlySet<UUID>, key: PendingKey | null, pending: boolean): ReadonlySet<UUID> => {
  const next = new Set(current)
  if (!key) return next
  if (pending) next.add(key.id)
  else next.delete(key.id)
  // Drop to an empty set when idle, so the membership checks stay cheap.
  return next.size === 0 ? new Set() : next
}

/**
 * Owns the cart read and every write to it.
 *
 * Writes re-read rather than patch local state: `POST` increments a line that is
 * already present, stock moves under a line, and the server recomputes
 * `lineTotal` and `subtotal`. Applying a client's guess instead would mean
 * re-implementing those rules here, and prices are not the client's to decide.
 */
export function CartActionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  // Signed out there is no cart to read and `GET /cart` would answer 401, so the
  // scope is part of what invalidates this resource rather than an error to show.
  const resource = useAsyncResource<Cart | undefined>(
    (signal) => (isAuthenticated ? fetchCart(signal) : Promise.resolve(undefined)),
    [isAuthenticated],
  )
  const { refetch } = resource

  const [pendingLines, setPendingLines] = useState<ReadonlySet<UUID>>(() => new Set())
  const [pendingVariants, setPendingVariants] = useState<ReadonlySet<UUID>>(() => new Set())
  const [isClearing, setIsClearing] = useState(false)
  const [actionError, setActionError] = useState<unknown>(undefined)

  /**
   * A ref beside the state: two clicks in the same tick would both read a stale
   * render's state, and the cart endpoint increments rather than deduplicates.
   */
  const addingVariants = useRef<ReadonlySet<UUID>>(new Set())

  const mark = useCallback((key: PendingKey | null, pending: boolean) => {
    if (!key) return
    if (key.kind === 'line') setPendingLines((current) => track(current, key, pending))
    else setPendingVariants((current) => track(current, key, pending))
  }, [])

  const perform = useCallback(
    async (key: PendingKey | null, write: () => Promise<unknown>): Promise<boolean> => {
      mark(key, true)
      setActionError(undefined)

      try {
        await write()
        refetch()
        return true
      } catch (cause) {
        setActionError(cause)
        // A refused write leaves the cart in an unknown state — a rejected
        // increment may still have been applied — so re-read rather than assume.
        refetch()
        return false
      } finally {
        mark(key, false)
      }
    },
    [mark, refetch],
  )

  const add = useCallback(
    async (variantId: UUID, quantity = 1): Promise<boolean> => {
      if (addingVariants.current.has(variantId)) return false

      addingVariants.current = new Set(addingVariants.current).add(variantId)
      try {
        return await perform({ kind: 'variant', id: variantId }, () =>
          addCartLine({ variantId, quantity }),
        )
      } finally {
        addingVariants.current = new Set(
          [...addingVariants.current].filter((id) => id !== variantId),
        )
      }
    },
    [perform],
  )

  const setQuantity = useCallback(
    (lineId: UUID, quantity: number) =>
      perform({ kind: 'line', id: lineId }, () => updateCartLine(lineId, { quantity })),
    [perform],
  )

  const removeLine = useCallback(
    (lineId: UUID) => perform({ kind: 'line', id: lineId }, () => removeCartLine(lineId)),
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

  const value = useMemo<CartActions>(
    () => ({
      cart: resource.data,
      lines: resource.data?.items ?? [],
      itemCount: resource.data?.itemCount ?? 0,
      isLoading: resource.isLoading,
      isRefreshing: resource.isRefreshing,
      error: resource.error,
      refetch,
      actionError,
      isPendingLine: (lineId) => pendingLines.has(lineId),
      isPendingVariant: (variantId) => pendingVariants.has(variantId),
      isClearing,
      add,
      setQuantity,
      removeLine,
      clear,
      dismissActionError,
    }),
    [
      resource,
      refetch,
      actionError,
      pendingLines,
      pendingVariants,
      isClearing,
      add,
      setQuantity,
      removeLine,
      clear,
      dismissActionError,
    ],
  )

  return <CartActionsContext.Provider value={value}>{children}</CartActionsContext.Provider>
}