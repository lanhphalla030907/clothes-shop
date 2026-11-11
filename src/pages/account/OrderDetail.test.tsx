import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelOrder, downloadReceipt, fetchOrder } from '@/features/orders/api'
import type { Order } from '@/types/api'
import OrderDetail from './OrderDetail'

const feedback = vi.hoisted(() => ({
  showFeedback: vi.fn(),
  confirmFeedback: vi.fn(),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => feedback,
}))

vi.mock('@/features/orders/api', () => ({
  cancelOrder: vi.fn(),
  downloadReceipt: vi.fn(),
  fetchOrder: vi.fn(),
}))

const fetchOrderMock = vi.mocked(fetchOrder)
const cancelOrderMock = vi.mocked(cancelOrder)
const downloadReceiptMock = vi.mocked(downloadReceipt)

const mockOrder = (
  status: Order['status'],
  paymentMethod: Order['paymentMethod'] = 'ABA_PAYWAY',
): Order => ({
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  orderNumber: 'ORD-TEST-001',
  status,
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
      orderId: '11111111-1111-4111-8111-111111111111',
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

const renderDetail = (id = '11111111-1111-4111-8111-111111111111', state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: `/dashboard/orders/${id}`, state }]}>
      <Routes>
        <Route path="/dashboard/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  )

describe('OrderDetail status update regression test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('initially displays Awaiting payment for PENDING order', async () => {
    fetchOrderMock.mockResolvedValueOnce(mockOrder('PENDING'))

    renderDetail()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0)
    expect(screen.queryByText('Payment received.')).toBeNull()
  })

  it('does not offer PayWay for a pending COD order', async () => {
    fetchOrderMock.mockResolvedValueOnce(mockOrder('PENDING', 'COD'))

    renderDetail()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Cash on Delivery')).toBeTruthy()
    expect(screen.getByText(/Payment has not yet been collected/)).toBeTruthy()
    expect(screen.queryByText('Pay this order')).toBeNull()
    expect(screen.queryByText(/ABA PayWay QR/)).toBeNull()
  })

  it('does not describe a confirmed COD order as paid', async () => {
    fetchOrderMock.mockResolvedValueOnce(mockOrder('CONFIRMED', 'COD'))

    renderDetail()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Order confirmed.')).toBeTruthy()
    expect(screen.getByText(/Payment collection has not been recorded/)).toBeTruthy()
    expect(screen.queryByText('Payment received.')).toBeNull()
    expect(screen.queryByText(/PayWay confirmed/)).toBeNull()
  })

  it('does not label an unsupported payment method as received', async () => {
    fetchOrderMock.mockResolvedValueOnce(mockOrder('CONFIRMED', 'BANK_TRANSFER'))

    renderDetail()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Order confirmed.')).toBeTruthy()
    expect(screen.getByText(/cannot confirm payment for its unsupported payment method/)).toBeTruthy()
    expect(screen.queryByText('Payment received.')).toBeNull()
  })

  it('updates from Awaiting payment to Payment received when refetched data is CONFIRMED and stops polling', async () => {
    fetchOrderMock
      .mockResolvedValueOnce(mockOrder('PENDING'))
      .mockResolvedValueOnce(mockOrder('CONFIRMED'))

    renderDetail()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0)
    expect(fetchOrderMock).toHaveBeenCalledTimes(1)

    // Advance 10 seconds to trigger polling refetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(fetchOrderMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Awaiting payment')).toBeNull()
    expect(screen.getByText('Payment received.')).toBeTruthy()
    expect(screen.getByText('Confirmed')).toBeTruthy()

    // Polling stops when order reaches terminal state (CONFIRMED)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(fetchOrderMock).toHaveBeenCalledTimes(2)
  })

  it('does not display Payment received when payment remains unverified (still PENDING)', async () => {
    fetchOrderMock
      .mockResolvedValueOnce(mockOrder('PENDING'))
      .mockResolvedValueOnce(mockOrder('PENDING'))

    renderDetail()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0)

    // Advance 10 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0)
    expect(screen.queryByText('Payment received.')).toBeNull()
    expect(screen.queryByText('Confirmed')).toBeNull()
  })

  it('transitions to Cancelled and never appears successful when order is CANCELLED', async () => {
    fetchOrderMock
      .mockResolvedValueOnce(mockOrder('PENDING'))
      .mockResolvedValueOnce(mockOrder('CANCELLED'))

    renderDetail()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0)

    // Advance 10 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.queryByText('Awaiting payment')).toBeNull()
    expect(screen.queryByText('Payment received.')).toBeNull()
    expect(screen.getByText('Cancelled')).toBeTruthy()

    // Polling stops for CANCELLED terminal state
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(fetchOrderMock).toHaveBeenCalledTimes(2)
  })
})

