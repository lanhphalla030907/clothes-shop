import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductAttribute } from '@/types/api'
import {
  createProductAttribute,
  deleteProductAttribute,
  fetchProductAttributes,
  updateProductAttribute,
} from './api'

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }) as Response

const attribute: ProductAttribute = {
  id: '22222222-2222-4222-8222-222222222222',
  productId: '11111111-1111-4111-8111-111111111111',
  attributeName: 'Material',
  attributeValue: 'Cotton',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('product attribute API', () => {
  it('loads the product-scoped collection', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([attribute]))

    await expect(fetchProductAttributes(attribute.productId)).resolves.toEqual([attribute])
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      `/products/${attribute.productId}/attributes`,
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' })
  })

  it('creates with the backend DTO names and preserves input casing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(attribute))

    await createProductAttribute(attribute.productId, {
      attributeName: 'Material',
      attributeValue: 'Cotton',
    })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain(`/products/${attribute.productId}/attributes`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      attributeName: 'Material',
      attributeValue: 'Cotton',
    })
  })

  it('updates only the addressed attribute under its product path', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(attribute))

    await updateProductAttribute(attribute.productId, attribute.id, {
      attributeValue: 'Organic cotton',
    })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain(`/products/${attribute.productId}/attributes/${attribute.id}`)
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ attributeValue: 'Organic cotton' })
  })

  it('deletes through the product-scoped route and accepts 204', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: async () => '',
    } as Response)

    await expect(deleteProductAttribute(attribute.productId, attribute.id)).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      `/products/${attribute.productId}/attributes/${attribute.id}`,
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
  })

  it('surfaces validation and duplicate-name API errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 400, message: ['attributeName must be shorter'] }, 400),
    )
    await expect(
      createProductAttribute(attribute.productId, {
        attributeName: 'x'.repeat(51),
        attributeValue: 'Cotton',
      }),
    ).rejects.toMatchObject({ kind: 'validation', details: ['attributeName must be shorter'] })

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { statusCode: 409, message: 'A product attribute with this name already exists' },
        409,
      ),
    )
    await expect(
      createProductAttribute(attribute.productId, {
        attributeName: 'material',
        attributeValue: 'Linen',
      }),
    ).rejects.toMatchObject({
      kind: 'conflict',
      message: 'A product attribute with this name already exists',
    })
  })
})
