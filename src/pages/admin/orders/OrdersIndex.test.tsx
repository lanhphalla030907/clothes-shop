import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { fetchAdminOrders } from '@/features/adminOrders/api'
import type {
  AdminOrderListResponse,
  AdminOrderSummary,
} from '@/types/api'
import OrdersIndex from './OrdersIndex'

vi.mock('@/features/adminOrders/api', () => ({
  fetchAdminOrders: vi.fn(),
}))

const fetchMock = vi.mocked(fetchAdminOrders)

const makeOrder = (
  overrides: Partial<AdminOrderSummary> = {},
): AdminOrderSummary => ({
  id: '11111111-1111-4111-8111-111111111111',
  orderNumber: 'ORD-20261001-AAAAAA',
  status: 'PENDING',
  customer: {
    id: '22222222-2222-4222-8222-222222222222',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.test',
  },
  subtotal: '100.00',
  shippingFee: '5.00',
  discountAmount: '0.00',
  totalAmount: '105.00',
  currency: 'USD',
  itemCount: 2,
  lineCount: 1,
  shippingRecipientName: 'Jane Doe',
  shippingCity: 'Phnom Penh',
  shippingLocationPath: null,
  shippingCountryCode: 'KH',
  paymentMethod: 'ABA_PAYWAY',
  payment: {
    id: '33333333-3333-4333-8333-333333333333',
    status: 'PENDING',
    provider: 'ABA_PAYWAY',
    amount: '105.00',
    currency: 'USD',
    paidAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  hasPaidPayment: false,
  codCollection: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const makeList = (
  items: AdminOrderSummary[],
  pagination: AdminOrderListResponse['pagination'] = {
    page: 1,
    limit: 20,
    total: items.length,
    totalPages: items.length === 0 ? 0 : 1,
  },
): AdminOrderListResponse => ({ items, pagination })

const renderIndex = () =>
  render(
    <MemoryRouter initialEntries={['/admin/orders']}>
      <Routes>
        <Route path="/admin/orders" element={<OrdersIndex />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  fetchMock.mockReset()
})

afterEach(cleanup)

describe('OrdersIndex', () => {
  it('loads orders and shows the supported list fields', async () => {
    const order = makeOrder()
    const paid = makeOrder({
      id: '44444444-4444-4444-8444-444444444444',
      orderNumber: 'ORD-20261002-BBBBBB',
      status: 'CONFIRMED',
      hasPaidPayment: true,
      payment: {
        ...order.payment!,
        status: 'PAID',
        paidAt: '2026-10-02T00:00:00.000Z',
      },
    })
    fetchMock.mockResolvedValue(makeList([order, paid]))

    renderIndex()

    expect((await screen.findAllByText('ORD-20261001-AAAAAA')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('ORD-20261002-BBBBBB').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0)
    expect(screen.getAllByText('jane@example.test').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$105.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ABA PayWay').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending payment').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThan(0)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      expect.anything(),
    )
  })

  it('shows a loading state and then an empty state', async () => {
    let resolveList: ((value: AdminOrderListResponse) => void) | undefined
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve
        }),
    )

    renderIndex()

    expect(screen.getByLabelText('Loading orders')).toBeTruthy()
    resolveList?.(makeList([]))

    expect(await screen.findByText('No orders have been placed')).toBeTruthy()
  })

  it('shows an API failure with a retry action', async () => {
    fetchMock.mockRejectedValue(
      new ApiError('Network unavailable', { kind: 'network' }),
    )

    renderIndex()

    expect(await screen.findByText(/could not reach the studio/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('applies search and status filters through the API query', async () => {
    fetchMock.mockResolvedValue(makeList([makeOrder()]))

    renderIndex()
    await screen.findAllByText('ORD-20261001-AAAAAA')

    fireEvent.change(screen.getByLabelText(/Search orders/), {
      target: { value: ' ORD-2026 ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'ORD-2026', page: 1 }),
        expect.anything(),
      ),
    )

    fireEvent.change(screen.getByLabelText(/Order status/), {
      target: { value: 'SHIPPED' },
    })

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'SHIPPED', page: 1 }),
        expect.anything(),
      ),
    )
  })

  it('paginates using the backend pagination metadata', async () => {
    const firstPage = makeList([makeOrder()], {
      page: 1,
      limit: 20,
      total: 21,
      totalPages: 2,
    })
    const secondPage = makeList(
      [makeOrder({ id: '55555555-5555-4555-8555-555555555555', orderNumber: 'ORD-20261003-CCCCCC' })],
      { page: 2, limit: 20, total: 21, totalPages: 2 },
    )

    fetchMock.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage)

    renderIndex()
    await screen.findAllByText('ORD-20261001-AAAAAA')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 20 }),
        expect.anything(),
      ),
    )
    expect((await screen.findAllByText('ORD-20261003-CCCCCC')).length).toBeGreaterThan(0)
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
  })

  it('shows the order-level payment method and effective status for a COD order with no attempt', async () => {
    const codOrder = makeOrder({
      id: '66666666-6666-4666-8666-666666666666',
      orderNumber: 'ORD-20261004-DDDDDD',
      paymentMethod: 'COD',
      payment: null,
      hasPaidPayment: false,
      codCollection: {
        status: 'NOT_COLLECTED',
        amount: null,
        currency: null,
        collectedAt: null,
        collector: null,
      },
    })

    fetchMock.mockResolvedValue(makeList([codOrder]))

    renderIndex()

    await waitFor(() =>
      expect(screen.getAllByText('ORD-20261004-DDDDDD').length).toBeGreaterThan(0),
    )
    expect(screen.getAllByText('Cash on Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Not collected').length).toBeGreaterThan(0)
  })

  it('shows a recorded COD collection separately while payment stays unpaid', async () => {
    const collected = makeOrder({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      orderNumber: 'ORD-20261009-IIIIII',
      status: 'DELIVERED',
      paymentMethod: 'COD',
      payment: null,
      hasPaidPayment: false,
      codCollection: {
        status: 'COLLECTED',
        amount: '6.50',
        currency: 'USD',
        collectedAt: '2026-11-01T17:39:58.212Z',
        collector: {
          id: '66666666-6666-4666-8666-666666666666',
          firstName: 'Alex',
          lastName: 'Courier',
          email: 'alex@example.test',
        },
      },
    })

    fetchMock.mockResolvedValue(makeList([collected]))

    renderIndex()

    await waitFor(() =>
      expect(screen.getAllByText('ORD-20261009-IIIIII').length).toBeGreaterThan(0),
    )
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collected').length).toBeGreaterThan(0)
    expect(screen.queryByText('Not collected')).toBeNull()
  })

  it('does not render a COD collection status for a non-COD order', async () => {
    fetchMock.mockResolvedValue(makeList([makeOrder()]))

    renderIndex()

    await screen.findAllByText('ORD-20261001-AAAAAA')

    expect(screen.queryByText('Collected')).toBeNull()
    expect(screen.queryByText('Not collected')).toBeNull()
  })

  it('shows ABA PayWay and Failed when the latest attempt failed', async () => {
    const failedOrder = makeOrder({
      id: '77777777-7777-4777-8777-777777777777',
      orderNumber: 'ORD-20261005-EEEEEE',
      paymentMethod: 'ABA_PAYWAY',
      payment: {
        ...makeOrder().payment!,
        status: 'FAILED',
      },
      hasPaidPayment: false,
    })

    fetchMock.mockResolvedValue(makeList([failedOrder]))

    renderIndex()

    await waitFor(() =>
      expect(screen.getAllByText('ORD-20261005-EEEEEE').length).toBeGreaterThan(0),
    )
    expect(screen.getAllByText('ABA PayWay').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0)
  })

  it('shows ABA PayWay and Pending when the latest attempt is pending', async () => {
    const pendingOrder = makeOrder({
      id: '88888888-8888-4888-8888-888888888888',
      orderNumber: 'ORD-20261006-FFFFFF',
      paymentMethod: 'ABA_PAYWAY',
      payment: {
        ...makeOrder().payment!,
        status: 'PENDING',
      },
      hasPaidPayment: false,
    })

    fetchMock.mockResolvedValue(makeList([pendingOrder]))

    renderIndex()

    await waitFor(() =>
      expect(screen.getAllByText('ORD-20261006-FFFFFF').length).toBeGreaterThan(0),
    )
    expect(screen.getAllByText('ABA PayWay').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending payment').length).toBeGreaterThan(0)
  })

  it('shows ABA PayWay and Paid when a verified payment exists', async () => {
    const paidOrder = makeOrder({
      id: '99999999-9999-4999-8999-999999999999',
      orderNumber: 'ORD-20261007-GGGGGG',
      paymentMethod: 'ABA_PAYWAY',
      payment: {
        ...makeOrder().payment!,
        status: 'PAID',
        paidAt: '2026-10-07T00:00:00.000Z',
      },
      hasPaidPayment: true,
    })

    fetchMock.mockResolvedValue(makeList([paidOrder]))

    renderIndex()

    await waitFor(() =>
      expect(screen.getAllByText('ORD-20261007-GGGGGG').length).toBeGreaterThan(0),
    )
    expect(screen.getAllByText('ABA PayWay').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
  })

  it('renders the correct payment method in the mobile layout', async () => {
    const codOrder = makeOrder({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      orderNumber: 'ORD-20261008-HHHHHH',
      paymentMethod: 'COD',
      payment: null,
      hasPaidPayment: false,
    })

    fetchMock.mockResolvedValue(makeList([codOrder]))

    renderIndex()

    await waitFor(() =>
      expect(screen.getAllByText('ORD-20261008-HHHHHH').length).toBeGreaterThan(0),
    )
    expect(screen.getAllByText('Cash on Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0)
  })
})