describe('OrderDetail cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    feedback.confirmFeedback.mockResolvedValue(true)
  })

  afterEach(() => {
    cleanup()
  })

  it('offers cancellation only for a pending order', async () => {
    fetchOrderMock.mockResolvedValue(mockOrder('PENDING'))

    renderDetail()

    expect(
      await screen.findByRole('button', { name: /cancel this order/i }),
    ).toBeTruthy()
  })

  it.each(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const)(
    'does not offer cancellation for a %s order',
    async (status) => {
      fetchOrderMock.mockResolvedValue(mockOrder(status))

      renderDetail()

      expect(await screen.findByText('ORD-TEST-001')).toBeTruthy()
      expect(
        screen.queryByRole('button', { name: /cancel this order/i }),
      ).toBeNull()
    },
  )

  it('asks for confirmation and refreshes the order after a successful cancellation', async () => {
    fetchOrderMock
      .mockResolvedValueOnce(mockOrder('PENDING'))
      .mockResolvedValueOnce(mockOrder('CANCELLED'))
    cancelOrderMock.mockResolvedValue(mockOrder('CANCELLED'))

    renderDetail()

    const button = await screen.findByRole('button', {
      name: /cancel this order/i,
    })
    fireEvent.click(button)

    await waitFor(() => {
      expect(feedback.confirmFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Cancel this order?' }),
      )
    })
    await waitFor(() => {
      expect(cancelOrderMock).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
      )
    })
    await waitFor(() => {
      expect(fetchOrderMock).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByText('Cancelled')).toBeTruthy()
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Order cancelled' }),
    )
  })

  it('does not cancel when the customer dismisses the confirmation', async () => {
    feedback.confirmFeedback.mockResolvedValue(false)
    fetchOrderMock.mockResolvedValue(mockOrder('PENDING'))

    renderDetail()

    fireEvent.click(
      await screen.findByRole('button', { name: /cancel this order/i }),
    )

    await waitFor(() => {
      expect(feedback.confirmFeedback).toHaveBeenCalledTimes(1)
    })
    expect(cancelOrderMock).not.toHaveBeenCalled()
  })

  it('shows a loading state and disables the action while cancellation is in flight', async () => {
    fetchOrderMock
      .mockResolvedValueOnce(mockOrder('PENDING'))
      .mockResolvedValueOnce(mockOrder('CANCELLED'))

    let resolveCancellation: (order: Order) => void = () => undefined
    cancelOrderMock.mockReturnValue(
      new Promise<Order>((resolve) => {
        resolveCancellation = resolve
      }),
    )

    renderDetail()

    fireEvent.click(
      await screen.findByRole('button', { name: /cancel this order/i }),
    )

    const pendingButton = await screen.findByRole('button', {
      name: /cancelling/i,
    })
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true)

    await act(async () => {
      resolveCancellation(mockOrder('CANCELLED'))
    })

    await waitFor(() => {
      expect(fetchOrderMock).toHaveBeenCalledTimes(2)
    })
  })

  it('reports a rejected cancellation and leaves the order visible', async () => {
    fetchOrderMock.mockResolvedValue(mockOrder('PENDING'))
    cancelOrderMock.mockRejectedValue(new Error('cancellation refused'))

    renderDetail()

    fireEvent.click(
      await screen.findByRole('button', { name: /cancel this order/i }),
    )

    await waitFor(() => {
      expect(feedback.showFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Order not cancelled',
        }),
      )
    })
    expect(screen.getByText('ORD-TEST-001')).toBeTruthy()
  })
})

