import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import {
  cancelAdminOrder,
  confirmCodAdminOrder,
  downloadAdminOrderReceipt,
  fetchAdminOrder,
  shipAdminOrder,
} from '@/features/adminOrders/api'
import {
  assignDeliveryToStaff,
  fetchActiveDeliveryStaff,
  fetchDeliveryManagerOrder,
} from '@/features/delivery/api'
import type { AdminOrderDetail, AdminOrderPayment } from '@/types/api'
import type {
  DeliveryAssignment,
  DeliveryManagerOrderDetail,
  DeliveryStaff,
} from '@/types/api'
import OrderDetail from './OrderDetail'

const feedback = vi.hoisted(() => ({
  showFeedback: vi.fn(),
  confirmFeedback: vi.fn(),
}))

vi.mock('@/context/feedbackContext', () => ({
  useFeedback: () => feedback,
}))

vi.mock('@/features/adminOrders/api', () => ({
  cancelAdminOrder: vi.fn(),
  confirmCodAdminOrder: vi.fn(),
  downloadAdminOrderReceipt: vi.fn(),
  fetchAdminOrder: vi.fn(),
  shipAdminOrder: vi.fn(),
}))

vi.mock('@/features/delivery/api', () => ({
  assignDeliveryToStaff: vi.fn(),
  fetchActiveDeliveryStaff: vi.fn(),
  fetchDeliveryManagerOrder: vi.fn(),
}))

const fetchMock = vi.mocked(fetchAdminOrder)
const cancelMock = vi.mocked(cancelAdminOrder)
const confirmCodMock = vi.mocked(confirmCodAdminOrder)
const downloadReceiptMock = vi.mocked(downloadAdminOrderReceipt)
const shipMock = vi.mocked(shipAdminOrder)
const fetchDeliveryOrderMock = vi.mocked(fetchDeliveryManagerOrder)
const fetchDeliveryStaffMock = vi.mocked(fetchActiveDeliveryStaff)
const assignDeliveryMock = vi.mocked(assignDeliveryToStaff)

const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const STAFF_ID = '66666666-6666-4666-8666-666666666666'
const deliveryStaff: DeliveryStaff = {
  id: STAFF_ID,
  firstName: 'Alex',
  lastName: 'Courier',
  email: 'alex@example.test',
}
const activeAssignment: DeliveryAssignment = {
  id: '77777777-7777-4777-8777-777777777777',
  orderId: ORDER_ID,
  deliveryStaffId: STAFF_ID,
  status: 'ASSIGNED',
  assignedAt: '2026-10-01T00:00:00.000Z',
  startedAt: null,
  endedAt: null,
  deliveryStaff,
}

const makeDeliveryOrder = (
  assignments: DeliveryAssignment[] = [],
): DeliveryManagerOrderDetail => ({
  id: ORDER_ID,
  status: 'CONFIRMED',
  deliveryAssignments: assignments,
})

const paidPayment: AdminOrderPayment = {
  id: '33333333-3333-4333-8333-333333333333',
  status: 'PAID',
  provider: 'ABA_PAYWAY',
  amount: '105.00',
  currency: 'USD',
  paidAt: '2026-10-01T01:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  transactionId: 'TXN-20261001-001',
  paymentMethod: 'ABA Pay',
  providerReference: 'REF-20261001-001',
}

