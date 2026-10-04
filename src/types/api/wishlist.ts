import type { ISODateTime, MoneyString, UUID, VariantOption } from './common'

/**
 * `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:id`,
 * `DELETE /wishlist`.
 *
 * A saved product is joined live rather than snapshotted, so `priceRange` and
 * `inStock` always describe the catalogue as it is now. There is deliberately no
 * quantity and no subtotal: a wishlist records interest, not a basket.
 */

export interface WishlistImage {
  imageUrl: string
  altText: string | null
}

/** One *active* variant of a saved product. Inactive ones are filtered server-side. */
export interface WishlistVariant {
  id: UUID
  sku: string
  price: MoneyString
  /** Sellable stock, or `null` when the variant has no inventory row. */
  available: number | null
  options: VariantOption[]
}

export interface WishlistProduct {
  id: UUID
  name: string
  slug: string
  /** The catalogue's starting figure — not the amount a variant charges. */
  basePrice: MoneyString
  status: string
  isActive: boolean
  image: WishlistImage | null
  /** Cheapest and dearest active variant price; `null` when none are active. */
  priceRange: { min: MoneyString; max: MoneyString } | null
  /** True only when some active variant still has stock. */
  inStock: boolean
  variants: WishlistVariant[]
}

export interface WishlistItem {
  id: UUID
  wishlistId: UUID
  productId: UUID
  product: WishlistProduct
  createdAt: ISODateTime
}

export interface Wishlist {
  id: UUID
  userId: UUID
  items: WishlistItem[]
  itemCount: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface AddWishlistItemRequest {
  productId: UUID
}