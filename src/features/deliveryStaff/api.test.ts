import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import {
  collectMyCod,
  fetchMyAssignment,
  fetchMyAssignments,
  fetchMyCodCollections,
  fetchMyCodCollectionsSummary,
  updateMyAssignmentStatus,
} from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetOne: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

const getMock = vi.mocked(apiGetOne)
const patchMock = vi.mocked(apiPatch)
const postMock = vi.mocked(apiPost)

beforeEach(() => vi.clearAllMocks())

describe('delivery staff API', () => {
  it('lists only the current staff assignments with status and pagination filters', async () => {
    const signal = new AbortController().signal
    const response = { items: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } }
    getMock.mockResolvedValue(response)

    await expect(
      fetchMyAssignments({ status: 'OUT_FOR_DELIVERY', page: 2, limit: 10 }, signal),
    ).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/delivery/staff/assignments', {
      signal,
      query: { status: 'OUT_FOR_DELIVERY', page: 2, limit: 10 },
    })
  })

  it('loads one assignment through the staff-scoped detail endpoint', async () => {
    const signal = new AbortController().signal
    const detail = { id: 'assignment-id' }
    getMock.mockResolvedValue(detail)

    await expect(fetchMyAssignment('assignment-id', signal)).resolves.toBe(detail)
    expect(getMock).toHaveBeenCalledWith(
      '/delivery/staff/assignments/assignment-id',
      { signal },
    )
  })

  it('updates status with optional notes through the existing PATCH endpoint', async () => {
    patchMock.mockResolvedValue({ id: 'assignment-id' })

    await expect(
      updateMyAssignmentStatus('assignment-id', 'OUT_FOR_DELIVERY', 'On route'),
    ).resolves.toBeUndefined()
    expect(patchMock).toHaveBeenCalledWith(
      '/delivery/staff/assignments/assignment-id/status',
      { status: 'OUT_FOR_DELIVERY', notes: 'On route' },
    )
  })

  it('posts COD fields and optional receipt proof as multipart form data', async () => {
    const receiptProof = new File(['image'], 'receipt.png', { type: 'image/png' })
    const response = { collectionId: 'collection-id' }
    postMock.mockResolvedValue(response)

    await expect(
      collectMyCod('assignment-id', {
        amount: '130.00',
        currency: 'USD',
        notes: 'Received',
        receiptProof,
      }),
    ).resolves.toBe(response)

    const [path, body] = postMock.mock.calls[0]!
    expect(path).toBe('/delivery/staff/assignments/assignment-id/collect-cod')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('amount')).toBe('130.00')
    expect((body as FormData).get('currency')).toBe('USD')
    expect((body as FormData).get('notes')).toBe('Received')
    expect((body as FormData).get('receiptProof')).toBe(receiptProof)
  })

  it('loads the caller’s COD collection history and summary from staff endpoints', async () => {
    const signal = new AbortController().signal
    const history = { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
    const summary = { totalCollections: 0, totalsByCurrency: [], firstCollectionAt: null, lastCollectionAt: null, periodBreakdown: [] }
    getMock.mockResolvedValueOnce(history).mockResolvedValueOnce(summary)

    await expect(fetchMyCodCollections(1, 10, signal)).resolves.toBe(history)
    await expect(fetchMyCodCollectionsSummary(signal)).resolves.toBe(summary)
    expect(getMock).toHaveBeenNthCalledWith(1, '/delivery/staff/cod-collections', {
      signal,
      query: { page: 1, limit: 10 },
    })
    expect(getMock).toHaveBeenNthCalledWith(
      2,
      '/delivery/staff/cod-collections/summary',
      { signal },
    )
  })
})
