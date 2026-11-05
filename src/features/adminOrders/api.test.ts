import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetOne, apiPost } from '@/lib/api/client'
import type { AdminOrderDetail, AdminOrderListResponse } from '@/types/api'
import {
  cancelAdminOrder,
  confirmCodAdminOrder,
  downloadAdminOrderReceipt,
  fetchAdminOrder,
  fetchAdminOrders,
  shipAdminOrder,
} from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetOne: vi.fn(),
  apiPost: vi.fn(),
}))

const getMock = vi.mocked(apiGetOne)
const postMock = vi.mocked(apiPost)

const order = { id: 'order-1' } as AdminOrderDetail

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin orders API', () => {
  it('passes every supported list filter to the admin list endpoint', async () => {
    const signal = new AbortController().signal
    const response: AdminOrderListResponse = {
      items: [],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    }
    getMock.mockResolvedValue(response)

    await fetchAdminOrders(
      {
        page: 2,
        limit: 10,
        status: 'PENDING',
        search: 'ORD-2026',
        createdFrom: '2026-10-01T00:00:00.000Z',
        createdTo: '2026-10-31T23:59:59.999Z',
      },
      signal,
    )

    expect(getMock).toHaveBeenCalledWith('/admin/orders', {
      signal,
      query: {
        page: 2,
        limit: 10,
        status: 'PENDING',
        search: 'ORD-2026',
        createdFrom: '2026-10-01T00:00:00.000Z',
        createdTo: '2026-10-31T23:59:59.999Z',
      },
    })
  })

  it('reads one order by id', async () => {
    const signal = new AbortController().signal
    getMock.mockResolvedValue(order)

    await expect(fetchAdminOrder('order-1', signal)).resolves.toBe(order)
    expect(getMock).toHaveBeenCalledWith('/admin/orders/order-1', { signal })
  })

  it('downloads the admin order receipt as a PDF blob', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    getMock.mockResolvedValue(blob)

    await expect(downloadAdminOrderReceipt('order-1')).resolves.toBe(blob)
    expect(getMock).toHaveBeenCalledWith('/admin/orders/order-1/receipt', {
      responseType: 'blob',
    })
  })

  it('calls the named lifecycle endpoints with no request body', async () => {
    postMock.mockResolvedValue(order)

    await cancelAdminOrder('order-1')
    await confirmCodAdminOrder('order-1')
    await shipAdminOrder('order-1')

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/admin/orders/order-1/cancel',
      undefined,
    )
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/admin/orders/order-1/confirm-cod',
      undefined,
    )
    expect(postMock).toHaveBeenNthCalledWith(
      3,
      '/admin/orders/order-1/ship',
      undefined,
    )
  })

  it('rejects an empty action response rather than returning undefined', async () => {
    postMock.mockResolvedValue(undefined)

    await expect(cancelAdminOrder('order-1')).rejects.toThrow(
      'The order was not returned by the server.',
    )
  })
})
