import { createContext } from 'react'
import type { Wishlist, WishlistItem } from '@/types/api'

export interface WishlistActions {
  wishlist: Wishlist | undefined
  items: readonly WishlistItem[]
  itemCount: number
  isLoading: boolean
  isRefreshing: boolean
  error: unknown
  refetch: () => void
  actionError: unknown
  dismissActionError: () => void
  /** `productId` is the handle a card or product page holds. */
  add: (productId: string) => Promise<boolean>
  remove: (itemId: string) => Promise<boolean>
  clear: () => Promise<boolean>
  isSaved: (productId: string) => boolean
  isPendingProduct: (productId: string) => boolean
  isPendingItem: (itemId: string) => boolean
  isClearing: boolean
}

export const WishlistActionsContext = createContext<WishlistActions | undefined>(undefined)