import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/useAuth'
import Login from '@/pages/public/Login'
import Register from '@/pages/public/Register'
import Profile from '@/pages/account/Profile'
import * as authApi from '@/features/auth/api'

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => ({
    showFeedback: vi.fn(),
  }),
}))

vi.mock('@/features/orders/useOrders', () => ({
  useOrders: () => ({ isLoading: false, data: [] }),
}))

vi.mock('@/features/wishlist/useWishlistActions', () => ({
  useWishlistActions: () => ({ isLoading: false, items: [] }),
}))

vi.mock('@/features/addresses/useAddressActions', () => ({
  useAddressActions: () => ({ isLoading: false, addresses: [] }),
}))

describe('Google Authentication Frontend Integration', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders GoogleAuthButton in disabled state with clear guidance when VITE_GOOGLE_CLIENT_ID is missing', () => {
    render(<GoogleAuthButton mode="signin" />)

    expect(screen.getByText(/Continue with Google \(Unavailable\)/i)).toBeDefined()
    expect(screen.getByText(/VITE_GOOGLE_CLIENT_ID/i)).toBeDefined()
  })

  it('renders Continue with Google button on Login page', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Continue with Google/i)).toBeDefined()
    expect(screen.getByText(/Or continue with email/i)).toBeDefined()
    expect(screen.getByLabelText(/Email/i)).toBeDefined()
  })

  it('renders Sign up with Google button on Register page', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Register />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Sign up with Google/i)).toBeDefined()
    expect(screen.getByText(/Or register with email/i)).toBeDefined()
    expect(screen.getByLabelText(/First name/i)).toBeDefined()
  })

  it('renders Connected Accounts panel on Profile page with Google status', async () => {
    vi.spyOn(authApi, 'fetchLinkedIdentities').mockResolvedValueOnce([
      {
        id: 'ident-1',
        provider: 'google',
        createdAt: '2026-03-01T00:00:00.000Z',
      },
    ])

    render(
      <MemoryRouter>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Connected accounts/i)).toBeDefined()
    expect(screen.getAllByText(/Google/i).length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText(/Connected on/i)).toBeDefined()
    })
  })

  it('loginWithGoogle flow in AuthProvider sends ID token and updates user state', async () => {
    const mockUser: authApi.AuthUser = {
      id: 'google-user-123',
      email: 'test@example.com',
      firstName: 'Google',
      lastName: 'User',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      phone: null,
      emailVerifiedAt: '2026-03-01T00:00:00.000Z',
      lastLoginAt: '2026-03-01T00:00:00.000Z',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    }

    vi.spyOn(authApi, 'loginWithGoogle').mockResolvedValueOnce({
      accessToken: 'test-google-access-token',
      expiresIn: '15m',
      user: mockUser,
    })

    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockUser)

    let authContextResult!: ReturnType<typeof useAuth>

    function TestConsumer() {
      authContextResult = useAuth()
      return <div>User: {authContextResult.user?.email ?? 'none'}</div>
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(authContextResult.isInitializing).toBe(false)
    })

    let success = false
    await act(async () => {
      success = await authContextResult.loginWithGoogle('google.id.token.credential')
    })

    expect(success).toBe(true)
    expect(authApi.loginWithGoogle).toHaveBeenCalledWith('google.id.token.credential', undefined)
    await waitFor(() => {
      expect(authContextResult.user?.email).toBe('test@example.com')
    })
  })
})
