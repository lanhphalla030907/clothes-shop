import { normalizeMoney, normalizeName, normalizeSlug } from './rules'
import type {
  Category,
  CategoryFormValues,
  CreateCategoryRequest,
  CreateInventoryRequest,
  CreateProductImageRequest,
  CreateVariantRequest,
  ImageMetadataFormValues,
  Inventory,
  ProductImage,
  ProductVariant,
  UpdateCategoryRequest,
  UpdateInventoryRequest,
  UpdateProductImageRequest,
  UpdateVariantRequest,
  UUID,
  VariantFormValues,
} from '@/types/api'

/**
 * Client-side mirrors of the nested catalogue DTOs.
 *
 * These are intentionally validation mirrors, not a second backend. They catch
 * the mistakes a form can see — a blank SKU, a negative count, an image file the
 * server will refuse — and leave every business rule (slug uniqueness, SKU
 * uniqueness, option-name uniqueness, stock reservation) to the service.
 */

/* -------------------------------- categories ------------------------------- */

export const CATEGORY_LIMITS = {
  name: 120,
  slug: 140,
  description: 1000,
} as const

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type CategoryErrors = Partial<Record<keyof CategoryFormValues, string>>

export const categoryToFormValues = (category: Category): CategoryFormValues => ({
  name: category.name,
  slug: category.slug,
  description: category.description ?? '',
  parentId: category.parentId ?? '',
  isActive: category.isActive,
})

/**
 * The category itself plus every category below it.
 *
 * Used to keep a parent selector from offering a cycle the server would refuse.
 * The server remains the authority; this only avoids asking it a question whose
 * answer is already known.
 */
export const categoryAndDescendantIds = (
  categoryId: UUID,
  categories: readonly Category[],
): Set<UUID> => {
  const ids = new Set<UUID>([categoryId])
  let changed = true

  while (changed) {
    changed = false
    for (const category of categories) {
      if (category.parentId !== null && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id)
        changed = true
      }
    }
  }

  return ids
}

export const validateCategory = (
  values: CategoryFormValues,
  categories: readonly Category[],
  editingId?: UUID,
): CategoryErrors => {
  const errors: CategoryErrors = {}
  const name = normalizeName(values.name)
  const slug = normalizeSlug(values.slug)
  const description = values.description.trim()

  if (name.length === 0) errors.name = 'A name is required'
  else if (name.length > CATEGORY_LIMITS.name) {
    errors.name = `A name must be ${CATEGORY_LIMITS.name} characters or fewer`
  }

  if (slug.length === 0) errors.slug = 'A slug is required'
  else if (slug.length > CATEGORY_LIMITS.slug) {
    errors.slug = `A slug must be ${CATEGORY_LIMITS.slug} characters or fewer`
  } else if (!CATEGORY_SLUG_PATTERN.test(slug)) {
    errors.slug = 'Slug must be lowercase alphanumeric words separated by single hyphens'
  }

  if (description.length > CATEGORY_LIMITS.description) {
    errors.description = `A description must be ${CATEGORY_LIMITS.description} characters or fewer`
  }

  if (values.parentId !== '') {
    if (!categories.some((category) => category.id === values.parentId)) {
      errors.parentId = 'Choose a known parent category'
    } else if (editingId !== undefined) {
      const forbidden = categoryAndDescendantIds(editingId, categories)
      if (forbidden.has(values.parentId)) {
        errors.parentId = 'A category cannot be its own parent or a descendant'
      }
    }
  }

  return errors
}

export const hasCategoryChanges = (
  values: CategoryFormValues,
  category: Category,
): boolean => {
  const description = values.description.trim() === '' ? null : values.description.trim()
  const parentId = values.parentId === '' ? null : values.parentId

  return (
    normalizeName(values.name) !== category.name ||
    normalizeSlug(values.slug) !== category.slug ||
    description !== category.description ||
    parentId !== category.parentId ||
    values.isActive !== category.isActive
  )
}

export const buildCreateCategoryRequest = (values: CategoryFormValues): CreateCategoryRequest => ({
  name: normalizeName(values.name),
  slug: normalizeSlug(values.slug),
  ...(values.description.trim() === '' ? {} : { description: values.description.trim() }),
  ...(values.parentId === '' ? {} : { parentId: values.parentId }),
  isActive: values.isActive,
})

export const buildUpdateCategoryRequest = (
  values: CategoryFormValues,
  category: Category,
): UpdateCategoryRequest => {
  const body: UpdateCategoryRequest = {}
  const name = normalizeName(values.name)
  const slug = normalizeSlug(values.slug)
  const description = values.description.trim() === '' ? null : values.description.trim()
  const parentId = values.parentId === '' ? null : values.parentId

  if (name !== category.name) body.name = name
  if (slug !== category.slug) body.slug = slug
  if (description !== category.description) body.description = description
  if (parentId !== category.parentId) body.parentId = parentId
  if (values.isActive !== category.isActive) body.isActive = values.isActive

  return body
}