const makeDetail = (
  overrides: Partial<AdminOrderDetail> = {},
): AdminOrderDetail => ({
  id: ORDER_ID,
  userId: '22222222-2222-4222-8222-222222222222',
  orderNumber: 'ORD-20261001-AAAAAA',
  status: 'PENDING',
  paymentMethod: 'ABA_PAYWAY',
  subtotal: '100.00',
  shippingFee: '5.00',
  discountAmount: '0.00',
  totalAmount: '105.00',
  currency: 'USD',
  customer: {
    id: '22222222-2222-4222-8222-222222222222',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.test',
  },
  shippingRecipientName: 'Jane Doe',
  shippingPhone: '+855 12 345 678',
  shippingAddressLine1: '12 Street 1',
  shippingAddressLine2: null,
  shippingCity: 'Phnom Penh',
  shippingStateProvince: null,
  shippingLocationPath: null,
  shippingPostalCode: '12000',
  shippingCountryCode: 'KH',
  items: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      orderId: ORDER_ID,
      variantId: '55555555-5555-4555-8555-555555555555',
      productName: 'Silk Shirt',
      sku: 'SKU-001',
      variantOptionsSnapshot: [{ optionName: 'Color', optionValue: 'Black' }],
      unitPrice: '100.00',
      quantity: 1,
      lineTotal: '100.00',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  payments: [],
  codCollection: null,
  itemCount: 1,
  lineCount: 1,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={[`/admin/orders/${ORDER_ID}`]}>
      <Routes>
        <Route path="/admin/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  fetchMock.mockReset()
  cancelMock.mockReset()
  confirmCodMock.mockReset()
  downloadReceiptMock.mockReset()
  shipMock.mockReset()
  fetchDeliveryOrderMock.mockReset()
  fetchDeliveryStaffMock.mockReset()
  assignDeliveryMock.mockReset()
  fetchDeliveryOrderMock.mockResolvedValue(makeDeliveryOrder())
  fetchDeliveryStaffMock.mockResolvedValue([deliveryStaff])
  feedback.showFeedback.mockReset()
  feedback.confirmFeedback.mockReset()
})

afterEach(cleanup)

