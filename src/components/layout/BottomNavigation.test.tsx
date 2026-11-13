import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BottomNavigation } from './BottomNavigation'

vi.mock('@/features/cart/useCartActions', () => ({
  useCartActions: () => ({ itemCount: 0 }),
}))

vi.mock('@/features/wishlist/useWishlistActions', () => ({
  useWishlistActions: () => ({ itemCount: 0 }),
}))

const TABS = ['Home', 'Shop', 'Wishlist', 'Bag', 'Account'] as const

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNavigation />
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
})

describe('BottomNavigation active state', () => {
  it.each([
    ['/', 'Home'],
    ['/shop', 'Shop'],
    ['/account', 'Account'],
    ['/account/orders', 'Account'],
    ['/account/profile', 'Account'],
    ['/account/checkout', 'Account'],
    ['/account/addresses', 'Account'],
    ['/account/wishlist', 'Wishlist'],
    ['/account/bag', 'Bag'],
  ] as const)('marks %s active for %s only', (path, activeLabel) => {
    renderAt(path)

    for (const label of TABS) {
      const link = screen.getByRole('link', { name: label })
      if (label === activeLabel) {
        expect(link.getAttribute('aria-current')).toBe('page')
      } else {
        expect(link.getAttribute('aria-current')).toBeNull()
      }
    }
  })

  it('leaves every tab inactive on a page outside the tab routes', () => {
    renderAt('/product/11111111-1111-4111-8111-111111111111')

    for (const label of TABS) {
      expect(screen.getByRole('link', { name: label }).getAttribute('aria-current')).toBeNull()
    }
  })
})