/* --------------------------------- variants -------------------------------- */

export const VARIANT_LIMITS = {
  sku: 100,
} as const

const SKU_PATTERN = /^[A-Z0-9]+(?:[._-][A-Z0-9]+)*$/
const MONEY_PATTERN = /^\d{1,10}\.\d{2}$/

export type VariantErrors = Partial<Record<keyof VariantFormValues, string>>

export const normalizeSkuText = (value: string): string => value.trim().toUpperCase()

export const validateVariant = (values: VariantFormValues): VariantErrors => {
  const errors: VariantErrors = {}
  const sku = normalizeSkuText(values.sku)
  const price = normalizeMoney(values.price)

  if (sku.length === 0) errors.sku = 'A SKU is required'
  else if (sku.length > VARIANT_LIMITS.sku) {
    errors.sku = `A SKU must be ${VARIANT_LIMITS.sku} characters or fewer`
  } else if (!SKU_PATTERN.test(sku)) {
    errors.sku = 'SKU must be uppercase letters/numbers separated by ".", "_" or "-"'
  }

  if (values.price.trim() === '') errors.price = 'A price is required'
  else if (!MONEY_PATTERN.test(price)) {
    errors.price = 'Price must be a positive amount with at most 2 decimal places'
  } else if (price === '0.00') {
    errors.price = 'Price must be greater than 0'
  }

  return errors
}

export const variantToFormValues = (variant: ProductVariant): VariantFormValues => ({
  sku: variant.sku,
  price: variant.price,
  isActive: variant.isActive,
})

export const buildCreateVariantRequest = (values: VariantFormValues): CreateVariantRequest => ({
  sku: normalizeSkuText(values.sku),
  price: normalizeMoney(values.price),
  isActive: values.isActive,
})

export const buildUpdateVariantRequest = (
  values: VariantFormValues,
  variant: ProductVariant,
): UpdateVariantRequest => {
  const body: UpdateVariantRequest = {}
  const sku = normalizeSkuText(values.sku)
  const price = normalizeMoney(values.price)

  if (sku !== variant.sku) body.sku = sku
  if (price !== variant.price) body.price = price
  if (values.isActive !== variant.isActive) body.isActive = values.isActive

  return body
}

/* ------------------------------ variant options ----------------------------- */

export const OPTION_LIMITS = {
  name: 50,
  value: 100,
} as const

export type OptionErrors = Partial<Record<'optionName' | 'optionValue', string>>

export const validateOption = (optionName: string, optionValue: string): OptionErrors => {
  const errors: OptionErrors = {}
  const name = normalizeName(optionName)
  const value = normalizeName(optionValue)

  if (name.length === 0) errors.optionName = 'An option name is required'
  else if (name.length > OPTION_LIMITS.name) {
    errors.optionName = `An option name must be ${OPTION_LIMITS.name} characters or fewer`
  }

  if (value.length === 0) errors.optionValue = 'An option value is required'
  else if (value.length > OPTION_LIMITS.value) {
    errors.optionValue = `An option value must be ${OPTION_LIMITS.value} characters or fewer`
  }

  return errors
}

/* ---------------------------------- stock ---------------------------------- */

export interface InventoryFormValues {
  quantity: string
  reservedQuantity: string
}

export type InventoryErrors = Partial<Record<keyof InventoryFormValues, string>>

export const inventoryToFormValues = (inventory: Inventory): InventoryFormValues => ({
  quantity: String(inventory.quantity),
  reservedQuantity: String(inventory.reservedQuantity),
})

export const validateInventory = (values: InventoryFormValues): InventoryErrors => {
  const errors: InventoryErrors = {}
  const quantity = integerFrom(values.quantity)
  const reserved = integerFrom(values.reservedQuantity)

  if (quantity === null) errors.quantity = 'Quantity must be a whole number of zero or more'
  if (reserved === null) errors.reservedQuantity = 'Reserved must be a whole number of zero or more'
  if (quantity !== null && reserved !== null && reserved > quantity) {
    errors.reservedQuantity = 'Reserved cannot exceed the total quantity'
  }

  return errors
}

const integerFrom = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export const buildCreateInventoryRequest = (values: InventoryFormValues): CreateInventoryRequest => ({
  quantity: integerFrom(values.quantity) ?? 0,
  reservedQuantity: integerFrom(values.reservedQuantity) ?? 0,
})

