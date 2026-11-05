import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import DeliveryDashboard from './DeliveryDashboard'
import {
  collectMyCod,
  fetchMyAssignment,
  fetchMyAssignments,
  fetchMyCodCollections,
  fetchMyCodCollectionsSummary,
  updateMyAssignmentStatus,
} from '@/features/deliveryStaff/api'
import type {
  CodCollection,
  CodCollectionPage,
  CodCollectionsSummary,
  DeliveryAssignmentPage,
  DeliveryStaffAssignment,
  DeliveryStaffAssignmentDetail,
} from '@/types/api'

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    user: { firstName: 'Ada', lastName: 'Courier' },
  }),
  displayName: (user: { firstName: string; lastName: string } | null) =>
    user ? `${user.firstName} ${user.lastName}` : '',
}))

vi.mock('@/features/deliveryStaff/api', () => ({
  collectMyCod: vi.fn(),
  fetchMyAssignment: vi.fn(),
  fetchMyAssignments: vi.fn(),
  fetchMyCodCollections: vi.fn(),
  fetchMyCodCollectionsSummary: vi.fn(),
  updateMyAssignmentStatus: vi.fn(),
}))

const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const ASSIGNMENT_ID = '22222222-2222-4222-8222-222222222222'
const STAFF_ID = '33333333-3333-4333-8333-333333333333'
const CUSTOMER_ID = '44444444-4444-4444-8444-444444444444'

const order = {
  id: ORDER_ID,
  userId: CUSTOMER_ID,
  orderNumber: 'ORD-DEL-001',
  status: 'SHIPPED',
  paymentMethod: 'COD',
  subtotal: '125.00',
  shippingFee: '5.00',
  discountAmount: '0.00',
  totalAmount: '130.00',
  currency: 'USD',
  itemCount: 1,
  shippingRecipientName: 'Customer Example',
  shippingPhone: '+85512345678',
  shippingAddressLine1: '12 Riverside Road',
  shippingAddressLine2: null,
  shippingCity: 'Phnom Penh',
  shippingLocationPath: null,
  shippingStateProvince: null,
  shippingPostalCode: null,
  shippingCountryCode: 'KH',
  items: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      orderId: ORDER_ID,
      variantId: '66666666-6666-4666-8666-666666666666',
      productName: 'Linen Shirt',
      sku: 'LINEN-001',
      variantOptionsSnapshot: [{ optionName: 'Size', optionValue: 'M' }],
      unitPrice: '125.00',
      quantity: 1,
      lineTotal: '125.00',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  user: {
    id: CUSTOMER_ID,
    firstName: 'Customer',
    lastName: 'Example',
    email: 'customer@example.test',
    phone: '+85512345678',
  },
} satisfies DeliveryStaffAssignment['order']

const assignment: DeliveryStaffAssignment = {
  id: ASSIGNMENT_ID,
  orderId: ORDER_ID,
  deliveryStaffId: STAFF_ID,
  status: 'ASSIGNED',
  assignedAt: '2026-10-01T00:00:00.000Z',
  startedAt: null,
  endedAt: null,
  deliveryStaff: {
    id: STAFF_ID,
    firstName: 'Ada',
    lastName: 'Courier',
    email: 'ada@example.test',
  },
  assignedBy: null,
  order,
}

const assignmentPage: DeliveryAssignmentPage = {
  items: [assignment],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
}

