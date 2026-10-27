import { createContext } from 'react'
import type { Cart, CartLine, UUID } from '@/types/api'

/**
 * The one cart the app has: the server's, addressed by `X-User-Id`.
 *
 * It is mounted once at the root, so the storefront badge, a product page's add
 * button, the wishlist and the bag page all read and write the same state. A
 * second copy would let two disagree about the count after a mutation.
 */
export interface CartActions {
  /** The server's cart, or `undefined` until the first read lands. */
  cart: Cart | undefined
  lines: readonly CartLine[]
  /** Sum of quantities, from the server. `0` rather than a guess while loading. */
  itemCount: number
  isLoading: boolean
  /** A read over data already on screen — keep rendering `cart`. */
  isRefreshing: boolean
  error: unknown
  refetch: () => void

  /** The most recent write failure, cleared by the next write. */
  actionError: unknown
  isPendingLine: (lineId: UUID) => boolean
  /** Set while a variant is being added, which also blocks a second add. */
  isPendingVariant: (variantId: UUID) => boolean
  isClearing: boolean

  /** Every write resolves `true` on success and `false` on failure; none throw. */
  add: (variantId: UUID, quantity?: number) => Promise<boolean>
  /** Absolute quantity, because that is what the endpoint expects. */
  setQuantity: (lineId: UUID, quantity: number) => Promise<boolean>
  removeLine: (lineId: UUID) => Promise<boolean>
  clear: () => Promise<boolean>
  dismissActionError: () => void
}

/** `null` until a provider is above the caller, which is what the hook checks. */
export const CartActionsContext = createContext<CartActions | null>(null)