import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { CollectionsSection } from './CollectionsSection'
import { useCollections } from '@/features/collections/useCollections'
import type { AsyncResource } from '@/hooks/useAsyncResource'
import type { Collection } from '@/types/api'

class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = MockIntersectionObserver

vi.mock('@/features/collections/useCollections', () => ({ useCollections: vi.fn() }))
const useCollectionsMock = vi.mocked(useCollections)

const resource = (data: Collection[] | undefined, isLoading = false): AsyncResource<Collection[]> => ({
  data, isLoading, isRefreshing: false, error: undefined, refetch: vi.fn(),
})

const collection = (overrides: Partial<Collection> = {}): Collection => ({
  id: '11111111-1111-4111-8111-111111111111', title: 'Outerwear', slug: 'outerwear', description: 'Layered essentials', coverImage: 'https://example.com/outerwear.jpg', isActive: true, displayOrder: 0, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', ...overrides,
})

afterEach(cleanup)

describe('CollectionsSection', () => {
  it('stays hidden when the public feed is empty', () => {
    useCollectionsMock.mockReturnValue(resource([]))
    const { container } = render(<MemoryRouter><CollectionsSection /></MemoryRouter>)
    expect(container.querySelector('section')).toBeNull()
  })

  it('uses the public three-collection limit and links to the collection slug', () => {
    useCollectionsMock.mockReturnValue(resource([collection()]))
    render(<MemoryRouter><CollectionsSection /></MemoryRouter>)
    expect(useCollectionsMock).toHaveBeenCalledWith(3)
    expect(screen.getByRole('link', { name: /explore collection/i }).getAttribute('href')).toBe('/collections/outerwear')
    expect(screen.getByAltText('Outerwear').getAttribute('src')).toBe('https://example.com/outerwear.jpg')
  })
})
