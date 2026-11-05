import { describe, expect, it } from 'vitest'
import { isBuyable } from './present'
import type { CatalogueVariant } from '@/types/api'

const buildVariant = (
  overrides: Partial<CatalogueVariant> = {},
): CatalogueVariant => ({
  id: 'a1b2c3d4-e5f6-4f70-8a9b-0c1d2e3f4a5b',
  productId: 'b2c3d4e5-f6a0-4a1b-9c2d-3e4f5a6b7c8d',
  sku: 'TEE-BLK-M',
  price: '29.00',
  isActive: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  options: [{ optionName: 'Size', optionValue: 'M' }],
  available: 2,
  ...overrides,
})

describe('isBuyable', () => {
  it('accepts active variants with positive available stock', () => {
    expect(isBuyable(buildVariant({ available: 1 }))).toBe(true)
  })

  it('rejects variants with no inventory record', () => {
    expect(isBuyable(buildVariant({ available: null }))).toBe(false)
  })

  it('rejects variants with zero available stock', () => {
    expect(isBuyable(buildVariant({ available: 0 }))).toBe(false)
  })

  it('rejects inactive variants even when stock is available', () => {
    expect(isBuyable(buildVariant({ isActive: false, available: 4 }))).toBe(
      false,
    )
  })
})