const detail: DeliveryStaffAssignmentDetail = {
  id: ASSIGNMENT_ID,
  orderId: ORDER_ID,
  deliveryStaffId: STAFF_ID,
  status: 'ASSIGNED',
  assignedAt: '2026-10-01T00:00:00.000Z',
  startedAt: null,
  endedAt: null,
  deliveredAt: null,
  deliveryStaff: assignment.deliveryStaff,
  assignedBy: null,
  order: {
    id: ORDER_ID,
    userId: CUSTOMER_ID,
    orderNumber: 'ORD-DEL-001',
    status: 'SHIPPED',
    paymentMethod: 'COD',
    subtotal: '125.00',
    shippingFee: '5.00',
    discountAmount: '0.00',
    totalAmount: '130.00',
    currency: 'USD',
    itemCount: 1,
    shippingRecipientName: 'Customer Example',
    shippingPhone: '+85512345678',
    shippingAddressLine1: '12 Riverside Road',
    shippingAddressLine2: null,
    shippingCity: 'Phnom Penh',
    shippingLocationPath: null,
    shippingStateProvince: null,
    shippingPostalCode: null,
    shippingCountryCode: 'KH',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
}

const collection: CodCollection = {
  collectionId: '77777777-7777-4777-8777-777777777777',
  orderId: ORDER_ID,
  orderNumber: 'ORD-DEL-001',
  amount: '130.00',
  currency: 'USD',
  collectedAt: '2026-10-01T01:00:00.000Z',
  collectedById: STAFF_ID,
  notes: 'Paid in cash',
  receiptProof: null,
}

const collectionsPage: CodCollectionPage = {
  items: [collection],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
}

const summary: CodCollectionsSummary = {
  totalCollections: 1,
  totalsByCurrency: [{ currency: 'USD', totalAmount: '130.00', count: 1 }],
  firstCollectionAt: collection.collectedAt,
  lastCollectionAt: collection.collectedAt,
  periodBreakdown: [],
}

const fetchAssignmentsMock = vi.mocked(fetchMyAssignments)
const fetchAssignmentMock = vi.mocked(fetchMyAssignment)
const fetchCollectionsMock = vi.mocked(fetchMyCodCollections)
const fetchSummaryMock = vi.mocked(fetchMyCodCollectionsSummary)
const updateStatusMock = vi.mocked(updateMyAssignmentStatus)
const collectCodMock = vi.mocked(collectMyCod)

beforeEach(() => {
  vi.clearAllMocks()
  fetchAssignmentsMock.mockResolvedValue(assignmentPage)
  fetchAssignmentMock.mockResolvedValue(detail)
  fetchCollectionsMock.mockResolvedValue(collectionsPage)
  fetchSummaryMock.mockResolvedValue(summary)
  updateStatusMock.mockResolvedValue(undefined)
  collectCodMock.mockResolvedValue(collection)
})

afterEach(cleanup)

const openAssignment = async () => {
  render(<DeliveryDashboard />)
  fireEvent.click(await screen.findByRole('button', { name: /ORD-DEL-001/ }))
  await screen.findByRole('heading', { name: 'Delivery details' })
  expect(screen.getByRole('region', { name: 'Assignment details' }).textContent).toContain('Update delivery status')
  await screen.findByLabelText(/Next status/)
}

describe('DeliveryDashboard', () => {
  it('loads the staff assignment list, collection history, and per-currency summary', async () => {
    render(<DeliveryDashboard />)

    expect((await screen.findAllByText('ORD-DEL-001')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('$130.00')).length).toBeGreaterThan(0)
    expect(screen.getByText('USD collected · 1')).toBeTruthy()
    expect(screen.getByText('Paid in cash')).toBeTruthy()
    expect(fetchMyAssignments).toHaveBeenCalledWith(
      { status: undefined, page: 1, limit: 10 },
      expect.any(AbortSignal),
    )
    expect(fetchMyCodCollections).toHaveBeenCalledWith(1, 10, expect.any(AbortSignal))
    expect(fetchMyCodCollectionsSummary).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it('shows loading and API error states for assignments', async () => {
    let resolveList!: (value: DeliveryAssignmentPage) => void
    fetchAssignmentsMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve
      }),
    )
    render(<DeliveryDashboard />)
    expect(screen.getByLabelText('Loading assignments')).toBeTruthy()

    resolveList(assignmentPage)
    expect((await screen.findAllByText('ORD-DEL-001')).length).toBeGreaterThan(0)

    fetchAssignmentsMock.mockRejectedValueOnce(new Error('Network failed'))
    fireEvent.change(screen.getByLabelText('Filter by delivery status'), {
      target: { value: 'OUT_FOR_DELIVERY' },
    })
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
  })

  it('filters assignments by a backend delivery status and paginates', async () => {
    render(<DeliveryDashboard />)
    await screen.findAllByText('ORD-DEL-001')

    fireEvent.change(screen.getByLabelText('Filter by delivery status'), {
      target: { value: 'OUT_FOR_DELIVERY' },
    })

    await waitFor(() =>
      expect(fetchAssignmentsMock).toHaveBeenLastCalledWith(
        { status: 'OUT_FOR_DELIVERY', page: 1, limit: 10 },
        expect.any(AbortSignal),
      ),
    )
    const filter = screen.getByLabelText('Filter by delivery status') as HTMLSelectElement
    expect(Array.from(filter.options).map((option) => option.value)).toEqual([
      '',
      'PENDING_ASSIGNMENT',
      'ASSIGNED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED_DELIVERY',
      'RETURNED',
    ])
  })

  it('loads assignment details and offers only valid next status transitions', async () => {
    await openAssignment()

    expect(await screen.findByText('customer@example.test')).toBeTruthy()
    expect(screen.getByText('12 Riverside Road')).toBeTruthy()
    expect(screen.getByText('Linen Shirt')).toBeTruthy()
    expect(screen.getByText(/Size: M.*Qty 1/)).toBeTruthy()
    expect(screen.getByText('COD')).toBeTruthy()
    expect(fetchAssignmentMock).toHaveBeenCalledWith(ASSIGNMENT_ID, expect.any(AbortSignal))

    const statusSelect = screen.getByLabelText(/Next status/) as HTMLSelectElement
    expect(Array.from(statusSelect.options).map((option) => option.value)).toEqual([
      'OUT_FOR_DELIVERY',
      'FAILED_DELIVERY',
      'RETURNED',
    ])
    expect(screen.queryByRole('option', { name: 'DELIVERED' })).toBeNull()
  })

  it('updates status, reports success, and refreshes assignment and detail data', async () => {
    await openAssignment()

    fireEvent.change(screen.getByLabelText(/Next status/), {
      target: { value: 'OUT_FOR_DELIVERY' },
    })
    fireEvent.change(screen.getByLabelText('Notes (optional)'), {
      target: { value: 'Package is with courier' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }))

    await waitFor(() =>
      expect(updateStatusMock).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        'OUT_FOR_DELIVERY',
        'Package is with courier',
      ),
    )
    expect(await screen.findByText('Assignment updated to Out For Delivery.')).toBeTruthy()
    await waitFor(() => {
      expect(fetchAssignmentsMock).toHaveBeenCalledTimes(2)
      expect(fetchAssignmentMock).toHaveBeenCalledTimes(2)
    })
  })

  it('offers DELIVERED only from OUT_FOR_DELIVERY and completes through the status API', async () => {
    const outForDelivery: DeliveryStaffAssignmentDetail = {
      ...detail,
      status: 'OUT_FOR_DELIVERY',
      startedAt: '2026-10-01T00:30:00.000Z',
    }
    const deliveredAt = '2026-10-01T01:15:00.000Z'
    const delivered: DeliveryStaffAssignmentDetail = {
      ...outForDelivery,
      status: 'DELIVERED',
      endedAt: deliveredAt,
      deliveredAt,
    }
    fetchAssignmentMock
      .mockResolvedValueOnce(outForDelivery)
      .mockResolvedValueOnce(delivered)

    await openAssignment()
    const statusSelect = screen.getByLabelText(/Next status/) as HTMLSelectElement
    expect(Array.from(statusSelect.options).map((option) => option.value)).toEqual([
      'DELIVERED',
      'FAILED_DELIVERY',
      'RETURNED',
    ])

    fireEvent.change(statusSelect, { target: { value: 'DELIVERED' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }))

    await waitFor(() =>
      expect(updateStatusMock).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        'DELIVERED',
        undefined,
      ),
    )
    expect(await screen.findByText('Assignment updated to Delivered.')).toBeTruthy()
    expect(await screen.findByText(/Delivered at/)).toBeTruthy()
    expect(screen.getByText('Oct 1, 2026, 8:15 AM')).toBeTruthy()
    expect(collectCodMock).not.toHaveBeenCalled()
  })

  it('records COD with amount, currency, notes, and optional receipt proof, then refreshes collections', async () => {
    await openAssignment()
    const receipt = new File(['proof'], 'receipt.png', { type: 'image/png' })

    fireEvent.change(screen.getByLabelText(/Amount \(USD\)/), {
      target: { value: '130.00' },
    })
    fireEvent.change(screen.getByLabelText('Receipt proof (optional)'), {
      target: { files: [receipt] },
    })
    fireEvent.change(screen.getByLabelText('Collection notes (optional)'), {
      target: { value: 'Cash received' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Record collection' }))

    await waitFor(() => expect(collectCodMock).toHaveBeenCalledTimes(1))
    const [assignmentId, body] = collectCodMock.mock.calls[0]!
    expect(assignmentId).toBe(ASSIGNMENT_ID)
    expect(body).toMatchObject({
      amount: '130.00',
      currency: 'USD',
      notes: 'Cash received',
      receiptProof: receipt,
    })
    expect(await screen.findByText('COD collection recorded successfully.')).toBeTruthy()
    await waitFor(() => {
      expect(fetchMyCodCollections).toHaveBeenCalledTimes(2)
      expect(fetchMyCodCollectionsSummary).toHaveBeenCalledTimes(2)
    })
  })

  it('displays backend validation errors and empty assignment states', async () => {
    fetchAssignmentsMock.mockResolvedValueOnce({
      items: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    })
    render(<DeliveryDashboard />)
    expect(await screen.findByText('Nothing assigned yet')).toBeTruthy()
  })

  it('shows the API validation response when a status transition is rejected', async () => {
    updateStatusMock.mockRejectedValueOnce(new ApiError(
      'Invalid status transition from ASSIGNED to DELIVERED',
      { kind: 'validation', status: 400 },
    ))
    await openAssignment()
    fireEvent.change(screen.getByLabelText(/Next status/), {
      target: { value: 'OUT_FOR_DELIVERY' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }))

    expect(await screen.findByText('Invalid status transition from ASSIGNED to DELIVERED')).toBeTruthy()
  })
})
