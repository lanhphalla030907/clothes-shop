import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProductCard } from './ProductCard'
import type { CataloguePiece } from '@/types'

// Mock IntersectionObserver for framer-motion in jsdom
function MockIntersectionObserver(this: Record<string, unknown>) {
  this.observe = vi.fn()
  this.unobserve = vi.fn()
  this.disconnect = vi.fn()
}
;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIntersectionObserver

// Mock wishlist and cart hooks to isolate ProductCard rendering
vi.mock('@/features/wishlist/useWishlistActions', () => ({
  useWishlistActions: () => ({
    add: vi.fn(),
    remove: vi.fn(),
    items: [],
    isSaved: () => false,
    isPendingProduct: () => false,
  }),
}))

vi.mock('@/features/cart/useCartActions', () => ({
  useCartActions: () => ({
    add: vi.fn().mockResolvedValue(true),
    isPendingVariant: () => false,
  }),
}))

afterEach(cleanup)

const basePiece: CataloguePiece = {
  id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
  slug: 'oversized-heavyweight-tee',
  name: 'Oversized Heavyweight Tee',
  category: 'T-Shirts',
  categorySlug: 't-shirts',
  categoryId: 'cat-1111-2222-3333-444455556666',
  price: '45.00',
  images: ['https://example.com/tee-front.jpg'],
  isAvailable: true,
}

describe('ProductCard component', () => {
  it('renders regular product with name, category, and standard price', () => {
    render(
      <MemoryRouter>
        <ProductCard piece={basePiece} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Oversized Heavyweight Tee')).toBeTruthy()
    expect(screen.getByText('T-Shirts')).toBeTruthy()
    expect(screen.getByText('$45.00')).toBeTruthy()
    expect(screen.queryByText(/Sold Out/i)).toBeNull()
    expect(screen.queryByText(/-\d+%/)).toBeNull()
  })

  it('renders discounted product with original price and discount badge', () => {
    const discountedPiece: CataloguePiece = {
      ...basePiece,
      price: '36.00',
      originalPrice: '45.00',
    }

    render(
      <MemoryRouter>
        <ProductCard piece={discountedPiece} />
      </MemoryRouter>,
    )

    // Current sale price
    expect(screen.getByText('$36.00')).toBeTruthy()
    // Strikethrough original price
    expect(screen.getByText('$45.00')).toBeTruthy()
    // 20% discount badge
    expect(screen.getByText('-20%')).toBeTruthy()
  })

  it('renders out-of-stock badge when isAvailable is false', () => {
    const outOfStockPiece: CataloguePiece = {
      ...basePiece,
      isAvailable: false,
    }

    render(
      <MemoryRouter>
        <ProductCard piece={outOfStockPiece} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Sold Out')).toBeTruthy()
  })

  it('renders secondary image when multiple images are provided', () => {
    const multiImagePiece: CataloguePiece = {
      ...basePiece,
      images: [
        'https://example.com/tee-front.jpg',
        'https://example.com/tee-back.jpg',
      ],
    }

    render(
      <MemoryRouter>
        <ProductCard piece={multiImagePiece} />
      </MemoryRouter>,
    )

    // Image alt text checks
    const primaryImg = screen.getByAltText('Oversized Heavyweight Tee')
    const secondaryImg = screen.getByAltText('Oversized Heavyweight Tee alternate view')

    expect(primaryImg).toBeTruthy()
    expect(secondaryImg).toBeTruthy()
    expect(screen.getByText('2 views')).toBeTruthy()
  })

  it('uses one fixed 4:5 image frame with cover behavior', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard piece={basePiece} />
      </MemoryRouter>,
    )

    const frame = container.querySelector('[class*="aspect-[4/5]"]')
    const image = screen.getByAltText(basePiece.name)

    expect(frame?.className).toContain('block')
    expect(frame?.className).toContain('aspect-[4/5]')
    expect(frame?.className).toContain('w-full')
    expect(frame?.className).toContain('shrink-0')
    expect(frame?.className).toContain('overflow-hidden')
    expect(image.className).toContain('object-cover')
    expect(image.className).toContain('object-center')
  })

  it('renders color swatches when variant colors are present', () => {
    const colorPiece = {
      ...basePiece,
      colors: [
        { name: 'Onyx Black', hex: '#000000' },
        { name: 'Vintage White', hex: '#f5f5f5' },
      ],
    } as unknown as CataloguePiece

    render(
      <MemoryRouter>
        <ProductCard piece={colorPiece} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('2 color variants')).toBeTruthy()
  })

  it('renders wishlist save button with accessible label', () => {
    render(
      <MemoryRouter>
        <ProductCard piece={basePiece} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('button', { name: /save oversized heavyweight tee to your wishlist/i }),
    ).toBeTruthy()
  })

  it('links correctly to the product details page', () => {
    render(
      <MemoryRouter>
        <ProductCard piece={basePiece} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /oversized heavyweight tee/i })
    expect(link.getAttribute('href')).toBe(`/product/${basePiece.id}`)
  })
})
