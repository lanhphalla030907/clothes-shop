import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAdminRoute } from '@/app/adminGuard'
import { RequireAuth, RequireDeliveryStaffRoute } from '@/app/guards'
import { AccountMenu } from '@/components/layout/AccountMenu'
import Login from '@/pages/public/Login'
import { AuthProvider } from './AuthProvider'
import type { AuthUser, Role } from './authTypes'
import { useAuth } from './useAuth'

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => ({
    showFeedback: vi.fn(),
    confirmFeedback: vi.fn(),
  }),
}))

const SESSION_KEY = 'ctrl.session.v1'

const makeUser = (role: Role): AuthUser => ({
  id: '75a28c31-1124-4439-840a-48182a0fba7d',
  firstName: 'Land',
  lastName: 'Phalll',
  email: 'landphalll@gmail.com',
  phone: null,
  status: 'ACTIVE',
  role,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: '2026-10-28T15:56:25.825Z',
  updatedAt: '2026-10-29T04:38:12.718Z',
})

/** The subset of `Response` the transport uses. */
const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }) as Response

const seedSession = (accessToken: string): void => {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ accessToken, expiresAt: null }),
  )
}

/** A token whose payload claims CUSTOMER, as one issued before a promotion would. */
const staleCustomerToken = (): string =>
  `header.${window.btoa(JSON.stringify({ sub: makeUser('CUSTOMER').id, role: 'CUSTOMER' }))}.signature`

type FetchOptions = {
  /** What the login response says, deliberately allowed to disagree with `/auth/me`. */
  loginRole?: Role
  /** What `/auth/me` says. This is the authority the app must use. */
  meRole?: Role
  /** Replaces the `/auth/me` response when a test needs to control its timing. */
  me?: () => Promise<Response>
}

