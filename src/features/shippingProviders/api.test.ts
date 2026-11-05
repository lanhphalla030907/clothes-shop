import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetList, apiPatch, apiPost } from '@/lib/api/client'
import { createShippingProvider, fetchAdminShippingProviders, fetchShippingProviders, updateShippingProvider } from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetList: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

const getListMock = vi.mocked(apiGetList)
const patchMock = vi.mocked(apiPatch)
const postMock = vi.mocked(apiPost)

describe('shipping providers API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the public and admin list endpoints', async () => {
    getListMock.mockResolvedValue([])
    const signal = new AbortController().signal

    await fetchShippingProviders(signal)
    await fetchAdminShippingProviders(signal)

    expect(getListMock).toHaveBeenNthCalledWith(1, '/shipping/providers', { signal })
    expect(getListMock).toHaveBeenNthCalledWith(2, '/admin/shipping-providers', { signal })
  })

  it('sends create and partial update requests to the admin endpoints', async () => {
    const saved = {
      id: 'provider-1',
      code: 'LOCAL',
      name: 'Local delivery',
      description: null,
      baseFee: '1.00',
      isActive: true,
      supportsCod: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    }
    postMock.mockResolvedValue(saved)
    patchMock.mockResolvedValue(saved)

    await createShippingProvider({
      code: 'LOCAL',
      name: 'Local delivery',
      baseFee: '1.00',
    })
    await updateShippingProvider('provider-1', { isActive: false })

    expect(postMock).toHaveBeenCalledWith('/admin/shipping-providers', {
      code: 'LOCAL',
      name: 'Local delivery',
      baseFee: '1.00',
    })
    expect(patchMock).toHaveBeenCalledWith(
      '/admin/shipping-providers/provider-1',
      { isActive: false },
    )
  })
})
