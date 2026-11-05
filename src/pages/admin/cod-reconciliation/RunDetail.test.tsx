import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type {
  AdminCodReconciliationCurrencySummary,
  AdminCodReconciliationRunDetail,
  AdminCodReconciliationRunSnapshotItem,
} from '@/types/api'
import { fetchAdminCodReconciliationRun } from '@/features/adminCodReconciliation/api'
import * as useAsyncResourceModule from '@/hooks/useAsyncResource'
import RunDetail from './RunDetail'

vi.mock('@/features/adminCodReconciliation/api', () => ({
  fetchAdminCodReconciliationRun: vi.fn(),
}))

const fetchMock = vi.mocked(fetchAdminCodReconciliationRun)

const renderDetail = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/cod-reconciliation/runs/:id" element={<RunDetail />} />
      </Routes>
    </MemoryRouter>,
  )

const person = (overrides: Partial<{ id: string; firstName: string; lastName: string; email: string }> = {}) => ({
  id: overrides.id ?? 'person-1',
  firstName: overrides.firstName ?? 'Ada',
  lastName: overrides.lastName ?? 'Lovelace',
  email: overrides.email ?? 'ada@example.test',
})

const snapshotItem = (overrides: Partial<AdminCodReconciliationRunSnapshotItem> = {}): AdminCodReconciliationRunSnapshotItem => ({
  id: 'item-1',
  orderId: 'order-1',
  orderNumber: 'ORD-1001',
  orderStatus: 'DELIVERED',
  paymentMethod: 'COD',
  currency: 'USD',
  expectedAmount: '10.10',
  collectedAmount: '10.10',
  collectionCurrency: 'USD',
  collectionId: 'collection-1',
  collectedAt: '2026-11-10T08:05:00.000Z',
  collectedById: 'person-1',
  collectedBy: person(),
  deliveryStaffId: 'person-2',
  deliveryStaff: person({ id: 'person-2', firstName: 'Courier', lastName: 'One' }),
  deliveredAt: '2026-11-10T08:00:00.000Z',
  assignmentId: 'assignment-1',
  discrepancy: false,
  discrepancyType: null,
  discrepancyExplanation: null,
  ...overrides,
})

const currencySummary = (overrides: Partial<AdminCodReconciliationCurrencySummary> = {}): AdminCodReconciliationCurrencySummary => ({
  currency: 'USD',
  expectedCount: 2,
  expectedAmount: '30.30',
  matchedCount: 1,
  discrepancyCount: 1,
  collectedCount: 1,
  collectedAmount: '10.10',
  ...overrides,
})

const detail = (overrides: Partial<AdminCodReconciliationRunDetail> = {}): AdminCodReconciliationRunDetail => ({
  id: 'run-1',
  triggerType: 'manual',
  status: 'completed',
  windowStart: '2026-10-01T00:00:00.000Z',
  windowEnd: '2026-10-02T00:00:00.000Z',
  processedCount: 4,
  matchedCount: 1,
  discrepancyCount: 3,
  uncollectedCount: 1,
  errorMessage: null,
  startedAt: '2026-10-02T01:00:00.000Z',
  completedAt: '2026-10-02T01:01:00.000Z',
  createdAt: '2026-10-02T01:00:00.000Z',
  hasSnapshot: true,
  items: [snapshotItem()],
  summaryByCurrency: [currencySummary()],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  ...overrides,
})

beforeEach(() => fetchMock.mockReset())
afterEach(cleanup)

