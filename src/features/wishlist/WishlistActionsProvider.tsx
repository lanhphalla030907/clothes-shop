import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useAuth } from '@/features/auth/useAuth'
import { addWishlistItem, clearWishlist, fetchWishlist, removeWishlistItem } from './api'
import { WishlistActionsContext } from './wishlistActions'

/** One in-flight wishlist write, keyed the way the caller identifies it. */
type PendingKey = string

export function WishlistActionsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  // A saved piece belongs to an account, so with no session there is nothing to
  // read and no `401` to render as an error state.
  const resource = useAsyncResource(
    (signal) => (isAuthenticated ? fetchWishlist(signal) : Promise.resolve(undefined)),
    [isAuthenticated],
  )

  const [pendingProducts, setPendingProducts] = useState<ReadonlySet<PendingKey>>(() => new Set())
  const [pendingItems, setPendingItems] = useState<ReadonlySet<PendingKey>>(() => new Set())
  const [isClearing, setIsClearing] = useState(false)
  const [actionError, setActionError] = useState<unknown>(undefined)

  // State updates land after a click, so a ref is what actually refuses the second
  // tap arriving in the same tick.
  const inFlight = useRef<ReadonlySet<PendingKey>>(new Set())

  const mark = useCallback((key: PendingKey | null, busy: boolean) => {
    if (key === null) return
    const next = new Set(inFlight.current)
    if (busy) next.add(key)
    else next.delete(key)
    inFlight.current = next
  }, [])

  const perform = useCallback(
    async (key: PendingKey | null, write: () => Promise<unknown>): Promise<boolean> => {
      mark(key, true)
      setActionError(undefined)

      try {
        await write()
        resource.refetch()
        return true
      } catch (cause) {
        // The write failed but the server may still have moved, so re-read rather
        // than trusting this screen.
        setActionError(cause)
        resource.refetch()
        return false
      } finally {
        mark(key, false)
      }
    },
    [mark, resource],
  )

  const add = useCallback(
    async (productId: string): Promise<boolean> => {
      if (inFlight.current.has(productId)) return false

      setPendingProducts((current) => new Set(current).add(productId))
      try {
        return await perform(productId, () => addWishlistItem({ productId }))
      } finally {
        setPendingProducts((current) => {
          const next = new Set(current)
          next.delete(productId)
          return next
        })
      }
    },
    [perform],
  )

  const remove = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (inFlight.current.has(itemId)) return false

      setPendingItems((current) => new Set(current).add(itemId))
      try {
        return await perform(itemId, () => removeWishlistItem(itemId))
      } finally {
        setPendingItems((current) => {
          const next = new Set(current)
          next.delete(itemId)
          return next
        })
      }
    },
    [perform],
  )

  const clear = useCallback(async (): Promise<boolean> => {
    if (inFlight.current.has('clear')) return false

    inFlight.current = new Set(inFlight.current).add('clear')
    setIsClearing(true)
    try {
      return await perform(null, () => clearWishlist())
    } finally {
      inFlight.current = new Set([...inFlight.current].filter((key) => key !== 'clear'))
      setIsClearing(false)
    }
  }, [perform])

  const savedProductIds = useMemo(
    () => new Set((resource.data?.items ?? []).map((item) => item.productId)),
    [resource.data],
  )

  const value = useMemo(
    () => ({
      wishlist: resource.data,
      items: resource.data?.items ?? [],
      itemCount: resource.data?.itemCount ?? 0,
      isLoading: resource.isLoading,
      isRefreshing: resource.isRefreshing,
      error: resource.error,
      refetch: resource.refetch,
      actionError,
      dismissActionError: () => setActionError(undefined),
      add,
      remove,
      clear,
      isSaved: (productId: string) => savedProductIds.has(productId),
      isPendingProduct: (productId: string) => pendingProducts.has(productId),
      isPendingItem: (itemId: string) => pendingItems.has(itemId),
      isClearing,
    }),
    [
      resource,
      savedProductIds,
      actionError,
      add,
      remove,
      clear,
      pendingProducts,
      pendingItems,
      isClearing,
    ],
  )

  return <WishlistActionsContext.Provider value={value}>{children}</WishlistActionsContext.Provider>
}