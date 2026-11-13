import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, matchRoutes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { AccountSectionLayout } from './AccountSectionLayout'

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { firstName: 'Alex', lastName: 'Morgan', email: 'alex@example.com' },
    logout: vi.fn(),
  }),
  displayName: (user: { firstName?: string; lastName?: string } | null) =>
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
}))

vi.mock('@/features/cart/useCartActions', () => ({
  useCartActions: () => ({ itemCount: 2 }),
}))

vi.mock('@/features/wishlist/useWishlistActions', () => ({
  useWishlistActions: () => ({ itemCount: 3 }),
}))

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AccountSectionLayout />}>
          <Route path="/account" element={<p>overview page</p>} />
          <Route path="/account/orders" element={<p>orders page</p>} />
          <Route path="/account/orders/:id" element={<p>order detail page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
})

describe('AccountSectionLayout', () => {
  it('renders the routed page inside the storefront account shell', () => {
    renderAt('/account/orders')

    expect(screen.getByText('orders page')).toBeTruthy()
    expect(screen.getByText('Alex Morgan')).toBeTruthy()
  })

  it('links every account section to its public account route', () => {
    renderAt('/account')

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))

    expect(hrefs).toContain('/account')
    expect(hrefs).toContain('/account/orders')
    expect(hrefs).toContain('/account/profile')
    expect(hrefs).toContain('/account/wishlist')
    expect(hrefs).toContain('/account/bag')
    expect(hrefs).toContain('/account/addresses')
    expect(hrefs).toContain('/account/feedback')
  })

  it('marks the current section as the active page', () => {
    renderAt('/account/orders')

    const current = screen.getAllByRole('link', { name: 'Orders' })

    expect(current.length).toBeGreaterThan(0)
    expect(current.every((link) => link.getAttribute('aria-current') === 'page')).toBe(true)
  })

  it('keeps the active section for a nested order detail route', () => {
    renderAt('/account/orders/11111111-1111-4111-8111-111111111111')

    expect(screen.getByText('order detail page')).toBeTruthy()
    expect(
      screen.getAllByRole('link', { name: 'Orders' }).every(
        (link) => link.getAttribute('aria-current') === 'page',
      ),
    ).toBe(true)
  })

  it('is the shell the real route tree renders for customer account paths', () => {
    const matches = matchRoutes(routes, '/account/orders/11111111-1111-4111-8111-111111111111')

    expect(matches?.at(-1)?.route.path).toBe('orders/:id')
    expect(matches?.some((match) => match.route.path === '/account')).toBe(true)
  })
})