export const buildUpdateInventoryRequest = (
  values: InventoryFormValues,
  inventory: Inventory,
): UpdateInventoryRequest => {
  const body: UpdateInventoryRequest = {}
  const quantity = integerFrom(values.quantity)
  const reserved = integerFrom(values.reservedQuantity)

  if (quantity !== null && quantity !== inventory.quantity) body.quantity = quantity
  if (reserved !== null && reserved !== inventory.reservedQuantity) {
    body.reservedQuantity = reserved
  }

  return body
}

/* --------------------------------- images --------------------------------- */

export const IMAGE_LIMITS = {
  url: 2048,
  publicId: 255,
  altText: 255,
  fileBytes: 5 * 1024 * 1024,
} as const

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const

export type ImageMetadataErrors = Partial<
  Record<keyof ImageMetadataFormValues, string>
>

export const imageToFormValues = (image: ProductImage): ImageMetadataFormValues => ({
  imageUrl: image.imageUrl,
  publicId: image.publicId,
  altText: image.altText ?? '',
  sortOrder: String(image.sortOrder),
  isPrimary: image.isPrimary,
})

const imageUrlError = (value: string): string | undefined => {
  if (value.trim().length === 0) return 'An image URL is required'
  if (value.trim().length > IMAGE_LIMITS.url) {
    return `An image URL must be ${IMAGE_LIMITS.url} characters or fewer`
  }

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Image URL must start with http:// or https://'
    }
  } catch {
    return 'Enter a complete image URL'
  }

  return undefined
}

export const validateImageMetadata = (
  values: ImageMetadataFormValues,
): ImageMetadataErrors => {
  const errors: ImageMetadataErrors = {}
  const urlError = imageUrlError(values.imageUrl)
  const publicId = values.publicId.trim()
  const altText = values.altText.trim()

  if (urlError !== undefined) errors.imageUrl = urlError

  if (publicId.length === 0) errors.publicId = 'A public id is required'
  else if (publicId.length > IMAGE_LIMITS.publicId) {
    errors.publicId = `A public id must be ${IMAGE_LIMITS.publicId} characters or fewer`
  }

  if (altText.length > IMAGE_LIMITS.altText) {
    errors.altText = `Alt text must be ${IMAGE_LIMITS.altText} characters or fewer`
  }

  if (integerFrom(values.sortOrder) === null) {
    errors.sortOrder = 'Sort order must be a whole number of zero or more'
  }

  return errors
}

export const hasImageMetadataChanges = (
  values: ImageMetadataFormValues,
  image: ProductImage,
): boolean =>
  values.imageUrl.trim() !== image.imageUrl ||
  values.publicId.trim() !== image.publicId ||
  values.altText.trim() !== (image.altText ?? '') ||
  values.sortOrder !== String(image.sortOrder) ||
  values.isPrimary !== image.isPrimary

export const buildCreateImageRequest = (
  productId: UUID,
  values: ImageMetadataFormValues,
): CreateProductImageRequest => ({
  productId,
  imageUrl: values.imageUrl.trim(),
  publicId: values.publicId.trim(),
  ...(values.altText.trim() === '' ? {} : { altText: values.altText.trim() }),
  sortOrder: integerFrom(values.sortOrder) ?? 0,
  isPrimary: values.isPrimary,
})

export const buildUpdateImageRequest = (
  values: ImageMetadataFormValues,
  image: ProductImage,
): UpdateProductImageRequest => {
  const body: UpdateProductImageRequest = {}
  const imageUrl = values.imageUrl.trim()
  const publicId = values.publicId.trim()
  const altText = values.altText.trim() === '' ? null : values.altText.trim()
  const sortOrder = integerFrom(values.sortOrder) ?? 0

  if (imageUrl !== image.imageUrl) body.imageUrl = imageUrl
  if (publicId !== image.publicId) body.publicId = publicId
  if (altText !== image.altText) body.altText = altText
  if (sortOrder !== image.sortOrder) body.sortOrder = sortOrder
  if (values.isPrimary !== image.isPrimary) body.isPrimary = values.isPrimary

  return body
}

export type ImageUploadErrors = Partial<
  Record<'file' | 'altText' | 'sortOrder', string>
>

export const validateImageUpload = (
  file: File | null,
  altText: string,
  sortOrder: string,
): ImageUploadErrors => {
  const errors: ImageUploadErrors = {}

  if (file === null) {
    errors.file = 'Choose an image to upload'
  } else if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    errors.file = 'Choose a JPEG, PNG, WebP, AVIF or GIF image'
  } else if (file.size > IMAGE_LIMITS.fileBytes) {
    errors.file = 'The image must be 5 MB or smaller'
  }

  if (altText.trim().length > IMAGE_LIMITS.altText) {
    errors.altText = `Alt text must be ${IMAGE_LIMITS.altText} characters or fewer`
  }

  if (integerFrom(sortOrder) === null) {
    errors.sortOrder = 'Sort order must be a whole number of zero or more'
  }

  return errors
}
