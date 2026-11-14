import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchStockAlerts } from '@/features/adminDashboard/api'
import type {
  StockAlertFilter,
  StockAlertItem,
  StockAlertsResponse,
} from '@/types/api'
import InventoryStockTable from './InventoryStockTable'

vi.mock('@/features/adminDashboard/api', () => ({
  fetchStockAlerts: vi.fn(),
}))

const fetchMock = vi.mocked(fetchStockAlerts)

const makeItem = (overrides: Partial<StockAlertItem> = {}): StockAlertItem => ({
  variantId: '11111111-1111-4111-8111-111111111111',
  productId: '22222222-2222-4222-8222-222222222222',
  productName: 'Heavyweight Hoodie',
  productImage: null,
  sku: 'HOD-BLK-M',
  color: 'Black',
  size: 'M',
  quantity: 8,
  reservedQuantity: 3,
  available: 5,
  status: 'LOW_STOCK',
  ...overrides,
})

const makeList = (
  items: StockAlertItem[],
  total: number,
  overrides: Partial<StockAlertsResponse['pagination']> = {},
): StockAlertsResponse => ({
  summary: {
    inStock: items.filter((i) => i.status === 'IN_STOCK').length,
    lowStock: items.filter((i) => i.status === 'LOW_STOCK').length,
    outOfStock: items.filter((i) => i.status === 'OUT_OF_STOCK').length,
    total,
  },
  items,
  pagination: {
    page: 1,
    limit: 10,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / 10),
    ...overrides,
  },
})

const renderTable = (initialEntry = '/admin/products/overview') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/admin/products/overview"
          element={<InventoryStockTable />}
        />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  fetchMock.mockReset()
})

afterEach(cleanup)

describe('InventoryStockTable', () => {
  it('loads the first page with the default filter and page size', async () => {
    fetchMock.mockResolvedValue(makeList([makeItem()], 1))

    renderTable()

    expect(await screen.findByText('Heavyweight Hoodie')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10, status: 'all' }),
      expect.anything(),
    )
  })

  it('counts every record in the summary, not only the current page', async () => {
    const items = [
      makeItem({
        variantId: 'v-in-stock',
        productId: 'p-in-stock',
        productName: 'Alpha tee',
        sku: 'ALPHA',
        status: 'IN_STOCK',
        available: 100,
      }),
      makeItem({
        variantId: 'v-low',
        productId: 'p-low',
        productName: 'Beta tee',
        sku: 'BETA',
        status: 'LOW_STOCK',
        available: 10,
      }),
      makeItem({
        variantId: 'v-out',
        productId: 'p-out',
        productName: 'Gamma tee',
        sku: 'GAMMA',
        status: 'OUT_OF_STOCK',
        available: 0,
      }),
    ]
    fetchMock.mockResolvedValue(makeList(items, 25))

    renderTable()

    await screen.findByText('Alpha tee')
    expect(await screen.findByText(/of 25/)).toBeTruthy()
  })

  it('switches the status filter and resets the page', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    renderTable('/admin/products/overview?status=low&page=2')

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 10, status: 'low' }),
        expect.anything(),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /^All/ }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 10, status: 'all' }),
        expect.anything(),
      ),
    )
  })

  it('sends every supported status value and defaults to all', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    const statusCases: Array<[string, StockAlertFilter]> = [
      ['/admin/products/overview', 'all'],
      ['/admin/products/overview?status=all', 'all'],
      ['/admin/products/overview?status=in', 'in'],
      ['/admin/products/overview?status=low', 'low'],
      ['/admin/products/overview?status=out', 'out'],
    ]

    for (const [entry, expectedStatus] of statusCases) {
      renderTable(entry)
      await waitFor(() =>
        expect(fetchMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 1, limit: 10, status: expectedStatus }),
          expect.anything(),
        ),
      )
    }
  })

  it('sends status=in when the In stock filter is clicked', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    renderTable('/admin/products/overview')

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'all' }),
        expect.anything(),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /^In stock/ }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 10, status: 'in' }),
        expect.anything(),
      ),
    )
  })

  it('sanitizes an unsupported URL status to the default all', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    renderTable('/admin/products/overview?status=in-stock')

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'all' }),
        expect.anything(),
      ),
    )
  })

  it('applies a product name search and resets the page', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    renderTable('/admin/products/overview?page=2')

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
        expect.anything(),
      ),
    )

    fireEvent.change(screen.getByLabelText('Search by product name or SKU'), {
      target: { value: 'Alpha' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Apply/ }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
          status: 'all',
          search: 'Alpha',
        }),
        expect.anything(),
      ),
    )
  })

  it('applies an SKU search', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    renderTable()

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
        expect.anything(),
      ),
    )

    fireEvent.change(screen.getByLabelText('Search by product name or SKU'), {
      target: { value: 'TEE-WHT' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Apply/ }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'TEE-WHT' }),
        expect.anything(),
      ),
    )
  })

  it('navigates between pages and updates the URL', async () => {
    const items = Array.from({ length: 25 }, (_, index) =>
      makeItem({
        variantId: `v-${index}`,
        productId: `p-${index}`,
        sku: `SKU-${index}`,
        productName: `Product ${index}`,
      }),
    )
    fetchMock.mockResolvedValue(
      makeList(items.slice(0, 10), 25, { page: 1, limit: 10, totalPages: 3 }),
    )

    renderTable()

    await screen.findByText('Product 0')
    expect(screen.getByText('Page 1 of 3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Next/ }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
        expect.anything(),
      ),
    )
  })

  it('supports all valid page sizes (10, 25, 50) and resets the page', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    renderTable('/admin/products/overview?page=5')

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 5, limit: 10 }),
        expect.anything(),
      ),
    )

    for (const size of [10, 25, 50]) {
      const pageSizeSelects = screen.getAllByLabelText('Per page')
      fireEvent.change(pageSizeSelects[pageSizeSelects.length - 1], {
        target: { value: String(size) },
      })
      await waitFor(() =>
        expect(fetchMock).toHaveBeenLastCalledWith(
          expect.objectContaining({ limit: size, page: 1 }),
          expect.anything(),
        ),
      )
    }
  })

  it('shows the empty state when a filter matches nothing', async () => {
    fetchMock.mockResolvedValue(makeList([], 5))

    renderTable()

    expect(await screen.findByText('Nothing in this view')).toBeTruthy()
  })

  it('shows the no-records state when there are no stock records at all', async () => {
    fetchMock.mockResolvedValue(makeList([], 0))

    renderTable()

    expect(await screen.findByText('No stock records yet')).toBeTruthy()
  })

  it('shows an error with retry when the request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('nope'))

    renderTable()

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  it('shows a loading state before the first response', () => {
    fetchMock.mockReturnValue(
      new Promise<StockAlertsResponse>(() => undefined),
    )

    renderTable()

    expect(screen.getByRole('status')).toBeTruthy()
  })
})
