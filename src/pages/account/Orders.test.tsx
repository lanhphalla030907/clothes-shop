import { cleanup, render, screen, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrders } from '@/features/orders/api'
import type { OrderSummary } from '@/types/api'
import Orders from './Orders'

vi.mock('@/features/orders/api', () => ({
  fetchOrders: vi.fn(),
}))

const fetchOrdersMock = vi.mocked(fetchOrders)

const mockSummary = (status: OrderSummary['status']): OrderSummary => ({
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  orderNumber: 'ORD-TEST-001',
  status,
  subtotal: '100.00',
  shippingFee: '0.00',
  discountAmount: '0.00',
  totalAmount: '100.00',
  currency: 'USD',
  itemCount: 1,
  lineCount: 1,
  shippingRecipientName: 'Jane Doe',
  shippingCity: 'Phnom Penh',
  shippingLocationPath: null,
  shippingCountryCode: 'KH',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
})

const renderOrders = () =>
  render(
    <MemoryRouter initialEntries={['/account/orders']}>
      <Routes>
        <Route path="/account/orders" element={<Orders />} />
      </Routes>
    </MemoryRouter>,
  )

describe('Orders list status update regression test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('displays Awaiting payment badge for PENDING order in list', async () => {
    fetchOrdersMock.mockResolvedValueOnce([mockSummary('PENDING')])

    renderOrders()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Awaiting payment')).toBeTruthy()
    expect(screen.queryByText('Confirmed')).toBeNull()
  })

  it('updates from Awaiting payment to Confirmed on refetch and stops polling', async () => {
    fetchOrdersMock
      .mockResolvedValueOnce([mockSummary('PENDING')])
      .mockResolvedValueOnce([mockSummary('CONFIRMED')])

    renderOrders()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Awaiting payment')).toBeTruthy()
    expect(fetchOrdersMock).toHaveBeenCalledTimes(1)

    // Advance 10s to trigger polling refetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(fetchOrdersMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Awaiting payment')).toBeNull()
    expect(screen.getByText('Confirmed')).toBeTruthy()

    // Since no pending orders remain, polling stops
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(fetchOrdersMock).toHaveBeenCalledTimes(2)
  })

  it('retains Awaiting payment badge if refetch still returns PENDING', async () => {
    fetchOrdersMock
      .mockResolvedValueOnce([mockSummary('PENDING')])
      .mockResolvedValueOnce([mockSummary('PENDING')])

    renderOrders()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Awaiting payment')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.getByText('Awaiting payment')).toBeTruthy()
    expect(screen.queryByText('Confirmed')).toBeNull()
  })
})