describe('OrderDetail', () => {
  it('downloads the displayed order receipt as a PDF', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    downloadReceiptMock.mockResolvedValue(blob)
    fetchMock.mockResolvedValue(makeDetail())
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:admin-receipt')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const originalCreateElement = document.createElement.bind(document)
    const createElement = vi.spyOn(document, 'createElement')
    const downloadAnchors: HTMLAnchorElement[] = []
    createElement.mockImplementation((tag: unknown) => {
      const element = originalCreateElement(tag as string)
      if (tag === 'a') downloadAnchors.push(element as HTMLAnchorElement)
      return element
    })

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Download receipt' }))

    await waitFor(() => {
      expect(downloadReceiptMock).toHaveBeenCalledWith(ORDER_ID)
      expect(createObjectURL).toHaveBeenCalledWith(blob)
    })
    expect(anchorClick).toHaveBeenCalled()
    expect(
      downloadAnchors.find((anchor) => anchor.download.endsWith('.pdf'))?.download,
    ).toBe('receipt-ORD-20261001-AAAAAA.pdf')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:admin-receipt')

    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    anchorClick.mockRestore()
    createElement.mockRestore()
  })

  it('shows a loading label while the admin receipt is being downloaded', async () => {
    let resolveDownload!: (blob: Blob) => void
    downloadReceiptMock.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveDownload = resolve
      }),
    )
    fetchMock.mockResolvedValue(makeDetail())

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Download receipt' }))

    const pending = await screen.findByRole('button', {
      name: 'Downloading receipt…',
    })
    expect((pending as HTMLButtonElement).disabled).toBe(true)

    await act(async () => {
      resolveDownload(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))
    })
    expect(
      await screen.findByRole('button', { name: 'Download receipt' }),
    ).toBeTruthy()
  })

  it('shows a receipt download error', async () => {
    downloadReceiptMock.mockRejectedValue(
      new ApiError('Receipt service unavailable', {
        kind: 'server',
        status: 500,
      }),
    )
    fetchMock.mockResolvedValue(makeDetail())

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'Download receipt' }))

    expect(await screen.findByText('Something went wrong on our side. Please try again.')).toBeTruthy()
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Receipt not downloaded',
      }),
    )
  })

  it('shows the customer, shipping snapshot, items, totals and payment state', async () => {
    fetchMock.mockResolvedValue(makeDetail())

    renderDetail()

    expect(await screen.findByText('ORD-20261001-AAAAAA')).toBeTruthy()
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0)
    expect(screen.getByText('jane@example.test')).toBeTruthy()
    expect(screen.getByText('12 Street 1')).toBeTruthy()
    expect(screen.getByText('+855 12 345 678')).toBeTruthy()
    expect(screen.getByText('Silk Shirt')).toBeTruthy()
    expect(screen.getByText('SKU-001')).toBeTruthy()
    expect(screen.getByText('Color: Black')).toBeTruthy()
    expect(screen.getByText('$105.00')).toBeTruthy()
    expect(screen.getAllByText('ABA PayWay').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending payment').length).toBeGreaterThan(0)
    expect(screen.getByText(/no payment attempt/i)).toBeTruthy()
  })

  it('shows COD payment method and Unpaid status when no attempt exists', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({ paymentMethod: 'COD', payments: [], status: 'PENDING' }),
    )

    renderDetail()

    expect(await screen.findByText('ORD-20261001-AAAAAA')).toBeTruthy()
    expect(screen.getAllByText('Cash on Delivery').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0)
    expect(
      (
        screen.getByRole('button', {
          name: 'Confirm COD Order',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)
  })

  it('shows a recorded COD collection without fabricating a paid payment', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({
        status: 'DELIVERED',
        paymentMethod: 'COD',
        payments: [],
        codCollection: {
          status: 'COLLECTED',
          amount: '6.50',
          currency: 'USD',
          collectedAt: '2026-11-01T17:39:58.212Z',
          collector: {
            id: STAFF_ID,
            firstName: 'Alex',
            lastName: 'Courier',
            email: 'alex@example.test',
          },
        },
      }),
    )

    renderDetail()

    expect(await screen.findByText('ORD-20261001-AAAAAA')).toBeTruthy()
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collected').length).toBeGreaterThan(0)
    expect(
      screen.getByText('Cash has been recorded as collected for this order.'),
    ).toBeTruthy()
    expect(screen.getByText('$6.50')).toBeTruthy()
    expect(screen.getByText('Alex Courier')).toBeTruthy()
    expect(screen.getByText('alex@example.test')).toBeTruthy()
    expect(screen.getByText(/no payment attempt/i)).toBeTruthy()
  })

  it('shows Not collected for a COD order with no collection record', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({
        status: 'DELIVERED',
        paymentMethod: 'COD',
        payments: [],
        codCollection: {
          status: 'NOT_COLLECTED',
          amount: null,
          currency: null,
          collectedAt: null,
          collector: null,
        },
      }),
    )

    renderDetail()

    expect(await screen.findByText('ORD-20261001-AAAAAA')).toBeTruthy()
    expect(screen.getAllByText('Not collected').length).toBeGreaterThan(0)
    expect(
      screen.getByText('No COD collection has been recorded for this order yet.'),
    ).toBeTruthy()
    expect(screen.queryByText('$6.50')).toBeNull()
  })

  it('shows paid payment and collected COD independently when both exist', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({
        status: 'DELIVERED',
        paymentMethod: 'COD',
        payments: [{ ...paidPayment, paymentMethod: 'COD' }],
        codCollection: {
          status: 'COLLECTED',
          amount: '105.00',
          currency: 'USD',
          collectedAt: '2026-10-01T01:05:00.000Z',
          collector: {
            id: STAFF_ID,
            firstName: 'Alex',
            lastName: 'Courier',
            email: 'alex@example.test',
          },
        },
      }),
    )

    renderDetail()

    expect(await screen.findByText('ORD-20261001-AAAAAA')).toBeTruthy()
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collected').length).toBeGreaterThan(0)
    expect(screen.getByText('Alex Courier')).toBeTruthy()
  })

  it('does not render a COD collection section for a non-COD order', async () => {
    fetchMock.mockResolvedValue(makeDetail())

    renderDetail()

    expect(await screen.findByText('ORD-20261001-AAAAAA')).toBeTruthy()
    expect(screen.queryByText('COD collection')).toBeNull()
    expect(screen.queryByText('Collected')).toBeNull()
    expect(screen.queryByText('Not collected')).toBeNull()
  })

  it.each([
    [
      'online pending',
      { status: 'PENDING' as const, paymentMethod: 'ABA_PAYWAY' },
    ],
    ['COD confirmed', { status: 'CONFIRMED' as const, paymentMethod: 'COD' }],
    ['COD shipped', { status: 'SHIPPED' as const, paymentMethod: 'COD' }],
  ])('disables COD confirmation for %s orders', async (_label, overrides) => {
    fetchMock.mockResolvedValue(makeDetail(overrides))

    renderDetail()

    const button = await screen.findByRole('button', {
      name: 'Confirm COD Order',
    })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(confirmCodMock).not.toHaveBeenCalled()
  })

  it('confirms an eligible COD order and refreshes the displayed status', async () => {
    const pending = makeDetail({
      status: 'PENDING',
      paymentMethod: 'COD',
      payments: [],
    })
    const confirmed = makeDetail({
      status: 'CONFIRMED',
      paymentMethod: 'COD',
      payments: [],
    })
    fetchMock.mockResolvedValueOnce(pending).mockResolvedValue(confirmed)
    confirmCodMock.mockResolvedValue(confirmed)
    feedback.confirmFeedback.mockResolvedValue(true)

    renderDetail()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Confirm COD Order' }),
    )

    await waitFor(() => expect(confirmCodMock).toHaveBeenCalledWith(ORDER_ID))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'COD order confirmed',
      }),
    )
    expect((await screen.findAllByText('Confirmed')).length).toBeGreaterThan(0)
    expect(
      (
        screen.getByRole('button', {
          name: 'Confirm COD Order',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })

  it('shows confirmation errors from the server', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({ status: 'PENDING', paymentMethod: 'COD', payments: [] }),
    )
    confirmCodMock.mockRejectedValue(
      new ApiError('Order cannot be confirmed', {
        kind: 'conflict',
        status: 409,
      }),
    )
    feedback.confirmFeedback.mockResolvedValue(true)

    renderDetail()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Confirm COD Order' }),
    )

    expect(await screen.findByText('Order cannot be confirmed')).toBeTruthy()
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'COD order not confirmed',
      }),
    )
  })

  it('shows a loading label and disables actions while COD confirmation is in flight', async () => {
    let resolveConfirmation: ((value: AdminOrderDetail) => void) | undefined
    confirmCodMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfirmation = resolve
        }),
    )
    fetchMock.mockResolvedValue(
      makeDetail({ status: 'PENDING', paymentMethod: 'COD', payments: [] }),
    )
    feedback.confirmFeedback.mockResolvedValue(true)

    renderDetail()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Confirm COD Order' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Confirming COD' }),
    ).toBeTruthy()
    expect(
      (
        screen.getByRole('button', {
          name: 'Cancel order',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)

    await act(async () => {
      resolveConfirmation?.(
        makeDetail({ status: 'CONFIRMED', paymentMethod: 'COD', payments: [] }),
      )
    })
  })

  it('disables both actions when the order state does not allow them', async () => {
    fetchMock.mockResolvedValue(makeDetail({ status: 'PENDING' }))

    renderDetail()

    const cancel = await screen.findByRole('button', { name: 'Cancel order' })
    const ship = screen.getByRole('button', { name: 'Mark as shipped' })

    expect((cancel as HTMLButtonElement).disabled).toBe(false)
    expect((ship as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getAllByText(/awaiting payment/i).length).toBeGreaterThan(0)
  })

  it('requires confirmation and refreshes the order after cancelling', async () => {
    const cancelled = makeDetail({ status: 'CANCELLED' })
    fetchMock.mockResolvedValueOnce(makeDetail()).mockResolvedValue(cancelled)
    cancelMock.mockResolvedValue(cancelled)
    feedback.confirmFeedback
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    renderDetail()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }))
    await waitFor(() =>
      expect(feedback.confirmFeedback).toHaveBeenCalledTimes(1),
    )
    expect(cancelMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }))

    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith(ORDER_ID))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Order cancelled' }),
    )
    expect((await screen.findAllByText('Cancelled')).length).toBeGreaterThan(0)
  })

  it('ships a confirmed paid order after confirmation and refreshes it', async () => {
    const confirmed = makeDetail({
      status: 'CONFIRMED',
      payments: [paidPayment],
    })
    const shipped = makeDetail({ status: 'SHIPPED', payments: [paidPayment] })
    fetchMock.mockResolvedValueOnce(confirmed).mockResolvedValue(shipped)
    fetchDeliveryOrderMock.mockResolvedValue(
      makeDeliveryOrder([activeAssignment]),
    )
    shipMock.mockResolvedValue(shipped)
    feedback.confirmFeedback.mockResolvedValue(true)

    renderDetail()

    const cancel = await screen.findByRole('button', { name: 'Cancel order' })
    expect((cancel as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }))

    await waitFor(() => expect(feedback.confirmFeedback).toHaveBeenCalled())
    await waitFor(() => expect(shipMock).toHaveBeenCalledWith(ORDER_ID))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Order shipped' }),
    )
    expect((await screen.findAllByText('Shipped')).length).toBeGreaterThan(0)
  })

  it('ships a confirmed COD order without a payment and refreshes the order', async () => {
    const confirmed = makeDetail({
      status: 'CONFIRMED',
      paymentMethod: 'COD',
      payments: [],
    })
    const shipped = makeDetail({
      status: 'SHIPPED',
      paymentMethod: 'COD',
      payments: [],
    })
    fetchMock.mockResolvedValueOnce(confirmed).mockResolvedValue(shipped)
    fetchDeliveryOrderMock.mockResolvedValue(
      makeDeliveryOrder([activeAssignment]),
    )
    shipMock.mockResolvedValue(shipped)
    feedback.confirmFeedback.mockResolvedValue(true)

    renderDetail()

    expect((await screen.findAllByText('Unpaid')).length).toBeGreaterThan(0)
    const shipButton = screen.getByRole('button', { name: 'Mark as shipped' })
    expect((shipButton as HTMLButtonElement).disabled).toBe(false)
    expect(
      screen.getByText(/payment remains unpaid until collection/i),
    ).toBeTruthy()

    fireEvent.click(shipButton)

    await waitFor(() => expect(shipMock).toHaveBeenCalledWith(ORDER_ID))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Order shipped' }),
    )
    expect((await screen.findAllByText('Shipped')).length).toBeGreaterThan(0)
  })

  it('shows the server error and feedback when an action is refused', async () => {
    fetchMock.mockResolvedValue(makeDetail())
    cancelMock.mockRejectedValue(
      new ApiError(
        'Order has a verified payment and cannot be cancelled without a refund',
        {
          kind: 'conflict',
          status: 409,
        },
      ),
    )
    feedback.confirmFeedback.mockResolvedValue(true)

    renderDetail()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }))

    expect(
      await screen.findByText(
        'Order has a verified payment and cannot be cancelled without a refund',
      ),
    ).toBeTruthy()
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Order not cancelled' }),
    )
  })

  it('requires an active delivery assignment before shipping', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({ status: 'CONFIRMED', paymentMethod: 'COD', payments: [] }),
    )

    renderDetail()

    const shipButton = await screen.findByRole('button', {
      name: 'Mark as shipped',
    })
    expect((shipButton as HTMLButtonElement).disabled).toBe(true)
    expect(
      screen.getByText(
        'Assign an active delivery staff member before shipping.',
      ),
    ).toBeTruthy()
  })

  it('shows assignment loading state and keeps shipping disabled until staff loads', async () => {
    let resolveStaff: ((staff: DeliveryStaff[]) => void) | undefined
    fetchMock.mockResolvedValue(
      makeDetail({ status: 'CONFIRMED', paymentMethod: 'COD', payments: [] }),
    )
    fetchDeliveryStaffMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStaff = resolve
        }),
    )

    renderDetail()

    expect(
      await screen.findByText('Loading delivery assignment data…'),
    ).toBeTruthy()
    expect(
      (
        screen.getByRole('button', {
          name: 'Mark as shipped',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)

    await act(async () => {
      resolveStaff?.([deliveryStaff])
    })

    expect(await screen.findByLabelText('Active delivery staff')).toBeTruthy()
  })

  it('shows active staff, validates a missing selection, then assigns and refreshes all data', async () => {
    const confirmedCod = makeDetail({
      status: 'CONFIRMED',
      paymentMethod: 'COD',
      payments: [],
    })
    fetchMock.mockResolvedValue(confirmedCod)
    fetchDeliveryOrderMock
      .mockResolvedValueOnce(makeDeliveryOrder())
      .mockResolvedValue(makeDeliveryOrder([activeAssignment]))
    assignDeliveryMock.mockResolvedValue(activeAssignment)

    renderDetail()

    const select = await screen.findByLabelText('Active delivery staff')
    expect(
      screen.getByRole('option', { name: 'Alex Courier · alex@example.test' }),
    ).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: 'Assign delivery staff' }),
    )
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Select an active delivery staff member.',
    )
    expect(assignDeliveryMock).not.toHaveBeenCalled()

    fireEvent.change(select, { target: { value: STAFF_ID } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Assign delivery staff' }),
    )

    await waitFor(() =>
      expect(assignDeliveryMock).toHaveBeenCalledWith(ORDER_ID, STAFF_ID),
    )
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchDeliveryOrderMock).toHaveBeenCalledTimes(2)
      expect(fetchDeliveryStaffMock).toHaveBeenCalledTimes(2)
    })
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Delivery staff assigned',
      }),
    )
    expect(await screen.findByText(/Assigned to Alex Courier/i)).toBeTruthy()
  })

  it('shows assignment API errors without refreshing successful state', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({ status: 'CONFIRMED', paymentMethod: 'COD', payments: [] }),
    )
    assignDeliveryMock.mockRejectedValue(
      new ApiError('Order already has an active assignment', {
        kind: 'conflict',
        status: 409,
      }),
    )

    renderDetail()

    fireEvent.change(await screen.findByLabelText('Active delivery staff'), {
      target: { value: STAFF_ID },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Assign delivery staff' }),
    )

    expect(
      await screen.findByText('Order already has an active assignment'),
    ).toBeTruthy()
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Delivery staff not assigned',
      }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('hides assignment controls when an active assignment already exists', async () => {
    fetchMock.mockResolvedValue(
      makeDetail({ status: 'CONFIRMED', paymentMethod: 'COD' }),
    )
    fetchDeliveryOrderMock.mockResolvedValue(
      makeDeliveryOrder([activeAssignment]),
    )

    renderDetail()

    expect(await screen.findByText(/Assigned to Alex Courier/i)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Assign delivery staff' }),
    ).toBeNull()
    expect(
      (
        screen.getByRole('button', {
          name: 'Mark as shipped',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)
  })

  it('prevents a duplicate submission while the first action is in flight', async () => {
    const cancelled = makeDetail({ status: 'CANCELLED' })
    let resolveCancel: ((value: AdminOrderDetail) => void) | undefined

    fetchMock.mockResolvedValueOnce(makeDetail()).mockResolvedValue(cancelled)
    cancelMock.mockImplementation(
      () =>
        new Promise<AdminOrderDetail>((resolve) => {
          resolveCancel = resolve
        }),
    )
    feedback.confirmFeedback.mockResolvedValue(true)

    renderDetail()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel order' }))
    await waitFor(() => expect(cancelMock).toHaveBeenCalledTimes(1))

    const pendingButton = await screen.findByRole('button', {
      name: 'Cancelling',
    })
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(cancelMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveCancel?.(cancelled)
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })
})
