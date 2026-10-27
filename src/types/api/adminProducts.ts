import type { Category, Product, ProductStatus } from './catalogue'
import type { MoneyString, UUID } from './common'
import { normalizeMoney, normalizeName, normalizeSlug } from '@/features/adminProducts/rules'

/**
 * Product management wire contracts.
 *
 * Everything maps onto the Phase 16 admin catalogue endpoints. The read models
 * (`Product`, `Category`) already exist: they are the same records the
 * storefront gets, only served to an ADMIN. What this module adds are the write
 * bodies, the list query and the editable form shape.
 *
 * `status` and `isActive` stay two separate facts everywhere, exactly as the
 * backend keeps two separate columns — the form never collapses them.
 */

/** The four narrowing questions `GET /admin/products` answers. AND-combined. */
export type AdminProductQuery = {
  /** Case-insensitive substring over `name` OR `slug`. */
  search?: string
  status?: ProductStatus
  isActive?: boolean
  categoryId?: UUID
}

/** `POST /admin/products` — all fields are submitted on create. */
export interface CreateProductRequest {
  name: string
  slug: string
  description: string | null
  basePrice: MoneyString
  categoryId: UUID
  status: ProductStatus
  isActive: boolean
}

/**
 * `PATCH /admin/products/:id`.
 *
 * Every field optional; an omitted field is left untouched by the service, so
 * edit only ever sends the fields that actually changed (see
 * `buildUpdateProductRequest` in the feature rules).
 */
export type UpdateProductRequest = Partial<CreateProductRequest>

/** A form's editable state. Blank optionals are `''` until submission. */
export interface ProductFormValues {
  name: string
  slug: string
  description: string
  basePrice: string
  categoryId: string
  status: ProductStatus
  isActive: boolean
}

export type ProductField = keyof ProductFormValues

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  name: '',
  slug: '',
  description: '',
  basePrice: '',
  categoryId: '',
  status: 'DRAFT',
  isActive: true,
}

/** Maps a stored product back into editable form values. */
export const productToFormValues = (product: Product): ProductFormValues => ({
  name: product.name,
  slug: product.slug,
  description: product.description ?? '',
  basePrice: product.basePrice,
  categoryId: product.categoryId,
  status: product.status,
  isActive: product.isActive,
})

/**
 * Turns form values into a create body, canonicalising each field the way the
 * server does before it validates (trim + collapse, lowercase slug, two-decimal
 * money) so the form and the stored row agree on one spelling.
 */
export const productFormValuesToRequest = (values: ProductFormValues): CreateProductRequest => ({
  name: normalizeName(values.name),
  slug: normalizeSlug(values.slug),
  description: values.description.trim() === '' ? null : values.description,
  basePrice: normalizeMoney(values.basePrice),
  categoryId: values.categoryId,
  status: values.status,
  isActive: values.isActive,
})

export type { Category, Product }