import { describe, expect, it } from 'vitest'
import type { ShippingProvider } from '@/types/api'
import {
  buildCreateShippingProviderRequest,
  buildUpdateShippingProviderRequest,
  validateShippingProvider,
} from './rules'

const provider: ShippingProvider = {
  id: 'provider-1',
  code: 'LOCAL-DELIVERY',
  name: 'Store delivery',
  description: null,
  baseFee: '2.50',
  isActive: true,
  supportsCod: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

describe('shipping provider form rules', () => {
  it('requires a valid code and name and a non-negative fee', () => {
    expect(
      validateShippingProvider({
        code: ' ',
        name: ' ',
        description: '',
        baseFee: '-1.00',
        supportsCod: false,
      }),
    ).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      baseFee: expect.any(String),
    })
  })

  it('enforces code, name, description, and decimal precision limits', () => {
    expect(
      validateShippingProvider({
        code: 'NOT A CODE',
        name: 'x'.repeat(121),
        description: 'x'.repeat(501),
        baseFee: '1.001',
        supportsCod: false,
      }),
    ).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      baseFee: expect.any(String),
    })
  })

  it('normalizes code and fees while preserving the name', () => {
    const request = buildCreateShippingProviderRequest({
      code: ' local-delivery ',
      name: '  Store delivery  ',
      description: '',
      baseFee: '12.5',
      supportsCod: true,
    })

    expect(request).toEqual({
      code: 'LOCAL-DELIVERY',
      name: 'Store delivery',
      baseFee: '12.50',
      supportsCod: true,
    })
  })

  it('builds a partial update without changing unchanged values', () => {
    expect(
      buildUpdateShippingProviderRequest(
        {
          code: 'local-delivery',
          name: 'Store delivery',
          description: '',
          baseFee: '2.50',
          supportsCod: true,
        },
        provider,
      ),
    ).toEqual({ supportsCod: true })
  })
})
