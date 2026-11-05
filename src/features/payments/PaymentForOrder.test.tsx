import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useOrder } from '@/features/orders/useOrders'
import type { Order, Payment } from '@/types/api'
import { createPayment } from './api'
import { PaymentForOrder } from './PaymentForOrder'

vi.mock('@/features/orders/useOrders', () => ({
  useOrder: vi.fn(),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => ({ showFeedback: vi.fn() }),
}))

vi.mock('./api', () => ({
  createPayment: vi.fn(),
  isProviderUnavailable: vi.fn(() => false),
}))

const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const useOrderMock = vi.mocked(useOrder)
const createPaymentMock = vi.mocked(createPayment)

const makeOrder = (paymentMethod: Order['paymentMethod']): Order => ({
  id: ORDER_ID,
  userId: '22222222-2222-4222-8222-222222222222',
  orderNumber: 'ORD-TEST-001',
  status: 'PENDING',
  paymentMethod,
  subtotal: '100.00',
  shippingFee: '0.00',
  discountAmount: '0.00',
  totalAmount: '100.00',
  currency: 'USD',
  itemCount: 1,
  shippingRecipientName: 'Jane Doe',
  shippingPhone: '+85512345678',
  shippingAddressLine1: 'Street 1',
  shippingAddressLine2: null,
  shippingCity: 'Phnom Penh',
  shippingStateProvince: null,
  shippingLocationPath: null,
  shippingPostalCode: null,
  shippingCountryCode: 'KH',
  items: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      orderId: ORDER_ID,
      variantId: '44444444-4444-4444-8444-444444444444',
      productName: 'Silk Shirt',
      sku: 'SKU-001',
      variantOptionsSnapshot: [],
      unitPrice: '100.00',
      quantity: 1,
      lineTotal: '100.00',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
})

const payment: Payment = {
  paymentId: '55555555-5555-4555-8555-555555555555',
  orderId: ORDER_ID,
  transactionId: 'TX-TEST-001',
  status: 'PENDING',
  amount: '100.00',
  currency: 'USD',
  qrString: 'test-qr-payload',
}

const renderPayment = (paymentMethod: Order['paymentMethod']) => {
  useOrderMock.mockReturnValue({
    data: makeOrder(paymentMethod),
    error: undefined,
    isLoading: false,
    isRefreshing: false,
    refetch: vi.fn(),
  })

  return render(
    <MemoryRouter>
      <PaymentForOrder orderId={ORDER_ID} />
    </MemoryRouter>,
  )
}

describe('PaymentForOrder payment-method branching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createPaymentMock.mockResolvedValue(payment)
  })

  afterEach(() => {
    cleanup()
  })

  it('does not start PayWay or render QR UI for a pending COD order', async () => {
    renderPayment('COD')

    expect(screen.getByRole('heading', { name: 'Cash on Delivery' })).toBeTruthy()
    expect(screen.getByText(/Payment has not yet been collected/)).toBeTruthy()
    expect(screen.queryByText('Show the QR code')).toBeNull()
    expect(screen.queryByText('Copy the payload')).toBeNull()
    await waitFor(() => expect(createPaymentMock).not.toHaveBeenCalled())
  })

  it.each(['ABA_PAYWAY', null] as const)(
    'preserves automatic PayWay initialization for payment method %s',
    async (paymentMethod) => {
      renderPayment(paymentMethod)

      await waitFor(() => expect(createPaymentMock).toHaveBeenCalledTimes(1))
      expect(await screen.findByText('Copy the payload')).toBeTruthy()
    },
  )

  it('does not start PayWay for an unexpected non-null payment method', async () => {
    renderPayment('BANK_TRANSFER')

    expect(screen.getByText(/payment method this page cannot process/)).toBeTruthy()
    expect(screen.queryByText('Show the QR code')).toBeNull()
    await waitFor(() => expect(createPaymentMock).not.toHaveBeenCalled())
  })
})