describe('OrderDetail receipt download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  const renderWithOrder = (status: Order['status'] = 'CONFIRMED') => {
    fetchOrderMock.mockResolvedValue(mockOrder(status))
    downloadReceiptMock.mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
    renderDetail()
  }

  it('offers a download receipt button', async () => {
    renderWithOrder()

    expect(
      await screen.findByRole('button', { name: /download receipt/i }),
    ).toBeTruthy()
  })

  it('requests the receipt for the displayed order', async () => {
    renderWithOrder()

    const button = await screen.findByRole('button', { name: /download receipt/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(downloadReceiptMock).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
      )
    })
  })

  it('disables the button and shows a loading label while the download is in flight', async () => {
    let resolveDownload!: (blob: Blob) => void
    downloadReceiptMock.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveDownload = resolve
      }),
    )
    fetchOrderMock.mockResolvedValue(mockOrder('CONFIRMED'))

    renderDetail()

    const button = await screen.findByRole('button', { name: /download receipt/i })
    fireEvent.click(button)

    const pending = await screen.findByRole('button', { name: /downloading/i })
    expect((pending as HTMLButtonElement).disabled).toBe(true)

    await act(async () => {
      resolveDownload(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
    })

    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: /download receipt/i }) as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
  })

  it('does not start a second download while one is in flight', async () => {
    downloadReceiptMock.mockReturnValue(new Promise<Blob>(() => {}))
    fetchOrderMock.mockResolvedValue(mockOrder('CONFIRMED'))

    renderDetail()

    const button = await screen.findByRole('button', { name: /download receipt/i })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(downloadReceiptMock).toHaveBeenCalledTimes(1)
  })

  it('reports an error when the receipt cannot be downloaded', async () => {
    downloadReceiptMock.mockRejectedValue(new Error('receipt unavailable'))
    fetchOrderMock.mockResolvedValue(mockOrder('CONFIRMED'))

    renderDetail()

    fireEvent.click(await screen.findByRole('button', { name: /download receipt/i }))

    await waitFor(() => {
      expect(feedback.showFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Receipt not downloaded',
        }),
      )
    })
  })

  it('triggers a browser download: object URL, anchor click, then revoke', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    downloadReceiptMock.mockResolvedValue(blob)
    fetchOrderMock.mockResolvedValue(mockOrder('CONFIRMED'))

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake/receipt.pdf')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
    let createdAnchor: HTMLAnchorElement | null = null
    createElementSpy.mockImplementation((tag: unknown) => {
      const el = originalCreateElement(tag as string)
      if (tag === 'a') createdAnchor = el as HTMLAnchorElement
      return el
    })

    renderDetail()

    const button = await screen.findByRole('button', { name: /download receipt/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
    })

    expect(createdAnchor).toBeTruthy()
    expect(createdAnchor!.download).toBe('receipt-ORD-TEST-001.pdf')
    expect(createdAnchor!.href).toBe('blob:fake/receipt.pdf')
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake/receipt.pdf')

    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    clickSpy.mockRestore()
    createElementSpy.mockRestore()
  })
})

describe('OrderDetail progress timeline and layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders progress timeline for a SHIPPED order without marking Out for Delivery as active', async () => {
    const shippedOrder: Order = {
      ...mockOrder('SHIPPED', 'ABA_PAYWAY'),
      shippingProviderName: 'Phnom Penh Express',
      shippingProviderCode: 'PP_EXP',
    }
    fetchOrderMock.mockResolvedValue(shippedOrder)

    renderDetail()

    expect(await screen.findByText('Order Progress')).toBeTruthy()
    expect(screen.getAllByText('Order Placed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Order Confirmed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Processing').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Shipped / In Transit').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Out for Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Order Delivered').length).toBeGreaterThan(0)

    // Carrier name from real backend API is displayed
    expect(screen.getAllByText(/Carrier: Phnom Penh Express/).length).toBeGreaterThan(0)

    // Out for delivery is NOT claimed to be active
    expect(screen.getAllByText('Local courier dispatch').length).toBeGreaterThan(0)
  })

  it('renders delivered state when order status is DELIVERED', async () => {
    fetchOrderMock.mockResolvedValue(mockOrder('DELIVERED'))

    renderDetail()

    expect(await screen.findByText('Order Progress')).toBeTruthy()
    expect(screen.getAllByText('Package received').length).toBeGreaterThan(0)
  })

  it('renders dedicated cancelled banner and not the active delivery pipeline when order is CANCELLED', async () => {
    fetchOrderMock.mockResolvedValue(mockOrder('CANCELLED'))

    renderDetail()

    expect(await screen.findByText('Order Cancelled')).toBeTruthy()
    expect(
      screen.getByText(
        /This order was cancelled and its fulfillment was stopped. Any reserved stock has been released./,
      ),
    ).toBeTruthy()
    // Standard progress timeline heading is absent
    expect(screen.queryByText('Order Progress')).toBeNull()
  })

  it('displays carrier and delivery area when available on order snapshot', async () => {
    const orderWithCarrier: Order = {
      ...mockOrder('CONFIRMED'),
      shippingProviderName: 'Cambodia Post',
      codAreaName: 'Central Phnom Penh Zone 1',
    }
    fetchOrderMock.mockResolvedValue(orderWithCarrier)

    renderDetail()

    expect(await screen.findByText('Delivery Details')).toBeTruthy()
    expect(screen.getByText('Cambodia Post')).toBeTruthy()
    expect(screen.getByText('Central Phnom Penh Zone 1')).toBeTruthy()
  })
})
