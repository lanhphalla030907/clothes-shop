import type {
  Category,
  Product,
  ProductField,
  ProductFormValues,
  ProductStatus,
  UpdateProductRequest,
} from '@/types/api'

/**
 * Product form rules, mirroring `CreateProductDto` / `AdminUpdateProductDto`.
 *
 * A mirror, not the source of truth: the server trims and normalises *before*
 * it validates, and runs `forbidNonWhitelisted`, so whatever this file accepts
 * can still be refused. Its job is just that an administrator is told about a
 * too-long name while typing, rather than by the API after pressing Save.
 */

/** Mirrors the `products` column widths. */
export const PRODUCT_LIMITS = {
  name: 200,
  slug: 220,
  description: 5000,
} as const

/** Mirrors the server's slug rule, checked after lowercasing. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MONEY_PATTERN = /^\d{1,10}\.\d{2}$/
const DECIMAL_INPUT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/

export const normalizeName = (value: string): string => value.trim().replace(/\s+/g, ' ')

export const normalizeSlug = (value: string): string => value.trim().toLowerCase()

/** Canonicalises `"19"` / `"19.9"` / `19.99` → `"19.00"` / `"19.90"` / `"19.99"`. */
export const normalizeMoney = (value: string): string => {
  const match = DECIMAL_INPUT_PATTERN.exec(value.trim())
  if (match === null) return value
  return `${match[1]}.${(match[2] ?? '').padEnd(2, '0')}`
}

export const PRODUCT_STATUS_OPTIONS: readonly ProductStatus[] = ['DRAFT', 'ACTIVE', 'ARCHIVED']

export type ProductErrors = Partial<Record<ProductField, string>>

export const validateProduct = (
  values: ProductFormValues,
  categories: readonly Category[],
): ProductErrors => {
  const errors: ProductErrors = {}

  const assign = (field: ProductField, message: string | undefined) => {
    if (message) errors[field] = message
  }

  assign('name', requiredLength(normalizeName(values.name), 'A name', PRODUCT_LIMITS.name))
  assign('slug', slugError(values.slug))
  assign('description', optionalLength(values.description.trim(), 'A description', PRODUCT_LIMITS.description))
  assign('categoryId', categoryError(values.categoryId, categories))
  assign('basePrice', priceError(values.basePrice))

  return errors
}

const requiredLength = (value: string, label: string, max: number): string | undefined => {
  if (value.length === 0) return `${label} is required`
  if (value.length > max) return `${label} must be ${max} characters or fewer`
  return undefined
}

const optionalLength = (value: string, label: string, max: number): string | undefined => {
  if (value.length === 0) return undefined
  if (value.length > max) return `${label} must be ${max} characters or fewer`
  return undefined
}

const slugError = (value: string): string | undefined => {
  const normalized = normalizeSlug(value)
  if (normalized.length === 0) return 'A slug is required'
  if (normalized.length > PRODUCT_LIMITS.slug) {
    return `A slug must be ${PRODUCT_LIMITS.slug} characters or fewer`
  }
  if (!SLUG_PATTERN.test(normalized)) {
    return 'Slug must be lowercase alphanumeric words separated by single hyphens'
  }
  return undefined
}

const categoryError = (value: string, categories: readonly Category[]): string | undefined => {
  if (value === '') return 'Choose a category'
  if (categories.length > 0 && !categories.some((category) => category.id === value)) {
    return 'Choose a known category'
  }
  return undefined
}

const priceError = (value: string): string | undefined => {
  if (value.trim() === '') return 'A price is required'
  const normalized = normalizeMoney(value)
  if (!MONEY_PATTERN.test(normalized)) {
    return 'Price must be a positive amount with at most 2 decimal places'
  }
  if (normalized === '0.00') return 'Price must be greater than 0'
  return undefined
}

/**
 * Whether an editable form differs from the stored record.
 *
 * Values are canonicalised before comparison so nothing counts as "changed"
 * purely because of normalisation (typing `129` in a field the server stores as
 * `129.00`). The stored record is the baseline.
 */
export const hasProductChanges = (values: ProductFormValues, product: Product): boolean => {
  const description = values.description.trim() === '' ? null : values.description

  return (
    normalizeName(values.name) !== product.name ||
    normalizeSlug(values.slug) !== product.slug ||
    description !== product.description ||
    normalizeMoney(values.basePrice) !== product.basePrice ||
    values.categoryId !== product.categoryId ||
    values.status !== product.status ||
    values.isActive !== product.isActive
  )
}

/**
 * The partial PATCH body, containing only the fields that actually changed.
 *
 * The backend treats an omitted field as untouched, so sending everything would
 * write value-for-value; sending only the diff keeps `updatedAt` honest and
 * avoids touching columns the admin never meant to change. `description` is the
 * one field where `null` is meaningful (clear it), so a blank box that began as
 * blank is left out, not sent as a no-op.
 */
export const buildUpdateProductRequest = (
  values: ProductFormValues,
  product: Product,
): UpdateProductRequest => {
  const body: UpdateProductRequest = {}

  const name = normalizeName(values.name)
  if (name !== product.name) body.name = name

  const slug = normalizeSlug(values.slug)
  if (slug !== product.slug) body.slug = slug

  const description = values.description.trim() === '' ? null : values.description
  if (description !== product.description) body.description = description

  const basePrice = normalizeMoney(values.basePrice)
  if (basePrice !== product.basePrice) body.basePrice = basePrice

  if (values.categoryId !== product.categoryId) body.categoryId = values.categoryId
  if (values.status !== product.status) body.status = values.status
  if (values.isActive !== product.isActive) body.isActive = values.isActive

  return body
}