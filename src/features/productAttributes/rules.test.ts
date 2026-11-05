import { describe, expect, it } from 'vitest'
import type { ProductAttribute } from '@/types/api'
import {
  buildCreateProductAttributeRequest,
  buildUpdateProductAttributeRequest,
  PRODUCT_ATTRIBUTE_LIMITS,
  validateProductAttribute,
} from './rules'

const attribute: ProductAttribute = {
  id: '22222222-2222-4222-8222-222222222222',
  productId: '11111111-1111-4111-8111-111111111111',
  attributeName: 'Material',
  attributeValue: 'Cotton',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

describe('product attribute rules', () => {
  it('requires both fields and enforces the database limits', () => {
    expect(
      validateProductAttribute(
        { attributeName: ' ', attributeValue: '' },
        [],
      ),
    ).toEqual({
      attributeName: 'An attribute name is required',
      attributeValue: 'An attribute value is required',
    })
    expect(
      validateProductAttribute(
        {
          attributeName: 'x'.repeat(PRODUCT_ATTRIBUTE_LIMITS.attributeName + 1),
          attributeValue: 'x'.repeat(PRODUCT_ATTRIBUTE_LIMITS.attributeValue + 1),
        },
        [],
      ),
    ).toEqual({
      attributeName: 'An attribute name must be 50 characters or fewer',
      attributeValue: 'An attribute value must be 255 characters or fewer',
    })
  })

  it('rejects case-insensitive duplicates but allows the current row on edit', () => {
    expect(
      validateProductAttribute(
        { attributeName: 'material', attributeValue: 'Linen' },
        [attribute],
      ).attributeName,
    ).toBe('An attribute with this name already exists for this product')
    expect(
      validateProductAttribute(
        { attributeName: 'MATERIAL', attributeValue: 'Cotton' },
        [attribute],
        attribute.id,
      ),
    ).toEqual({})
  })

  it('normalizes whitespace without changing stored capitalization or assigning ownership', () => {
    expect(
      buildCreateProductAttributeRequest({
        attributeName: '  Country   of Origin ',
        attributeValue: '  Cambodia  ',
      }),
    ).toEqual({
      attributeName: 'Country of Origin',
      attributeValue: 'Cambodia',
    })
    expect(
      buildUpdateProductAttributeRequest(
        { attributeName: 'Material', attributeValue: '  Organic   Cotton ' },
        attribute,
      ),
    ).toEqual({ attributeValue: 'Organic Cotton' })
  })
})
