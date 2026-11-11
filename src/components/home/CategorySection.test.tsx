import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CategorySection } from './CategorySection'
import { useCategories } from '@/features/catalogue/useCatalogue'
import { FeedbackProvider } from '@/context/FeedbackProvider'

// jsdom does not provide IntersectionObserver, which framer-motion's Reveal needs.
function MockIntersectionObserver(this: Record<string, unknown>) {
  this.observe = vi.fn()
  this.unobserve = vi.fn()
  this.disconnect = vi.fn()
}
;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver =
  MockIntersectionObserver

vi.mock('@/features/catalogue/useCatalogue', () => ({
  useCategories: vi.fn(),
}))

const useCategoriesMock = vi.mocked(useCategories)

const buildCategory = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-4111-111111111111',
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

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe('CategorySection', () => {
  it('renders nothing when there are no active categories', () => {
    useCategoriesMock.mockReturnValue({ data: [], isLoading: false, isRefreshing: false, error: undefined, refetch: vi.fn() })

    const { container } = render(
      <MemoryRouter>
        <FeedbackProvider>
          <CategorySection />
        </FeedbackProvider>
      </MemoryRouter>,
    )

    expect(container.querySelector('section')).toBeNull()
  })

  it('shows skeletons while loading', () => {
    useCategoriesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter>
        <FeedbackProvider>
          <CategorySection />
        </FeedbackProvider>
      </MemoryRouter>,
    )

    // Loading skeletons should be present
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders active categories with images and links to shop', async () => {
    const categories = [
      buildCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Shirts',
        slug: 'shirts',
        imageUrl: 'https://example.com/shirts.jpg',
        altText: 'Shirts category image',
      }),
      buildCategory({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Trousers',
        slug: 'trousers',
        imageUrl: null,
      }),
    ]
    useCategoriesMock.mockReturnValue({
      data: categories,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <FeedbackProvider>
          <CategorySection />
        </FeedbackProvider>
      </MemoryRouter>,
    )

    // Category names appear in both the fallback span and heading
    await waitFor(() => {
      expect(screen.getAllByText('Shirts').length).toBeGreaterThan(0)
    })
    await waitFor(() => {
      expect(screen.getAllByText('Trousers').length).toBeGreaterThan(0)
    })

    const shirtsLink = screen.getByRole('link', { name: /Shirts/ })
    expect(shirtsLink.getAttribute('href')).toBe('/shop?category=shirts')

    const trousersLinks = screen.getAllByRole('link', { name: /Trousers/ })
    expect(trousersLinks.length).toBeGreaterThan(0)
    expect(trousersLinks[0].getAttribute('href')).toBe('/shop?category=trousers')
  })

  it('shows fallback UI for categories without images', async () => {
    const categories = [
      buildCategory({
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Shirts',
        slug: 'shirts',
        imageUrl: null,
      }),
    ]
    useCategoriesMock.mockReturnValue({
      data: categories,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <FeedbackProvider>
          <CategorySection />
        </FeedbackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Shirts').length).toBeGreaterThan(0)
    })

    // Only the category card link (not the "Browse all" link)
    const categoryLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/shop?category=shirts')
    expect(categoryLinks).toHaveLength(1)
    expect(categoryLinks[0]).toBeTruthy()
  })

  it('shows "Browse all" link', async () => {
    const categories = [buildCategory()]
    useCategoriesMock.mockReturnValue({
      data: categories,
      isLoading: false,
      isRefreshing: false,
      error: undefined,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <FeedbackProvider>
          <CategorySection />
        </FeedbackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Browse all/ }).getAttribute('href')).toBe(
        '/shop',
      )
    })
  })
})
