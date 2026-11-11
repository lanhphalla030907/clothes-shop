import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ProductsPage from './ProductsPage'
import Shop from './Shop'

// Mock the public products hook
const mockUsePublicProducts = vi.fn()

vi.mock('@/features/catalogue/usePublicProducts', () => ({
  usePublicProducts: (params: unknown) => mockUsePublicProducts(params),
}))

// Mock Marquee and ProductCard to keep test lightweight
vi.mock('@/components/home/Marquee', () => ({
  Marquee: () => <div data-testid="marquee" />,
}))

vi.mock('@/components/product/ProductCard', () => ({
  ProductCard: ({ piece }: { piece: { name: string; price: number } }) => (
    <div data-testid="product-card">
      <span>{piece.name}</span>
      <span>${piece.price}</span>
    </div>
  ),
}))

const sampleFilterOptions = {
  categories: [
    { id: 'cat-1', name: 'Shirts', slug: 'shirts', count: 5 },
    { id: 'cat-2', name: 'Trousers', slug: 'trousers', count: 3 },
  ],
  priceRange: { min: 50, max: 250 },
  sizes: ['S', 'M', 'L'],
  colors: ['Black', 'White', 'Navy'],
}

const samplePieces = [
  {
    id: 'prod-1',
    name: 'Archival Wool Coat',
    category: 'Outerwear',
    price: 240,
    images: ['/img1.jpg'],
    isAvailable: true,
  },
  {
    id: 'prod-2',
    name: 'Raw Denim Trouser',
    category: 'Trousers',
    price: 130,
    images: ['/img2.jpg'],
    isAvailable: true,
  },
]

describe('Public All Products Page & Routing (/shop and /products)', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePublicProducts.mockReturnValue({
      pieces: samplePieces,
      total: 2,
      page: 1,
      limit: 12,
      totalPages: 1,
      filterOptions: sampleFilterOptions,
      isLoading: false,
      isFetching: false,
      error: undefined,
      refetch: vi.fn(),
    })
  })

  it('renders ProductsPage with filters, search, and product cards', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route path="/products" element={<ProductsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: /all products/i })).toBeDefined()
    expect(screen.getByPlaceholderText(/search piece, color, cut/i)).toBeDefined()
    expect(screen.getByText('Archival Wool Coat')).toBeDefined()
    expect(screen.getByText('Raw Denim Trouser')).toBeDefined()
  })

  it('Shop.tsx re-exports ProductsPage and provides the identical filtering experience at /shop', () => {
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <Routes>
          <Route path="/shop" element={<Shop />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: /all products/i })).toBeDefined()
    expect(screen.getByPlaceholderText(/search piece, color, cut/i)).toBeDefined()
    expect(screen.getByText('Shirts')).toBeDefined()
    expect(screen.getByText('Trousers')).toBeDefined()
  })

  it('passes search parameters from URL into usePublicProducts', () => {
    render(
      <MemoryRouter initialEntries={['/shop?category=trousers&sortBy=price_asc&minPrice=100']}>
        <Routes>
          <Route path="/shop" element={<Shop />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(mockUsePublicProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'trousers',
        sortBy: 'price_asc',
        minPrice: 100,
      }),
    )
  })

  it('opens the mobile filter drawer when clicking the mobile filters button', () => {
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <Routes>
          <Route path="/shop" element={<Shop />} />
        </Routes>
      </MemoryRouter>,
    )

    const mobileFiltersButton = screen.getByTestId('mobile-filters-trigger')
    fireEvent.click(mobileFiltersButton)

    // Check that mobile filter drawer panel is rendered
    expect(screen.getByRole('dialog', { name: /product filters/i })).toBeDefined()
  })
})
