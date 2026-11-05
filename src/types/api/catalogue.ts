import type { ISODateTime, MoneyString, UUID, VariantOption } from './common'
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export interface Category {
  id: UUID
  name: string
  slug: string
  description: string | null
  parentId: UUID | null
  isActive: boolean
  imageUrl: string | null
  publicId: string | null
  altText: string | null
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

/** `GET /products/:productId/attributes` and its product-scoped write routes. */
export interface ProductAttribute {
  id: UUID
  productId: UUID
  attributeName: string
  attributeValue: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface CreateProductAttributeRequest {
  attributeName: string
  attributeValue: string
}

export type UpdateProductAttributeRequest = Partial<CreateProductAttributeRequest>

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

export interface CatalogueVariant extends ProductVariant {
  options: VariantOption[]
  available: number | null
}
