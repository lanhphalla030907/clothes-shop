import type { ISODateTime, MoneyString, UUID, VariantOption } from './common'

/**
 * The catalogue reads: `GET /categories`, `GET /products`, `GET /products/:id`,
 * and the three sub-collections hung off a product.
 *
 * Nothing here is joined for us. A product arrives without its images, variants
 * or stock, so a screen that needs all three has to read all three — which is why
 * the mapping from these records to something drawable lives in one place
 * (`features/catalogue`) rather than being re-derived per component.
 */

/** `products.status` is a free-form column, narrowed to its three known values. */
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

export interface Category {
  id: UUID
  name: string
  slug: string
  description: string | null
  parentId: UUID | null
  isActive: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Product {
  id: UUID
  categoryId: UUID
  name: string
  slug: string
  description: string | null
  /** The catalogue's starting figure — not the amount a variant charges. */
  basePrice: MoneyString
  status: ProductStatus
  isActive: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ProductImage {
  id: UUID
  productId: UUID
  imageUrl: string
  publicId: string
  altText: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** `GET /products/:productId/variants/:variantId/options`. */
export interface VariantOptionRecord {
  id: UUID
  variantId: UUID
  optionName: string
  optionValue: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ProductVariant {
  id: UUID
  productId: UUID
  sku: string
  price: MoneyString
  isActive: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Inventory {
  id: UUID
  variantId: UUID
  quantity: number
  reservedQuantity: number
  /** `quantity - reservedQuantity`, computed by the server. */
  available: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/**
 * A variant joined with the two things stored beside it.
 *
 * Neither is part of the variant row, so a screen that draws a size picker has to
 * read both sub-collections per variant. They are composed here — once — rather
 * than in every screen that needs a buyable product.
 */
export interface CatalogueVariant extends ProductVariant {
  options: VariantOption[]
  /**
   * Sellable stock, or `null` when the variant has no inventory row.
   *
   * `null` and `0` are different facts: not-stocked versus sold-out. Neither is
   * the last word — the cart endpoint re-checks stock when the line is written.
   */
  available: number | null
}

