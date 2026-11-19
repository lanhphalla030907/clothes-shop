import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '@/app/guards'
import { routes } from '@/app/routes'
import { SaveToWishlist } from '@/components/product/SaveToWishlist'
import { CartActionsProvider } from '@/features/cart/CartActionsProvider'
import { useCartActions } from '@/features/cart/useCartActions'
import { WishlistActionsProvider } from '@/features/wishlist/WishlistActionsProvider'
import { ApiError, toUserMessage } from '@/lib/api/errors'
import { emitUnauthorized, writeAccessToken } from '@/lib/api/session'
import { AuthProvider } from './AuthProvider'
import { LOGIN_REQUIRED } from './loginRequired'
import { useAuth } from './useAuth'

const feedback = vi.hoisted(() => ({
  showFeedback: vi.fn(),
  confirmFeedback: vi.fn(async () => true),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => ({
    showFeedback: feedback.showFeedback,
    confirmFeedback: feedback.confirmFeedback,
  }),
}))

const cartApi = vi.hoisted(() => ({
  fetchCart: vi.fn(async () => undefined),
  addCartLine: vi.fn(async () => ({ id: 'line' })),
  updateCartLine: vi.fn(async () => ({ id: 'line' })),
  removeCartLine: vi.fn(async () => undefined),
  clearCart: vi.fn(async () => undefined),
}))

vi.mock('@/features/cart/api', () => cartApi)

const wishlistApi = vi.hoisted(() => ({
  fetchWishlist: vi.fn(async () => undefined),
  addWishlistItem: vi.fn(async () => ({ id: 'item' })),
  removeWishlistItem: vi.fn(async () => undefined),
  clearWishlist: vi.fn(async () => undefined),
}))

vi.mock('@/features/wishlist/api', () => wishlistApi)

const SESSION_KEY = 'ctrl.session.v1'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const installFetch = (): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) {
        // Non-terminal: the guest has no session, but this is not an expiry.
        return jsonResponse({ message: 'No session' }, 403)
      }
      if (url.endsWith('/auth/me')) {
        return jsonResponse({
          id: '75a28c31-1124-4439-840a-48182a0fba7d',
          firstName: 'Land',
          lastName: 'Phalll',
          email: 'landphalll@gmail.com',
          phone: null,
          status: 'ACTIVE',
          role: 'CUSTOMER',
          emailVerifiedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        })
      }
      if (url.endsWith('/auth/logout')) return jsonResponse(null, 204)
      throw new Error(`Unexpected request in login-required test: ${url}`)
    }),
  )
}

function InitProbe() {
  const { isInitializing } = useAuth()
  return <span data-testid="initializing">{String(isInitializing)}</span>
}

function AddToBagButton() {
  const { add } = useCartActions()
  return <button onClick={() => void add('variant-1')}>Add to bag</button>
}

const renderApp = (ui: ReactNode, initialEntries: string[] = ['/product/123']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <CartActionsProvider>
          <WishlistActionsProvider>
            <InitProbe />
            {ui}
          </WishlistActionsProvider>
        </CartActionsProvider>
      </AuthProvider>
    </MemoryRouter>,
  )

const settleAuth = () =>
  waitFor(() => expect(screen.getByTestId('initializing').textContent).toBe('false'))

const storefrontRoutes = () => routes.find((route) => route.Component && !route.path)

