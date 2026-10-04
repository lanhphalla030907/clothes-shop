import { apiDelete, apiGet, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AddWishlistItemRequest,
  Wishlist,
  WishlistItem,
} from '@/types/api'

/**
 * `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:itemId`,
 * `DELETE /wishlist`.
 *
 * `POST` answers 201 whether the entry was created or already existed — from the
 * customer's point of view the product is saved either way — so a duplicate is
 * a no-op rather than a conflict.
 */

export const fetchWishlist = async (signal?: AbortSignal): Promise<Wishlist | undefined> =>
  apiGet<Wishlist>(API.wishlist, { signal, recoverIdentity: true })

export const addWishlistItem = (
  body: AddWishlistItemRequest,
  signal?: AbortSignal,
): Promise<WishlistItem> =>
  apiPost<WishlistItem>(API.wishlistItems, body, { signal }).then(requireItem)

export const removeWishlistItem = (itemId: string, signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(`${API.wishlistItems}/${itemId}`, { signal }).then(() => undefined)

export const clearWishlist = (signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(API.wishlist, { signal }).then(() => undefined)

const requireItem = (item: WishlistItem | undefined): WishlistItem => {
  if (!item) throw new Error('The wishlist did not return the saved product.')
  return item
}