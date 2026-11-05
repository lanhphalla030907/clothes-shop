import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetList, apiPatch, apiPost } from '@/lib/api/client'
import {
  createCodArea,
  fetchAdminCodAreas,
  fetchCodEnabledAreas,
  updateCodArea,
} from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetList: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

const getListMock = vi.mocked(apiGetList)
const patchMock = vi.mocked(apiPatch)
const postMock = vi.mocked(apiPost)

describe('COD areas API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the public and admin list endpoints', async () => {
    getListMock.mockResolvedValue([])
    const signal = new AbortController().signal

    await fetchCodEnabledAreas(signal)
    await fetchAdminCodAreas(signal)

    expect(getListMock).toHaveBeenNthCalledWith(1, '/cod-areas', { signal })
    expect(getListMock).toHaveBeenNthCalledWith(2, '/admin/cod-areas', { signal })
  })

  it('sends creation and partial updates to the admin endpoints', async () => {
    const saved = {
      id: 'area-1',
      code: 'PHNOM-PENH',
      name: 'Phnom Penh',
      codEnabled: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    }
    postMock.mockResolvedValue(saved)
    patchMock.mockResolvedValue(saved)

    await createCodArea({ code: 'PHNOM-PENH', name: 'Phnom Penh' })
    await updateCodArea('area-1', { codEnabled: true })

    expect(postMock).toHaveBeenCalledWith('/admin/cod-areas', {
      code: 'PHNOM-PENH',
      name: 'Phnom Penh',
    })
    expect(patchMock).toHaveBeenCalledWith('/admin/cod-areas/area-1', {
      codEnabled: true,
    })
  })
})
