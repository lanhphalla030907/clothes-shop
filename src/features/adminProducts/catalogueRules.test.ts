import { describe, expect, it } from 'vitest'
import {
  buildCreateCategoryRequest,
  buildUpdateCategoryRequest,
  buildUpdateInventoryRequest,
  buildUpdateVariantRequest,
  categoryAndDescendantIds,
  validateCategory,
  validateImageMetadata,
  validateImageUpload,
  validateInventory,
  validateOption,
  validateVariant,
} from './catalogueRules'
import {
  EMPTY_CATEGORY_FORM,
  type Category,
  type Inventory,
  type ProductVariant,
} from '@/types/api'

const category = (overrides: Partial<Category> = {}): Category => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Shirts',
  slug: 'shirts',
  description: null,
  parentId: null,
  isActive: true,
  imageUrl: null,
  publicId: null,
  altText: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: '22222222-2222-4222-8222-222222222222',
  productId: '33333333-3333-4333-8333-333333333333',
  sku: 'TEE-BLK-M',
  price: '19.00',
  isActive: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const inventory = (overrides: Partial<Inventory> = {}): Inventory => ({
  id: '44444444-4444-4444-8444-444444444444',
  variantId: '22222222-2222-4222-8222-222222222222',
  quantity: 10,
  reservedQuantity: 2,
  available: 8,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

describe('category rules', () => {
  it('collects a category and every descendant', () => {
    const root = category({ id: 'root' })
    const child = category({ id: 'child', parentId: 'root' })
    const grandchild = category({ id: 'grandchild', parentId: 'child' })
    const unrelated = category({ id: 'other' })

    expect(categoryAndDescendantIds('root', [root, child, grandchild, unrelated])).toEqual(
      new Set(['root', 'child', 'grandchild']),
    )
  })

  it('rejects a descendant as the parent', () => {
    const root = category({ id: 'root' })
    const child = category({ id: 'child', parentId: 'root' })

    const errors = validateCategory(
      { ...EMPTY_CATEGORY_FORM, name: 'Root', slug: 'root', parentId: 'child' },
      [root, child],
      'root',
    )

    expect(errors.parentId).toContain('descendant')
  })

  it('normalises name and slug, and omits empty optional fields', () => {
    expect(
      buildCreateCategoryRequest({
        name: '  Outer   Wear ',
        slug: ' Outer-Wear ',
        description: '  ',
        parentId: '',
        isActive: true,
      }),
    ).toEqual({ name: 'Outer Wear', slug: 'outer-wear', isActive: true })
  })

  it('sends only changed category fields and clears description explicitly', () => {
    const current = category({ description: 'Old copy', parentId: null })
    const body = buildUpdateCategoryRequest(
      {
        name: current.name,
        slug: current.slug,
        description: '',
        parentId: '',
        isActive: current.isActive,
      },
      current,
    )

    expect(body).toEqual({ description: null })
  })
})

describe('variant rules', () => {
  it('accepts a SKU and price the server will normalise', () => {
    expect(validateVariant({ sku: ' tee-blk-m ', price: '19.9', isActive: true })).toEqual({})
  })

  it('rejects a zero price and a malformed SKU', () => {
    const errors = validateVariant({ sku: 'TEE BLK', price: '0', isActive: true })

    expect(errors.sku).toBeDefined()
    expect(errors.price).toContain('greater than 0')
  })

  it('sends only changed variant fields', () => {
    const current = variant()
    expect(
      buildUpdateVariantRequest(
        { sku: current.sku, price: current.price, isActive: false },
        current,
      ),
    ).toEqual({ isActive: false })
  })

  it('validates option names and values', () => {
    expect(validateOption('Size', 'Medium')).toEqual({})
    expect(validateOption('   ', '')).toEqual({
      optionName: 'An option name is required',
      optionValue: 'An option value is required',
    })
  })
})

describe('inventory rules', () => {
  it('accepts whole non-negative counters and rejects reserved above quantity', () => {
    expect(validateInventory({ quantity: '10', reservedQuantity: '2' })).toEqual({})
    expect(validateInventory({ quantity: '2', reservedQuantity: '3' }).reservedQuantity).toContain(
      'cannot exceed',
    )
    expect(validateInventory({ quantity: '1.5', reservedQuantity: '0' }).quantity).toBeDefined()
  })

  it('sends only the counter that changed', () => {
    const current = inventory()
    expect(buildUpdateInventoryRequest({ quantity: '12', reservedQuantity: '2' }, current)).toEqual({
      quantity: 12,
    })
  })
})

describe('image rules', () => {
  it('accepts an allowed image file', () => {
    const file = new File(['x'], 'shirt.png', { type: 'image/png' })
    expect(validateImageUpload(file, 'A shirt', '0')).toEqual({})
  })

  it('rejects an unsupported file and a non-http URL', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    expect(validateImageUpload(file, '', '0').file).toBeDefined()

    expect(
      validateImageMetadata({
        imageUrl: 'ftp://example.com/image.jpg',
        publicId: 'products/image',
        altText: '',
        sortOrder: '0',
        isPrimary: false,
      }).imageUrl,
    ).toContain('http')
  })
})
