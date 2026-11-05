import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetOne, apiPost } from '@/lib/api/client'
import type {
  AdminCodReconciliationRun,
  AdminCodReconciliationRunHistory,
} from '@/types/api'
import {
  fetchAdminCodReconciliationRun,
  fetchAdminCodReconciliationRuns,
  triggerAdminCodReconciliation,
} from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetOne: vi.fn(),
  apiPost: vi.fn(),
}))

const getMock = vi.mocked(apiGetOne)
const postMock = vi.mocked(apiPost)

const run: AdminCodReconciliationRun = {
  id: 'run-id',
  triggerType: 'manual',
  status: 'completed',
  windowStart: '2026-10-01T00:00:00.000Z',
  windowEnd: '2026-10-02T00:00:00.000Z',
  processedCount: 2,
  matchedCount: 1,
  discrepancyCount: 1,
  uncollectedCount: 1,
  errorMessage: null,
  startedAt: '2026-10-02T01:00:00.000Z',
  completedAt: '2026-10-02T01:01:00.000Z',
  createdAt: '2026-10-02T01:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin COD reconciliation API', () => {
  it('passes supported history filters and cancellation to the run list endpoint', async () => {
    const signal = new AbortController().signal
    const history: AdminCodReconciliationRunHistory = {
      items: [run],
      page: 2,
      limit: 10,
      total: 11,
      totalPages: 2,
    }
    getMock.mockResolvedValue(history)

    await fetchAdminCodReconciliationRuns(
      {
        page: 2,
        limit: 10,
        status: 'completed',
        triggerType: 'manual',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      },
      signal,
    )

    expect(getMock).toHaveBeenCalledWith(
      '/admin/cod-reconciliation/runs',
      {
        signal,
        query: {
          page: 2,
          limit: 10,
          status: 'completed',
          triggerType: 'manual',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        },
      },
    )
  })

  it('fetches a run by id', async () => {
    getMock.mockResolvedValue(run)

    await expect(fetchAdminCodReconciliationRun('run-id')).resolves.toBe(run)
    expect(getMock).toHaveBeenCalledWith(
      '/admin/cod-reconciliation/runs/run-id',
      { signal: undefined },
    )
  })

  it('posts the supported UTC date and explicit-window request bodies', async () => {
    const execution = {
      run,
      counters: {
        processedCount: 2,
        matchedCount: 1,
        discrepancyCount: 1,
        uncollectedCount: 1,
      },
      discrepancyBreakdown: {
        missingCollections: 1,
        amountMismatches: 0,
        currencyMismatches: 0,
      },
    }
    postMock.mockResolvedValue(execution)

    await triggerAdminCodReconciliation({ date: '2026-10-01' })
    await triggerAdminCodReconciliation({
      windowStart: '2026-10-01T00:00:00.000Z',
      windowEnd: '2026-10-02T00:00:00.000Z',
    })

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/admin/cod-reconciliation/runs/trigger',
      { date: '2026-10-01' },
    )
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/admin/cod-reconciliation/runs/trigger',
      {
        windowStart: '2026-10-01T00:00:00.000Z',
        windowEnd: '2026-10-02T00:00:00.000Z',
      },
    )
  })

  it('rejects a missing trigger response', async () => {
    postMock.mockResolvedValue(undefined)

    await expect(
      triggerAdminCodReconciliation({ date: '2026-10-01' }),
    ).rejects.toThrow('The reconciliation run was not returned by the server.')
  })
})
