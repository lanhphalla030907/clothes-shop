import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadReceipt } from './api'
import { apiGet } from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiGet: vi.fn(),
}))

const apiGetMock = vi.mocked(apiGet)

describe('orders API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('downloads a receipt as a binary blob from the order receipt endpoint', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    apiGetMock.mockResolvedValue(blob)

    const result = await downloadReceipt('11111111-1111-4111-8111-111111111111')

    expect(apiGetMock).toHaveBeenCalledWith(
      '/orders/11111111-1111-4111-8111-111111111111/receipt',
      { responseType: 'blob' },
    )
    expect(result).toBe(blob)
    expect(result.type).toBe('application/pdf')
  })
})
