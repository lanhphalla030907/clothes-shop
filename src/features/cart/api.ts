import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AddCartLineRequest,
  Cart,
  CartLine,
  UpdateCartLineRequest,
  UUID,
} from '@/types/api'

/**
 * `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`, `DELETE`.
 *
 * The cart is addressed by its owner, so no path here can name somebody else's.
 * Prices are never computed here: `unitPrice` and `lineTotal` are read from the
 * response, so what the customer sees is what the server charged.
 *
 * These are the *account* cart. The storefront's bag is a separate, local
 * prototype — see the phase report.
 */

/** Creates an empty cart on first read, so a missing cart is never an error. */
export const fetchCart = async (signal?: AbortSignal): Promise<Cart | undefined> => {
  const cart = await apiGet<Cart>(API.cart, { signal })
  return cart
}

/**
 * Adds a variant. When the variant is already in the cart this is an **increment**,
 * which is why a caller cannot assume the resulting quantity is what it sent — it
 * re-reads the returned line.
 */
export const addCartLine = (body: AddCartLineRequest, signal?: AbortSignal): Promise<CartLine> =>
  apiPost<CartLine>(API.cartItems, body, { signal }).then(requireLine)

/** Quantity is absolute, not a delta: send the total the line should have. */
export const updateCartLine = (
  itemId: UUID,
  body: UpdateCartLineRequest,
  signal?: AbortSignal,
): Promise<CartLine> =>
  apiPatch<CartLine>(`${API.cartItems}/${itemId}`, body, { signal }).then(requireLine)

export const removeCartLine = (itemId: UUID, signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(`${API.cartItems}/${itemId}`, { signal }).then(() => undefined)

export const clearCart = (signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(API.cart, { signal }).then(() => undefined)

/** The server never answers a line write with `204`, so an empty body is a fault. */
const requireLine = (line: CartLine | undefined): CartLine => {
  if (!line) throw new Error('The cart did not return the updated line.')
  return line
}