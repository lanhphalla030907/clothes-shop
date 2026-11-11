import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetOne } from '@/lib/api/client'
import {
  fetchFinanceCashReconciliation,
  fetchFinanceOverview,
  fetchFinanceProducts,
  fetchFinanceRankings,
  fetchFinanceRevenueTrend,
} from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetOne: vi.fn(),
}))

const getMock = vi.mocked(apiGetOne)

beforeEach(() => {
  getMock.mockReset()
  getMock.mockResolvedValue({} as never)
})

describe('finance api', () => {
  it('sends the overview range, currency and recognition basis', async () => {
    await fetchFinanceOverview({
      from: '2026-10-01',
      to: '2026-10-31',
      currency: 'KHR',
      basis: 'booked',
    })

    expect(getMock).toHaveBeenCalledWith(
      '/admin/finance/overview',
      expect.objectContaining({
        query: {
          from: '2026-10-01',
          to: '2026-10-31',
          currency: 'KHR',
          basis: 'booked',
        },
      }),
    )
  })

  it('adds granularity to the revenue trend query', async () => {
    await fetchFinanceRevenueTrend({
      from: '2026-01-01',
      to: '2026-12-31',
      currency: 'USD',
      basis: 'delivered',
      granularity: 'month',
    })

    expect(getMock).toHaveBeenCalledWith(
      '/admin/finance/revenue-trend',
      expect.objectContaining({
        query: expect.objectContaining({
          granularity: 'month',
          basis: 'delivered',
          currency: 'USD',
        }),
      }),
    )
  })

  it('sends server-side product pagination and sorting', async () => {
    await fetchFinanceProducts({
      from: '2026-10-01',
      to: '2026-10-31',
      currency: 'USD',
      basis: 'delivered',
      page: 2,
      limit: 50,
      sortBy: 'margin',
      sortOrder: 'asc',
    })

    expect(getMock).toHaveBeenCalledWith(
      '/admin/finance/products',
      expect.objectContaining({
        query: expect.objectContaining({
          page: 2,
          limit: 50,
          sortBy: 'margin',
          sortOrder: 'asc',
        }),
      }),
    )
  })

  it('sends the ranking metric and limit', async () => {
    await fetchFinanceRankings({
      from: '2026-10-01',
      to: '2026-10-31',
      currency: 'USD',
      basis: 'delivered',
      metric: 'profit',
      limit: 10,
    })

    expect(getMock).toHaveBeenCalledWith(
      '/admin/finance/rankings',
      expect.objectContaining({
        query: expect.objectContaining({
          metric: 'profit',
          limit: 10,
        }),
      }),
    )
  })

  it('never sends basis to cash reconciliation', async () => {
    await fetchFinanceCashReconciliation({
      from: '2026-10-01',
      to: '2026-10-31',
      currency: 'USD',
    })

    const call = getMock.mock.calls[0]
    expect(call[0]).toBe('/admin/finance/cash-reconciliation')
    expect(call[1]).toEqual(
      expect.objectContaining({
        query: {
          from: '2026-10-01',
          to: '2026-10-31',
          currency: 'USD',
        },
      }),
    )
    expect(call[1]).not.toHaveProperty('query.basis')
  })
})
