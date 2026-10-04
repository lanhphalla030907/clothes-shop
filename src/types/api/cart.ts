import type { ISODateTime, MoneyString, UUID, VariantOption } from './common'

/**
 * `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:id`, `DELETE`.
 *
 * Every amount arrives as a string and every line already carries its product
 * and variant. The frontend therefore never has to join the catalogue to draw a
 * cart, and never computes a price: `lineTotal` is the figure the server
 * computed, and `exceedsAvailable` is the server's stock verdict.
 */

/** Catalogue facts about the variant a line was bought from. */
export interface CartLineVariant {
  id: UUID
  sku: string
  price: MoneyString
  isActive: boolean
  options: VariantOption[]
}

/** Catalogue facts about the product the line's variant belongs to. */
export interface CartLineProduct {
  id: UUID
  name: string
  slug: string
  basePrice: MoneyString
  status: string
  isActive: boolean
}

export interface CartLine {
  id: UUID
  cartId: UUID
  variantId: UUID
  quantity: number
  /**
   * Current sellable stock, or `null` when the variant has no inventory row.
   * `null` and `0` are different facts: not-stocked versus sold-out.
   */
  available: number | null
  /** True when this line cannot currently be fulfilled as it stands. */
  exceedsAvailable: boolean
  unitPrice: MoneyString
  /** `unitPrice × quantity`, computed server-side. */
  lineTotal: MoneyString
  variant: CartLineVariant
  product: CartLineProduct
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Cart {
  id: UUID
  userId: UUID
  items: CartLine[]
  /** Sum of every line's `quantity`. */
  itemCount: number
  /**
   * Sum of every line's `lineTotal`. A *cart* subtotal only — the server applies
   * no shipping, tax or discount to a cart, so there is no authoritative
   * "total" until checkout has priced the order.
   */
  subtotal: MoneyString
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface AddCartLineRequest {
  variantId: UUID
  /** Positive integer. An *increment* when the variant is already in the cart. */
  quantity: number
}

export interface UpdateCartLineRequest {
  /** Absolute quantity, not a delta. A line at zero is expressed by deleting. */
  quantity: number
}