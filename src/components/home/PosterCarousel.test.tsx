import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PosterCarousel } from './PosterCarousel'
import { useActivePosters } from '@/features/posters/usePosters'
import type { Poster } from '@/types/api'
import type { AsyncResource } from '@/hooks/useAsyncResource'

// jsdom does not provide IntersectionObserver, which framer-motion's Reveal needs.
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver =
  MockIntersectionObserver

vi.mock('@/features/posters/usePosters', () => ({
  useActivePosters: vi.fn(),
}))

const useActivePostersMock = vi.mocked(useActivePosters)

const poster = (overrides: Partial<Poster> = {}): Poster => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Spring campaign',
  imageUrl: 'https://example.com/spring.jpg',
  publicId: 'posters/spring',
  isActive: true,
  displayOrder: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const resource = (
  data: Poster[] | undefined,
  isLoading = false,
): AsyncResource<Poster[]> => ({
  data,
  error: undefined,
  isLoading,
  isRefreshing: false,
  refetch: vi.fn(),
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('PosterCarousel', () => {
  it('renders nothing when there are no active posters', () => {
    useActivePostersMock.mockReturnValue(resource([]))

    const { container } = render(<PosterCarousel />)

    expect(container.querySelector('section')).toBeNull()
  })

  it('shows a fixed-aspect skeleton while loading', () => {
    useActivePostersMock.mockReturnValue(resource(undefined, true))

    const { container } = render(<PosterCarousel />)

    expect(container.querySelector('section')).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('renders the first poster and one indicator per poster', () => {
    useActivePostersMock.mockReturnValue(
      resource([
        poster(),
        poster({
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Summer campaign',
          imageUrl: 'https://example.com/summer.jpg',
        }),
      ]),
    )

    render(<PosterCarousel />)

    expect(screen.getByAltText('Spring campaign').getAttribute('src')).toBe(
      'https://example.com/spring.jpg',
    )
    expect(
      screen.getByRole('button', { name: 'Show poster 1' }).getAttribute('aria-current'),
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: 'Show poster 2' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('advances and rewinds with the arrows', () => {
    useActivePostersMock.mockReturnValue(
      resource([
        poster(),
        poster({ id: '22222222-2222-4222-8222-222222222222', title: 'Summer campaign' }),
      ]),
    )

    render(<PosterCarousel />)

    fireEvent.click(screen.getByRole('button', { name: 'Next poster' }))
    expect(
      screen.getByRole('button', { name: 'Show poster 2' }).getAttribute('aria-current'),
    ).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Previous poster' }))
    expect(
      screen.getByRole('button', { name: 'Show poster 1' }).getAttribute('aria-current'),
    ).toBe('true')
  })

  it('advances on a left swipe', () => {
    useActivePostersMock.mockReturnValue(
      resource([
        poster(),
        poster({ id: '22222222-2222-4222-8222-222222222222', title: 'Summer campaign' }),
      ]),
    )

    render(<PosterCarousel />)
    const viewport = screen.getByTestId('poster-carousel-viewport')

    fireEvent.touchStart(viewport, { touches: [{ clientX: 220 }] })
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 120 }] })

    expect(
      screen.getByRole('button', { name: 'Show poster 2' }).getAttribute('aria-current'),
    ).toBe('true')
  })

  it('autoplays forward until the mouse pauses it', () => {
    vi.useFakeTimers()
    useActivePostersMock.mockReturnValue(
      resource([
        poster(),
        poster({ id: '22222222-2222-4222-8222-222222222222', title: 'Summer campaign' }),
      ]),
    )

    render(<PosterCarousel />)
    const carousel = screen.getByTestId('poster-carousel')

    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(
      screen.getByRole('button', { name: 'Show poster 2' }).getAttribute('aria-current'),
    ).toBe('true')

    fireEvent.mouseEnter(carousel)
    act(() => {
      vi.advanceTimersByTime(12000)
    })
    // Still on poster 2 (the last) while paused.
    expect(
      screen.getByRole('button', { name: 'Show poster 2' }).getAttribute('aria-current'),
    ).toBe('true')
  })
})