describe('Admin COD reconciliation run detail', () => {
  it('maps the full API response: run overview, counters and snapshot availability', async () => {
    fetchMock.mockResolvedValue(detail())
    renderDetail('/admin/cod-reconciliation/runs/run-1')

    expect(await screen.findByText('Run details')).toBeTruthy()
    expect(screen.getByText('Run ID run-1')).toBeTruthy()
    expect(screen.getByText('Completed')).toBeTruthy()
    expect(screen.getByText('Processed orders')).toBeTruthy()
    expect(screen.getAllByText('Matched orders').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Discrepancies').length).toBeGreaterThan(0)
    expect(screen.getByText('Uncollected COD')).toBeTruthy()
    expect(screen.getByText('Snapshot availability')).toBeTruthy()
    expect(screen.getByText('Persisted')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('run-1', {
      signal: expect.any(AbortSignal),
      query: { page: 1, limit: 20 },
    })
  })

  it('passes the requested page and limit to the API', async () => {
    fetchMock.mockResolvedValue(detail())
    renderDetail('/admin/cod-reconciliation/runs/run-1?page=2&limit=10')

    await screen.findByText('Run details')
    expect(fetchMock).toHaveBeenCalledWith('run-1', {
      signal: expect.any(AbortSignal),
      query: { page: 2, limit: 10 },
    })
  })

  it('renders currency-separated summaries without cross-currency arithmetic', async () => {
    fetchMock.mockResolvedValue(
      detail({
        summaryByCurrency: [
          currencySummary({ currency: 'USD', expectedCount: 2, collectedCount: 1 }),
          currencySummary({ currency: 'KHR', expectedCount: 0, collectedCount: 1, collectedAmount: '120000.00' }),
        ],
      }),
    )
    renderDetail('/admin/cod-reconciliation/runs/run-1')

    await screen.findByText('Currency financial summary')
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Expected orders').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Matched orders').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Discrepancies').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Collected orders').length).toBeGreaterThan(0)
    expect(screen.getAllByText('KHR').length).toBeGreaterThan(0)
  })

  it('renders matched, missing-collection and currency-mismatch rows with their own currencies', async () => {
    fetchMock.mockResolvedValue(
      detail({
        items: [
          snapshotItem({ discrepancy: false, discrepancyType: null }),
          snapshotItem({
            orderNumber: 'ORD-MISS',
            currency: 'USD',
            expectedAmount: '40.40',
            collectedAmount: null,
            collectionCurrency: null,
            collectedAt: null,
            collectedById: null,
            collectedBy: null,
            discrepancy: true,
            discrepancyType: 'missing-collection',
            discrepancyExplanation: 'No COD collection was recorded for the expected 40.40 USD.',
          }),
          snapshotItem({
            orderNumber: 'ORD-CUR',
            currency: 'USD',
            expectedAmount: '30.30',
            collectedAmount: '120000.00',
            collectionCurrency: 'KHR',
            discrepancy: true,
            discrepancyType: 'currency-mismatch',
            discrepancyExplanation:
              'Collected 120000.00 KHR while the order expected 30.30 USD; the currencies are not comparable.',
          }),
        ],
      }),
    )
    renderDetail('/admin/cod-reconciliation/runs/run-1')

    await screen.findByText('Order-level audit trail')

    expect(screen.getAllByText('Matched').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Missing collection').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Currency mismatch').length).toBeGreaterThan(0)

    expect(screen.getAllByText('Not collected').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('No COD collection was recorded for the expected 40.40 USD.').length,
    ).toBeGreaterThan(0)

    expect(
      screen.getAllByText(
        'Collected 120000.00 KHR while the order expected 30.30 USD; the currencies are not comparable.',
      ).length,
    ).toBeGreaterThan(0)
  })

  it('renders missing optional attribution fields as dashes', async () => {
    fetchMock.mockResolvedValue(
      detail({
        items: [
          snapshotItem({
            orderNumber: null,
            orderStatus: null,
            paymentMethod: null,
            deliveryStaff: null,
            collectedBy: null,
            deliveredAt: null,
            collectedAt: null,
          }),
        ],
      }),
    )
    renderDetail('/admin/cod-reconciliation/runs/run-1')

    await screen.findByText('Order-level audit trail')
    expect(screen.getAllByText('order-1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows a legacy-run message and never renders fabricated order records', async () => {
    fetchMock.mockResolvedValue(
      detail({
        hasSnapshot: false,
        items: [],
        summaryByCurrency: [],
      }),
    )
    renderDetail('/admin/cod-reconciliation/runs/run-legacy')

    expect(await screen.findAllByText('Legacy run')).toHaveLength(2)
    expect(
      screen.getByText('Historical snapshot details are unavailable'),
    ).toBeTruthy()
    expect(
      screen.getByText(/This run completed before order snapshots were persisted\./),
    ).toBeTruthy()
    expect(screen.queryByText('Order-level audit trail')).toBeNull()
    expect(screen.queryByText('Currency financial summary')).toBeNull()
  })

  it('shows an empty state for a zero-order snapshot', async () => {
    fetchMock.mockResolvedValue(
      detail({
        items: [],
        summaryByCurrency: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    )
    renderDetail('/admin/cod-reconciliation/runs/run-1')

    expect(await screen.findByText('No orders')).toBeTruthy()
    expect(screen.getByText('This snapshot has no order records')).toBeTruthy()
  })

  it('shows a loading state then the loaded content', async () => {
    fetchMock.mockResolvedValue(detail())
    renderDetail('/admin/cod-reconciliation/runs/run-1')

    expect(screen.getByText('Loading…')).toBeTruthy()
    await screen.findByText('Run details')
    expect(screen.queryByText('Loading…')).toBeNull()
  })

  it('shows an error state with retry after an API failure', async () => {
    const spy = vi.spyOn(useAsyncResourceModule, 'useAsyncResource')
    spy.mockReturnValue({
      data: undefined,
      error: { message: 'Reconciliation run not found' },
      isLoading: false,
      isRefreshing: false,
      refetch: vi.fn(),
    })
    renderDetail('/admin/cod-reconciliation/runs/missing')

    expect(await screen.findByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(spy.mock.results[0].value.refetch).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('paginates: clicking next requests the next page and keeps summaries on every page', async () => {
    const first = detail({
      pagination: { page: 1, limit: 2, total: 4, totalPages: 2 },
      items: [
        snapshotItem({ id: 'item-1', orderNumber: 'ORD-1001' }),
        snapshotItem({ id: 'item-2', orderNumber: 'ORD-1002' }),
      ],
    })
    const second = detail({
      pagination: { page: 2, limit: 2, total: 4, totalPages: 2 },
      items: [
        snapshotItem({ id: 'item-3', orderNumber: 'ORD-1003' }),
        snapshotItem({ id: 'item-4', orderNumber: 'ORD-1004' }),
      ],
      summaryByCurrency: [currencySummary()],
    })
    fetchMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second)

    renderDetail('/admin/cod-reconciliation/runs/run-1')

    await screen.findAllByText('ORD-1001')
    expect(screen.getByText(/Page 1 of 2/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith('run-1', {
        signal: expect.any(AbortSignal),
        query: { page: 2, limit: 20 },
      }),
    )
    expect(await screen.findAllByText('ORD-1003'))
    expect(screen.getByText('Currency financial summary')).toBeTruthy()
  })

  it('fetches with the limit from the URL query params', async () => {
    fetchMock.mockResolvedValue(detail())
    renderDetail('/admin/cod-reconciliation/runs/run-1?limit=10')

    await screen.findByText('Run details')
    expect(fetchMock).toHaveBeenCalledWith('run-1', {
      signal: expect.any(AbortSignal),
      query: { page: 1, limit: 10 },
    })
  })

  it('disables previous on the first page and next on the last page', async () => {
    fetchMock.mockResolvedValue(
      detail({ pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    )
    renderDetail('/admin/cod-reconciliation/runs/run-1')

    await screen.findByText('Run details')
    const previous = screen.getByRole('button', { name: /^Previous$/ }) as HTMLButtonElement
    const next = screen.getByRole('button', { name: /^Next$/ }) as HTMLButtonElement
    expect(previous.disabled).toBe(true)
    expect(next.disabled).toBe(true)
  })
})
