import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  fetchAdminCodReconciliationRecords,
  fetchAdminCodReconciliationSummary,
} from '@/features/adminCodReconciliation/api'
import { fetchActiveDeliveryStaff } from '@/features/delivery/api'
import type {
  AdminCodReconciliationCurrencyTotal,
  AdminCodReconciliationListDto,
  AdminCodReconciliationSummary,
  DeliveryStaff,
} from '@/types/api'
import CodDashboard from './CodDashboard'

vi.mock('@/features/adminCodReconciliation/api', () => ({
  fetchAdminCodReconciliationRecords: vi.fn(),
  fetchAdminCodReconciliationSummary: vi.fn(),
}))
vi.mock('@/features/delivery/api', () => ({
  fetchActiveDeliveryStaff: vi.fn(),
}))

const recordsMock = vi.mocked(fetchAdminCodReconciliationRecords)
const summaryMock = vi.mocked(fetchAdminCodReconciliationSummary)
const staffMock = vi.mocked(fetchActiveDeliveryStaff)

const renderDashboard = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/cod-dashboard" element={<CodDashboard />} />
      </Routes>
    </MemoryRouter>,
  )

const person = (overrides: Partial<{ id: string; firstName: string; lastName: string; email: string }> = {}) => ({
  id: overrides.id ?? 'person-1',
  firstName: overrides.firstName ?? 'Ada',
  lastName: overrides.lastName ?? 'Lovelace',
  email: overrides.email ?? 'ada@example.test',
})

const listRow = (overrides: Partial<{
  orderId: string
  orderNumber: string | null
  orderStatus: string | null
  paymentMethod: string | null
  expectedAmount: string
  currency: string
  collectedAmount: string | null
  collectionId: string | null
  collectedAt: string | null
  collectedById: string | null
  collectedBy: { id: string; firstName: string; lastName: string; email: string } | null
  discrepancy: boolean
}> = {}): import('@/types/api').AdminCodReconciliationListRow => ({
  orderId: 'order-1',
  orderNumber: 'ORD-1001',
  orderStatus: 'DELIVERED',
  paymentMethod: 'COD',
  expectedAmount: '100.00',
  currency: 'USD',
  collectedAmount: '100.00',
  collectionId: 'collection-1',
  collectedAt: '2026-11-10T08:05:00.000Z',
  collectedById: 'person-1',
  collectedBy: person(),
  discrepancy: false,
  ...overrides,
})

const listDto = (
  items: import('@/types/api').AdminCodReconciliationListRow[],
  overrides: Partial<{
    page: number
    limit: number
    total: number
    totalPages: number
  }> = {},
): import('@/types/api').AdminCodReconciliationListDto => ({
  items,
  pagination: {
    page: 1,
    limit: 20,
    total: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    ...overrides,
  },
})

const currencyTotal = (overrides: Partial<AdminCodReconciliationCurrencyTotal> = {}): AdminCodReconciliationCurrencyTotal => ({
  currency: 'USD',
  collectedAmount: '100.00',
  expectedAmount: '200.00',
  outstandingAmount: '100.00',
  count: 2,
  ...overrides,
})

const summary = (overrides: Partial<AdminCodReconciliationSummary> = {}): AdminCodReconciliationSummary => ({
  totalCollections: 2,
  totalsByCurrency: [currencyTotal()],
  expectedAmountByCurrency: [{ currency: 'USD', totalAmount: '200.00' }],
  outstandingAmountByCurrency: [{ currency: 'USD', totalAmount: '100.00' }],
  collectionCount: 1,
  discrepancyCount: 1,
  firstCollectionAt: '2026-11-10T08:05:00.000Z',
  lastCollectionAt: '2026-11-10T08:05:00.000Z',
  ...overrides,
})

const staffMember = (overrides: Partial<DeliveryStaff> = {}): DeliveryStaff => ({
  id: 'staff-1',
  firstName: 'Courier',
  lastName: 'One',
  email: 'courier@example.test',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  staffMock.mockResolvedValue([staffMember()])
})

afterEach(() => {
  cleanup()
})

