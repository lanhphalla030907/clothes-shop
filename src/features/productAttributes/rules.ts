import { normalizeName } from '@/features/adminProducts/rules'
import type {
  CreateProductAttributeRequest,
  ProductAttribute,
  UpdateProductAttributeRequest,
} from '@/types/api'

export const PRODUCT_ATTRIBUTE_LIMITS = {
  attributeName: 50,
  attributeValue: 255,
} as const

export interface ProductAttributeFormValues {
  attributeName: string
  attributeValue: string
}

export type ProductAttributeErrors =
  Partial<Record<keyof ProductAttributeFormValues, string>>

export const validateProductAttribute = (
  values: ProductAttributeFormValues,
  attributes: readonly ProductAttribute[],
  editingId?: string,
): ProductAttributeErrors => {
  const errors: ProductAttributeErrors = {}
  const attributeName = normalizeName(values.attributeName)
  const attributeValue = normalizeName(values.attributeValue)

  if (attributeName.length === 0) errors.attributeName = 'An attribute name is required'
  else if (attributeName.length > PRODUCT_ATTRIBUTE_LIMITS.attributeName) {
    errors.attributeName = `An attribute name must be ${PRODUCT_ATTRIBUTE_LIMITS.attributeName} characters or fewer`
  } else if (
    attributes.some(
      (attribute) =>
        attribute.id !== editingId &&
        normalizeName(attribute.attributeName).toLowerCase() === attributeName.toLowerCase(),
    )
  ) {
    errors.attributeName = 'An attribute with this name already exists for this product'
  }

  if (attributeValue.length === 0) errors.attributeValue = 'An attribute value is required'
  else if (attributeValue.length > PRODUCT_ATTRIBUTE_LIMITS.attributeValue) {
    errors.attributeValue = `An attribute value must be ${PRODUCT_ATTRIBUTE_LIMITS.attributeValue} characters or fewer`
  }

  return errors
}

export const buildCreateProductAttributeRequest = (
  values: ProductAttributeFormValues,
): CreateProductAttributeRequest => ({
  attributeName: normalizeName(values.attributeName),
  attributeValue: normalizeName(values.attributeValue),
})

export const buildUpdateProductAttributeRequest = (
  values: ProductAttributeFormValues,
  attribute: ProductAttribute,
): UpdateProductAttributeRequest => {
  const body: UpdateProductAttributeRequest = {}
  const attributeName = normalizeName(values.attributeName)
  const attributeValue = normalizeName(values.attributeValue)

  if (attributeName !== attribute.attributeName) body.attributeName = attributeName
  if (attributeValue !== attribute.attributeValue) body.attributeValue = attributeValue

  return body
}
