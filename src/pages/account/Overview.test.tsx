import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrders } from '@/features/orders/api'
import { useAuth } from '@/features/auth/useAuth'
import type { OrderSummary } from '@/types/api'
import Overview from './Overview'

vi.mock('@/features/orders/api', () => ({
  fetchOrders: vi.fn(),
}))

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: vi.fn(),
  displayName: (user: unknown) => (user as { firstName?: string })?.firstName ?? '',
}))

vi.mock('@/features/cart/useCartActions', () => ({
  useCartActions: () => ({
    cart: { itemCount: 2, subtotal: '50.00' },
    lines: [{ id: 'line-1' }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/features/wishlist/useWishlistActions', () => ({
  useWishlistActions: () => ({
    items: [{ id: 'w-1' }],
    itemCount: 1,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/features/addresses/useAddressActions', () => ({
  useAddressActions: () => ({
    addresses: [],
    defaultAddress: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

const fetchOrdersMock = vi.mocked(fetchOrders)
const useAuthMock = vi.mocked(useAuth)

const mockOrderSummary = (
  id: string,
  orderNumber: string,
  status: OrderSummary['status'],
): OrderSummary => ({
  id,
  userId: 'user-1',
  orderNumber,
  status,
  subtotal: '50.00',
  shippingFee: '0.00',
  discountAmount: '0.00',
  totalAmount: '50.00',
  currency: 'USD',
  itemCount: 1,
  lineCount: 1,
  shippingRecipientName: 'Alex Morgan',
  shippingCity: 'Phnom Penh',
  shippingLocationPath: null,
  shippingCountryCode: 'KH',
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
})

const renderOverview = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Overview />} />
      </Routes>
    </MemoryRouter>,
  )

describe('Customer Dashboard Overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'alex@example.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        phone: null,
        emailVerifiedAt: null,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isInitializing: false,
      isLoginPending: false,
      loginError: null,
      login: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders customer welcome header and email', async () => {
    fetchOrdersMock.mockResolvedValue([])

    renderOverview()

    expect(await screen.findByText(/Welcome back, Alex/i)).toBeTruthy()
    expect(screen.getByText(/Signed in as alex@example.com/i)).toBeTruthy()
  })

  it('computes and displays real total, pending, and delivered statistics across all orders', async () => {
    const orders: OrderSummary[] = [
      mockOrderSummary('1', 'ORD-001', 'PENDING'),
      mockOrderSummary('2', 'ORD-002', 'CONFIRMED'),
      mockOrderSummary('3', 'ORD-003', 'SHIPPED'),
      mockOrderSummary('4', 'ORD-004', 'DELIVERED'),
      mockOrderSummary('5', 'ORD-005', 'DELIVERED'),
    ]
    fetchOrdersMock.mockResolvedValue(orders)

    renderOverview()

    expect(await screen.findByText('ORD-001')).toBeTruthy()

    const statsSection = screen.getByRole('region', { name: /order summary statistics/i })
    expect(within(statsSection).getByText('05')).toBeTruthy()
    expect(within(statsSection).getByText('01')).toBeTruthy()
    expect(within(statsSection).getByText('02')).toBeTruthy()
  })

  it('renders empty orders state when customer has zero orders', async () => {
    fetchOrdersMock.mockResolvedValue([])

    renderOverview()

    expect(await screen.findByText('No orders yet')).toBeTruthy()
    expect(screen.getByText('Nothing ordered so far')).toBeTruthy()
    expect(screen.getByRole('link', { name: /start shopping/i })).toBeTruthy()

    // 00 for total, pending, delivered
    expect(screen.getAllByText('00').length).toBeGreaterThanOrEqual(3)
  })

  it('offers quick navigation to My Orders, Addresses, and Profile', async () => {
    fetchOrdersMock.mockResolvedValue([])

    renderOverview()

    expect(await screen.findAllByRole('link', { name: /my orders/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /delivery addresses/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /account profile/i })).toBeTruthy()
  })

  it('renders recent orders with links to order details', async () => {
    const orders: OrderSummary[] = [
      mockOrderSummary('order-uuid-1', 'ORD-REC-1', 'CONFIRMED'),
    ]
    fetchOrdersMock.mockResolvedValue(orders)

    renderOverview()

    const orderLink = await screen.findByRole('link', { name: /ORD-REC-1/i })
    expect(orderLink.getAttribute('href')).toBe('/dashboard/orders/order-uuid-1')
  })
})