describe('COD Dashboard', () => {
  it('renders currency-separated financial summaries from the summary API', async () => {
    summaryMock.mockResolvedValue(summary({
      totalsByCurrency: [
        currencyTotal({ currency: 'USD', expectedAmount: '200.00', collectedAmount: '100.00' }),
        currencyTotal({ currency: 'KHR', expectedAmount: '400000.00', collectedAmount: '200000.00' }),
      ],
    }))
    recordsMock.mockResolvedValue(listDto([]))

    renderDashboard('/admin/cod-dashboard')

    await screen.findAllByText('USD')
    await screen.findAllByText('KHR')
    expect(screen.getByText('Financial summary')).toBeTruthy()
    expect(screen.getAllByText('Expected COD').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collected COD').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Uncollected COD').length).toBeGreaterThan(0)
  })

  it('never combines amounts across currencies', async () => {
    summaryMock.mockResolvedValue(summary({
      totalsByCurrency: [
        currencyTotal({ currency: 'USD', expectedAmount: '200.00' }),
        currencyTotal({ currency: 'KHR', expectedAmount: '400000.00' }),
      ],
    }))
    recordsMock.mockResolvedValue(listDto([]))

    renderDashboard('/admin/cod-dashboard')

    await screen.findAllByText('USD')
    await screen.findAllByText('KHR')
    expect(screen.queryByText('$600.00')).toBeNull()
    expect(screen.queryByText('600000.00')).toBeNull()
  })

  it('renders the order table with collected and uncollected states', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([
      listRow({ collectedAmount: '100.00', discrepancy: false }),
      listRow({
        orderNumber: 'ORD-1002',
        expectedAmount: '200.00',
        collectedAmount: null,
        discrepancy: false,
      }),
    ]))

    renderDashboard('/admin/cod-dashboard')

    await screen.findAllByText('ORD-1001')
    expect(screen.getAllByText('ORD-1002').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collected').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Not collected').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Matched').length).toBeGreaterThan(0)
  })

  it('renders discrepancy states for orders with mismatches', async () => {
    summaryMock.mockResolvedValue(summary({ discrepancyCount: 1 }))
    recordsMock.mockResolvedValue(listDto([
      listRow({
        orderNumber: 'ORD-1003',
        expectedAmount: '100.00',
        collectedAmount: '150.00',
        discrepancy: true,
      }),
    ]))

    renderDashboard('/admin/cod-dashboard')

    await screen.findAllByText('ORD-1003')
    expect(screen.getAllByText('Discrepancy').length).toBeGreaterThan(0)
  })

  it('links each order to the order detail page', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([
      listRow({ orderId: 'order-abc', orderNumber: 'ORD-1001' }),
    ]))

    renderDashboard('/admin/cod-dashboard')

    await screen.findAllByText('ORD-1001')
    const links = screen.getAllByRole('link', { name: /ORD-1001/ })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].getAttribute('href')).toBe('/admin/orders/order-abc')
  })

  it('applies filters via URL search parameters', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([]))

    renderDashboard('/admin/cod-dashboard?status=DELIVERED&currency=USD&page=1&limit=20')

    await waitFor(() =>
      expect(recordsMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DELIVERED', currency: 'USD', page: 1, limit: 20 }),
        expect.anything(),
      ),
    )
  })

  it('resets pagination when filters change', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([]))

    renderDashboard('/admin/cod-dashboard?page=3&status=DELIVERED')

    await screen.findByText('No orders match these filters')
    const statusSelect = screen.getByLabelText('Order status') as HTMLSelectElement
    statusSelect.value = 'SHIPPED'
    fireEvent.change(statusSelect)
    await waitFor(() =>
      expect(recordsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'SHIPPED', page: 1 }),
        expect.anything(),
      ),
    )
  })

  it('paginates: clicking next requests the next page', async () => {
    summaryMock.mockResolvedValue(summary())
    const first = listDto(
      [listRow(), listRow()],
      { page: 1, limit: 10, total: 25, totalPages: 3 },
    )
    const second = listDto(
      [listRow({ orderNumber: 'ORD-1003' }), listRow({ orderNumber: 'ORD-1004' })],
      { page: 2, limit: 10, total: 25, totalPages: 3 },
    )
    recordsMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second)

    renderDashboard('/admin/cod-dashboard?limit=10')

    await screen.findAllByText('ORD-1001')
    expect(screen.getByText(/Page 1 of 3/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }))
    await waitFor(() =>
      expect(recordsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
        expect.anything(),
      ),
    )
    await screen.findAllByText('ORD-1003')
  })

  it('shows a loading state while requests are pending', async () => {
    let resolveSummary!: (value: AdminCodReconciliationSummary) => void
    let resolveRecords!: (value: AdminCodReconciliationListDto) => void
    const summaryPromise = new Promise<AdminCodReconciliationSummary>((resolve) => {
      resolveSummary = resolve
    })
    const recordsPromise = new Promise<AdminCodReconciliationListDto>((resolve) => {
      resolveRecords = resolve
    })
    summaryMock.mockReturnValue(summaryPromise)
    recordsMock.mockReturnValue(recordsPromise)

    renderDashboard('/admin/cod-dashboard')

    expect(screen.getByText('Financial summary')).toBeTruthy()

    await act(async () => {
      resolveSummary(summary())
      resolveRecords(listDto([]))
    })
    await waitFor(() => expect(screen.getByText('No delivered COD orders')).toBeTruthy())
  })

  it('shows an error state with retry after an API failure', async () => {
    const error = new Error('Reconciliation records unavailable')
    recordsMock.mockRejectedValue(error)
    summaryMock.mockResolvedValue(summary())

    renderDashboard('/admin/cod-dashboard')

    expect(await screen.findByText('Something went wrong')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(recordsMock).toHaveBeenCalledTimes(2)
  })

  it('shows an empty state for zero orders', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([]))

    renderDashboard('/admin/cod-dashboard')

    expect(await screen.findByText('No delivered COD orders')).toBeTruthy()
    expect(screen.getByText('Delivered COD orders appear here once a collection window has been processed.')).toBeTruthy()
  })

  it('shows an empty state when filters match nothing', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([]))

    renderDashboard('/admin/cod-dashboard?currency=KHR')

    expect(await screen.findByText('No orders match these filters')).toBeTruthy()
  })

  it('includes a link to the reconciliation history page', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([]))

    renderDashboard('/admin/cod-dashboard')

    await screen.findByText('No delivered COD orders')
    expect(screen.getByRole('link', { name: /Open reconciliation history/i })).toBeTruthy()
  })

  it('fetches delivery staff for the staff filter', async () => {
    summaryMock.mockResolvedValue(summary())
    recordsMock.mockResolvedValue(listDto([]))
    staffMock.mockResolvedValue([
      staffMember({ id: 'staff-1', firstName: 'Courier', lastName: 'One' }),
      staffMember({ id: 'staff-2', firstName: 'Courier', lastName: 'Two' }),
    ])

    renderDashboard('/admin/cod-dashboard')

    await waitFor(() => expect(staffMock).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Courier One')).toBeTruthy()
    expect(screen.getByText('Courier Two')).toBeTruthy()
  })
})
