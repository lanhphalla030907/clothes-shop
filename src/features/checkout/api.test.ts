import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type { CheckoutQuote, Order } from '@/types/api'
import { createCheckoutQuote, placeOrder } from './api'

vi.mock('@/lib/api/client', () => ({
  apiPost: vi.fn(),
}))

const apiPostMock = vi.mocked(apiPost)

describe('checkout API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the selected address, provider, method, and COD area to the quote route', async () => {
    const response = { quoteId: 'quote' } as CheckoutQuote
    apiPostMock.mockResolvedValueOnce(response)
    const request = {
      addressId: '11111111-1111-4111-8111-111111111111',
      shippingProviderId: '22222222-2222-4222-8222-222222222222',
      paymentMethod: 'COD' as const,
      codAreaId: '33333333-3333-4333-8333-333333333333',
    }

    await expect(createCheckoutQuote(request)).resolves.toBe(response)
    expect(apiPostMock).toHaveBeenCalledWith(
      `${API.checkout}/quote`,
      request,
      { signal: undefined },
    )
  })

  it('posts only quote ID and idempotency key to authenticated checkout', async () => {
    const response = { id: 'order' } as Order
    apiPostMock.mockResolvedValueOnce(response)
    const request = {
      quoteId: '11111111-1111-4111-8111-111111111111',
      idempotencyKey: '22222222-2222-4222-8222-222222222222',
    }

    await expect(placeOrder(request)).resolves.toBe(response)
    expect(apiPostMock).toHaveBeenCalledWith(API.checkout, request, { signal: undefined })
  })
})
