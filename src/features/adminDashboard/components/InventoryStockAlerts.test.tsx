import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchStockAlerts } from '@/features/adminDashboard/api'
import type { StockAlertsResponse } from '@/types/api'
import { InventoryStockAlerts } from './InventoryStockAlerts'

vi.mock('@/features/adminDashboard/api', () => ({
  fetchStockAlerts: vi.fn(),
}))

const stockAlerts: StockAlertsResponse = {
  summary: { inStock: 12, lowStock: 3, outOfStock: 2, total: 17 },
  items: [
    {
      variantId: 'variant-1',
      productId: 'product-1',
      productName: 'Heavyweight Hoodie',
      productImage: null,
      sku: 'HOD-BLK-M',
      color: 'Black',
      size: 'M',
      quantity: 8,
      reservedQuantity: 3,
      available: 5,
      status: 'LOW_STOCK',
    },
    {
      variantId: 'variant-2',
      productId: 'product-2',
      productName: 'Oversized Tee',
      productImage: null,
      sku: 'TEE-WHT-L',
      color: 'White',
      size: 'L',
      quantity: 4,
      reservedQuantity: 4,
      available: 0,
      status: 'OUT_OF_STOCK',
    },
  ],
}

beforeEach(() => {
  vi.mocked(fetchStockAlerts).mockResolvedValue(stockAlerts)
})

afterEach(cleanup)

describe('InventoryStockAlerts', () => {
  it('defaults to alerts and renders the summary, rows and reserved detail', async () => {
    render(<InventoryStockAlerts />)

    expect(
      await screen.findByRole('group', { name: 'In stock variants' }),
    ).toBeTruthy()
    expect(fetchStockAlerts).toHaveBeenCalledWith('alerts', expect.anything())

    expect(
      within(
        screen.getByRole('group', { name: 'In stock variants' }),
      ).getByText('12'),
    ).toBeTruthy()
    expect(
      within(
        screen.getByRole('group', { name: 'Low stock variants' }),
      ).getByText('3'),
    ).toBeTruthy()
    expect(
      within(
        screen.getByRole('group', { name: 'Out of stock variants' }),
      ).getByText('2'),
    ).toBeTruthy()

    expect(await screen.findByText('HOD-BLK-M')).toBeTruthy()
    expect(screen.getByText('8 on hand · 3 reserved')).toBeTruthy()
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0)
  })

  it('requests the selected filter', async () => {
    render(<InventoryStockAlerts />)
    await screen.findByRole('group', { name: 'In stock variants' })

    fireEvent.click(screen.getByRole('button', { name: /^Low stock/ }))
    await waitFor(() =>
      expect(fetchStockAlerts).toHaveBeenLastCalledWith(
        'low',
        expect.anything(),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /^All/ }))
    await waitFor(() =>
      expect(fetchStockAlerts).toHaveBeenLastCalledWith(
        'all',
        expect.anything(),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /^Out of stock/ }))
    await waitFor(() =>
      expect(fetchStockAlerts).toHaveBeenLastCalledWith(
        'out',
        expect.anything(),
      ),
    )
  })

  it('shows the no-records empty state', async () => {
    vi.mocked(fetchStockAlerts).mockResolvedValue({
      summary: { inStock: 0, lowStock: 0, outOfStock: 0, total: 0 },
      items: [],
    })

    render(<InventoryStockAlerts />)

    expect(await screen.findByText('No stock records yet')).toBeTruthy()
  })

  it('shows an empty view when a filter matches nothing', async () => {
    vi.mocked(fetchStockAlerts).mockResolvedValue({
      summary: { inStock: 4, lowStock: 0, outOfStock: 0, total: 4 },
      items: [],
    })

    render(<InventoryStockAlerts />)

    expect(await screen.findByText('Nothing in this view')).toBeTruthy()
  })

  it('shows an error with retry when the request fails', async () => {
    vi.mocked(fetchStockAlerts).mockRejectedValueOnce(new Error('nope'))

    render(<InventoryStockAlerts />)

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeTruthy()
  })

  it('shows a loading state before the first response', () => {
    vi.mocked(fetchStockAlerts).mockReturnValue(
      new Promise<StockAlertsResponse>(() => undefined),
    )

    render(<InventoryStockAlerts />)

    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('Loading stock alerts')).toBeTruthy()
  })
})