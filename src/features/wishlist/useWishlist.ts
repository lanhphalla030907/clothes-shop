import { useCallback, useState } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { fetchWishlist, removeWishlistItem } from './api'
import type { Wishlist, WishlistItem } from '@/types/api'

/**
 * The wishlist read plus the two removals the page offers.
 *
 * Clearing the whole list is a deliberate confirmation on the page rather than a
 * hook-level flag — it is a destructive act and belongs next to the button that
 * causes it, not hidden in state.
 */

export interface WishlistResource {
  wishlist: Wishlist | undefined
  items: readonly WishlistItem[]
  isLoading: boolean
  isRefreshing: boolean
  error: unknown
  actionError: unknown
  refetch: () => void
  remove: (itemId: string) => Promise<boolean>
  isPendingItem: (itemId: string) => boolean
  dismissActionError: () => void
}

export const useWishlist = (): WishlistResource => {
  const resource = useAsyncResource<Wishlist | undefined>((signal) => fetchWishlist(signal), [])

  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set())
  const [actionError, setActionError] = useState<unknown>(undefined)

  const remove = useCallback(
    async (itemId: string): Promise<boolean> => {
      // Refuse a second tap on the row already being removed.
      if (pendingIds.has(itemId)) return false

      setPendingIds((current) => new Set(current).add(itemId))
      setActionError(undefined)

      try {
        await removeWishlistItem(itemId)
        resource.refetch()
        return true
      } catch (cause) {
        setActionError(cause)
        return false
      } finally {
        setPendingIds((current) => {
          const next = new Set(current)
          next.delete(itemId)
          return next
        })
      }
    },
    [pendingIds, resource],
  )

  const dismissActionError = useCallback(() => setActionError(undefined), [])

  return {
    wishlist: resource.data,
    items: resource.data?.items ?? [],
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    error: resource.error,
    actionError,
    refetch: resource.refetch,
    remove,
    isPendingItem: (itemId) => pendingIds.has(itemId),
    dismissActionError,
  }
}