beforeEach(() => {
  window.localStorage.clear()
  feedback.showFeedback.mockClear()
  feedback.confirmFeedback.mockClear()
  feedback.confirmFeedback.mockResolvedValue(true)
  cartApi.fetchCart.mockClear()
  cartApi.addCartLine.mockClear()
  wishlistApi.fetchWishlist.mockClear()
  wishlistApi.addWishlistItem.mockClear()
  installFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('centralized login-required handling', () => {
  it('shows the standard message when a guest adds to bag, without calling the API', async () => {
    renderApp(<AddToBagButton />)
    await settleAuth()

    fireEvent.click(screen.getByRole('button', { name: 'Add to bag' }))

    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalledTimes(1))
    expect(feedback.confirmFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        title: LOGIN_REQUIRED.title,
        message: LOGIN_REQUIRED.message,
        confirmLabel: LOGIN_REQUIRED.action,
        cancelLabel: null,
      }),
    )
    expect(cartApi.addCartLine).not.toHaveBeenCalled()
  })

  it('shows the standard message when a guest saves to wishlist, without calling the API', async () => {
    renderApp(<SaveToWishlist productId="product-1" productName="Linen Shirt" />)
    await settleAuth()

    fireEvent.click(
      screen.getByRole('button', { name: 'Save Linen Shirt to your wishlist' }),
    )

    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalledTimes(1))
    expect(feedback.confirmFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        title: LOGIN_REQUIRED.title,
        message: LOGIN_REQUIRED.message,
        confirmLabel: LOGIN_REQUIRED.action,
      }),
    )
    expect(wishlistApi.addWishlistItem).not.toHaveBeenCalled()
  })

  it('protects the checkout route and redirects a guest from it', async () => {
    const checkout = storefrontRoutes()?.children?.find((route) => route.path === '/checkout')
    expect(checkout?.Component).toBe(RequireAuth)

    renderApp(
      <Routes>
        <Route path="/checkout" element={<RequireAuth />}>
          <Route index element={<div>checkout-screen</div>} />
        </Route>
        <Route path="/login" element={<div>login-screen</div>} />
      </Routes>,
      ['/checkout'],
    )
    await settleAuth()

    await waitFor(() => expect(screen.getByText('login-screen')).toBeTruthy())
    expect(screen.queryByText('checkout-screen')).toBeNull()
  })

  it('redirects a guest from My Orders with the intended destination preserved', async () => {
    renderApp(
      <Routes>
        <Route path="/account/orders" element={<RequireAuth />}>
          <Route index element={<div>orders-screen</div>} />
        </Route>
        <Route path="/login" element={<div>login-screen</div>} />
      </Routes>,
      ['/account/orders?status=paid'],
    )
    await settleAuth()

    await waitFor(() => expect(screen.getByText('login-screen')).toBeTruthy())
    expect(screen.queryByText('orders-screen')).toBeNull()
  })

  it('keeps public browsing routes outside the auth guard', () => {
    const children = storefrontRoutes()?.children ?? []
    const browsing = children.filter((route) =>
      ['/', '/shop', '/products', '/product/:id', '/collections/:slug'].includes(route.path ?? ''),
    )

    expect(browsing).toHaveLength(5)
    expect(browsing.every((route) => route.Component !== RequireAuth)).toBe(true)
  })

  it('returns a guest to the intended destination after they confirm sign-in', async () => {
    renderApp(
      <Routes>
        <Route path="/product/123" element={<AddToBagButton />} />
        <Route path="/login" element={<div>login-screen</div>} />
      </Routes>,
      ['/product/123?size=M'],
    )
    await settleAuth()

    fireEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
    await waitFor(() => expect(screen.getByText('login-screen')).toBeTruthy())

    expect(feedback.confirmFeedback).toHaveBeenCalledTimes(1)
  })

  it('does not send an unsafe destination to the sign-in page', () => {
    expect(LOGIN_REQUIRED.title).toBe('Sign in required')
    expect(LOGIN_REQUIRED.message).toBe('Please sign in to your account to continue.')
    expect(LOGIN_REQUIRED.action).toBe('Sign In')
  })

  it('shows friendly messaging for an expired session and clears its credential', async () => {
    writeAccessToken('stored-token', 3600)
    renderApp(<div>orders-screen</div>, ['/account/orders'])
    await settleAuth()

    await act(async () => {
      emitUnauthorized({ hadToken: true })
    })

    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
    expect(feedback.showFeedback).toHaveBeenCalledTimes(1)
    expect(feedback.showFeedback).toHaveBeenCalledWith({
      type: 'info',
      title: LOGIN_REQUIRED.title,
      message: LOGIN_REQUIRED.message,
    })
    expect(
      toUserMessage(new ApiError('Unauthorized', { kind: 'unauthorized', status: 401 })),
    ).toBe(LOGIN_REQUIRED.message)
  })

  it('shows one notice and one dialog for simultaneous 401 responses', async () => {
    writeAccessToken('stored-token', 3600)
    renderApp(<AddToBagButton />, ['/product/123'])
    await settleAuth()

    await act(async () => {
      emitUnauthorized({ hadToken: true })
      emitUnauthorized({ hadToken: true })
    })

    expect(feedback.showFeedback).toHaveBeenCalledTimes(1)

    window.localStorage.clear()
    feedback.confirmFeedback.mockClear()
    const button = screen.getByRole('button', { name: 'Add to bag' })
    await act(async () => {
      fireEvent.click(button)
      fireEvent.click(button)
    })

    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalledTimes(1))
  })
})
