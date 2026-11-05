import { cleanup, render, screen } from '@testing-library/react'
import type { HTMLAttributes, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductDetails from './ProductDetails'
import type { CatalogueDetail } from '@/types'

const { useProductDetail } = vi.hoisted(() => ({
  useProductDetail: vi.fn(),
}))

vi.mock('framer-motion', async () => {
  const React = await import('react')
  const MotionDiv = ({
    children,
    ...props
  }: HTMLAttributes<HTMLDivElement> & {
    initial?: unknown
    animate?: unknown
    exit?: unknown
    transition?: unknown
    whileInView?: unknown
  }) => {
    const domProps = { ...props }
    delete domProps.initial
    delete domProps.animate
    delete domProps.exit
    delete domProps.transition
    delete domProps.whileInView
    return React.createElement('div', domProps, children)
  }

  return {
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: { div: MotionDiv },
  }
})

vi.mock('@/features/catalogue/useCatalogue', () => ({
  useProductDetail,
  useRelatedPieces: () => ({ data: [] }),
}))

vi.mock('@/features/productAttributes/api', () => ({
  fetchProductAttributes: vi.fn(),
}))

vi.mock('@/hooks/useAsyncResource', () => ({
  useAsyncResource: () => ({
    isLoading: false,
    error: undefined,
    data: [],
  }),
}))

vi.mock('@/features/cart/useCartActions', () => ({
  useCartActions: () => ({
    add: vi.fn(),
    isPendingVariant: () => false,
    actionError: undefined,
  }),
}))

vi.mock('@/components/product/ProductCard', () => ({
  ProductCard: () => null,
}))

vi.mock('@/components/product/SaveToWishlist', () => ({
  SaveToWishlist: () => null,
}))

vi.mock('@/components/product/ProductStates', () => ({
  Plate: () => null,
  ProductDetailSkeleton: () => null,
  ProductNotice: () => null,
}))

vi.mock('@/components/ui/Reveal', () => ({
  Reveal: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/components/ui/SmartImage', () => ({
  SmartImage: () => null,
}))

afterEach(cleanup)

const detail = (available: number | null): CatalogueDetail => ({
  id: 'a1b2c3d4-e5f6-4f70-8a9b-0c1d2e3f4a5b',
  slug: 'classic-t-shirt',
  name: 'Classic T-Shirt',
  category: 'Tops',
  categorySlug: 'tops',
  categoryId: 'b2c3d4e5-f6a0-4a1b-9c2d-3e4f5a6b7c8d',
  price: '29.00',
  images: [],
  isAvailable: true,
  description: null,
  status: 'ACTIVE',
  variants: [
    {
      id: 'c3d4e5f6-a7b8-4c2d-8e3f-4a5b6c7d8e9f',
      productId: 'a1b2c3d4-e5f6-4f70-8a9b-0c1d2e3f4a5b',
      sku: 'TEE-BLK-M',
      price: '29.00',
      isActive: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      options: [{ optionName: 'Size', optionValue: 'M' }],
      available,
    },
  ],
  axes: [
    {
      name: 'Size',
      values: [{ value: 'M', hex: undefined, isAvailable: available !== 0 }],
    },
  ],
})

const renderDetail = (stock: number | null) => {
  useProductDetail.mockReturnValue({
    isLoading: false,
    error: undefined,
    data: detail(stock),
  })

  return render(
    <MemoryRouter initialEntries={['/products/classic-t-shirt']}>
      <Routes>
        <Route path="/products/:id" element={<ProductDetails />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProductDetails availability', () => {
  beforeEach(() => {
    useProductDetail.mockReset()
  })

  it('disables Add to Bag and labels a variant without inventory unavailable', () => {
    renderDetail(null)

    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: 'Unavailable' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('preserves sold-out behavior for zero available stock', () => {
    renderDetail(0)

    expect(screen.getByText('Sold out')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Unavailable' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('allows Add to Bag when an active variant has available stock', () => {
    renderDetail(3)

    expect(screen.getByText('Only 3 left')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Add to bag' }).hasAttribute('disabled'),
    ).toBe(false)
  })
})