const installFetch = ({ loginRole = 'CUSTOMER', meRole = 'CUSTOMER', me }: FetchOptions = {}) => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url.endsWith('/auth/login')) {
      return jsonResponse({
        accessToken: 'new-access-token',
        expiresIn: '15m',
        user: makeUser(loginRole),
      })
    }

    if (url.endsWith('/auth/me')) {
      return me === undefined ? jsonResponse(makeUser(meRole)) : me()
    }

    throw new Error(`Unexpected request in test: ${url}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderWithRouter = (ui: ReactNode, initialEntries: string[] = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  )

const renderLogin = (initialEntry = '/login') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<div>admin-landing</div>} />
          <Route path="/admin/products" element={<div>admin-products</div>} />
          <Route path="/account" element={<div>customer-landing</div>} />
          <Route path="/delivery" element={<div>delivery-landing</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )

const submitCredentials = () => {
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: 'landphalll@gmail.com' },
  })
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: 'correct-horse-battery-staple' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

function AuthProbe() {
  const { user, isInitializing, logout } = useAuth()

  return (
    <div>
      <span data-testid="role">{user?.role ?? 'NONE'}</span>
      <span data-testid="initializing">{String(isInitializing)}</span>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('login routing', () => {
  it('sends an ADMIN to the admin landing screen even when the login body is stale', async () => {
    // The login response carries CUSTOMER; `/auth/me` is the authority and
    // reports the promoted role. The app must follow `/auth/me`.
    installFetch({ loginRole: 'CUSTOMER', meRole: 'ADMIN' })
    renderLogin()

    submitCredentials()

    await waitFor(() => expect(screen.getByText('admin-landing')).toBeTruthy())
    expect(screen.queryByText('customer-landing')).toBeNull()
  })

  it('sends a CUSTOMER to the customer landing screen even when the login body is stale', async () => {
    installFetch({ loginRole: 'ADMIN', meRole: 'CUSTOMER' })
    renderLogin()

    submitCredentials()

    await waitFor(() => expect(screen.getByText('customer-landing')).toBeTruthy())
    expect(screen.queryByText('admin-landing')).toBeNull()
  })

  it('sends DELIVERY_STAFF to the delivery landing screen', async () => {
    installFetch({ loginRole: 'CUSTOMER', meRole: 'DELIVERY_STAFF' })
    renderLogin()

    submitCredentials()

    await waitFor(() => expect(screen.getByText('delivery-landing')).toBeTruthy())
    expect(screen.queryByText('customer-landing')).toBeNull()
  })

  it('preserves an intended admin destination for an ADMIN', async () => {
    installFetch({ meRole: 'ADMIN' })
    renderLogin('/login?from=%2Fadmin%2Fproducts')

    submitCredentials()

    await waitFor(() => expect(screen.getByText('admin-products')).toBeTruthy())
  })

  it('does not return an ADMIN to the customer dashboard through ?from=', async () => {
    installFetch({ meRole: 'ADMIN' })
    renderLogin('/login?from=%2Faccount')

    submitCredentials()

    await waitFor(() => expect(screen.getByText('admin-landing')).toBeTruthy())
    expect(screen.queryByText('customer-landing')).toBeNull()
  })

  it('does not let a CUSTOMER reach an admin destination through ?from=', async () => {
    installFetch({ meRole: 'CUSTOMER' })
    renderLogin('/login?from=%2Fadmin%2Fproducts')

    submitCredentials()

    await waitFor(() => expect(screen.getByText('customer-landing')).toBeTruthy())
    expect(screen.queryByText('admin-products')).toBeNull()
  })
})

describe('authoritative identity', () => {
  it('uses /auth/me rather than a stale CUSTOMER claim in a stored token', async () => {
    seedSession(staleCustomerToken())
    installFetch({ meRole: 'ADMIN' })

    renderWithRouter(<AuthProbe />)

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('ADMIN'))
  })

  it('clears a stored session that /auth/me rejects with 401', async () => {
    seedSession('expired-token')
    installFetch({ me: async () => jsonResponse({ message: 'Unauthorized' }, 401) })

    renderWithRouter(<AuthProbe />)

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('NONE'))
    await waitFor(() =>
      expect(screen.getByTestId('initializing').textContent).toBe('false'),
    )
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('does not show the form or redirect while /auth/me is still loading', async () => {
    seedSession('stored-token')

    let resolveMe!: (response: Response) => void
    const pendingMe = new Promise<Response>((resolve) => {
      resolveMe = resolve
    })
    installFetch({ me: () => pendingMe })

    renderLogin()

    expect(screen.getByText('Loading')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
    expect(screen.queryByText('admin-landing')).toBeNull()
    expect(screen.queryByText('customer-landing')).toBeNull()

    await act(async () => {
      resolveMe(jsonResponse(makeUser('ADMIN')))
    })

    await waitFor(() => expect(screen.getByText('admin-landing')).toBeTruthy())
  })
})

describe('route guards', () => {
  it('redirects an unauthenticated visitor from a protected route to sign in', async () => {
    renderWithRouter(
      <Routes>
        <Route path="/account" element={<RequireAuth />}>
          <Route index element={<div>customer-home</div>} />
        </Route>
        <Route path="/login" element={<div>login-screen</div>} />
      </Routes>,
      ['/account'],
    )

    await waitFor(() => expect(screen.getByText('login-screen')).toBeTruthy())
    expect(screen.queryByText('customer-home')).toBeNull()
  })

  it('blocks a CUSTOMER from the admin route', async () => {
    seedSession('stored-token')
    installFetch({ meRole: 'CUSTOMER' })

    renderWithRouter(
      <Routes>
        <Route path="/admin" element={<RequireAdminRoute />}>
          <Route index element={<div>admin-home</div>} />
        </Route>
      </Routes>,
      ['/admin'],
    )

    await waitFor(() =>
      expect(screen.getByText('This area is for administrators')).toBeTruthy(),
    )
    expect(screen.queryByText('admin-home')).toBeNull()
  })

  it('allows an ADMIN through the admin route', async () => {
    seedSession('stored-token')
    installFetch({ meRole: 'ADMIN' })

    renderWithRouter(
      <Routes>
        <Route path="/admin" element={<RequireAdminRoute />}>
          <Route index element={<div>admin-home</div>} />
        </Route>
      </Routes>,
      ['/admin'],
    )

    await waitFor(() => expect(screen.getByText('admin-home')).toBeTruthy())
  })

  it('blocks DELIVERY_STAFF from the admin route', async () => {
    seedSession('stored-token')
    installFetch({ meRole: 'DELIVERY_STAFF' })

    renderWithRouter(
      <Routes>
        <Route path="/admin" element={<RequireAdminRoute />}>
          <Route index element={<div>admin-home</div>} />
        </Route>
        <Route path="/delivery" element={<div>delivery-home</div>} />
      </Routes>,
      ['/admin'],
    )

    await waitFor(() => expect(screen.getByText('This area is for administrators')).toBeTruthy())
    expect(screen.queryByText('admin-home')).toBeNull()
  })

  it('allows DELIVERY_STAFF through the delivery route after session restoration', async () => {
    seedSession('stored-token')
    installFetch({ meRole: 'DELIVERY_STAFF' })

    renderWithRouter(
      <Routes>
        <Route path="/delivery" element={<RequireDeliveryStaffRoute />}>
          <Route index element={<div>delivery-home</div>} />
        </Route>
      </Routes>,
      ['/delivery'],
    )

    await waitFor(() => expect(screen.getByText('delivery-home')).toBeTruthy())
  })

  it('blocks CUSTOMER from the delivery route and returns them to their dashboard', async () => {
    seedSession('stored-token')
    installFetch({ meRole: 'CUSTOMER' })

    renderWithRouter(
      <Routes>
        <Route path="/delivery" element={<RequireDeliveryStaffRoute />}>
          <Route index element={<div>delivery-home</div>} />
        </Route>
        <Route path="/account" element={<div>customer-home</div>} />
      </Routes>,
      ['/delivery'],
    )

    await waitFor(() => expect(screen.getByText('customer-home')).toBeTruthy())
    expect(screen.queryByText('delivery-home')).toBeNull()
  })
})

describe('navigation and logout', () => {
  it('shows the admin studio link only for an ADMIN', async () => {
    seedSession('stored-token')
    installFetch({ meRole: 'ADMIN' })

    const { unmount } = renderWithRouter(
      <AccountMenu onSignOut={() => {}} bagCount={0} wishlistCount={0} />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /Land Phalll menu/i }))
    expect(screen.getByRole('link', { name: /Admin studio/i })).toBeTruthy()

    unmount()
    vi.unstubAllGlobals()
    window.localStorage.clear()

    installFetch({ meRole: 'CUSTOMER' })
    seedSession('stored-token')

    renderWithRouter(<AccountMenu onSignOut={() => {}} bagCount={0} wishlistCount={0} />)

    fireEvent.click(await screen.findByRole('button', { name: /Land Phalll menu/i }))
    expect(screen.queryByRole('link', { name: /Admin studio/i })).toBeNull()
  })

  it('clears the token and the user on logout', async () => {
    seedSession('stored-token')
    installFetch({ meRole: 'ADMIN' })

    renderWithRouter(<AuthProbe />)

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('ADMIN'))
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('NONE'))
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
  })
})
