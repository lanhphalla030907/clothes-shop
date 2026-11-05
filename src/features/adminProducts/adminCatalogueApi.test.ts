import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, ProductImage } from '@/types/api'
import {
  createAdminCategory,
  fetchAdminCategories,
  invalidateAdminCategories,
  removeAdminCategoryImage,
  uploadAdminCategoryImage,
} from './api'
import {
  fetchAdminInventory,
  uploadAdminProductImage,
} from './subresourcesApi'

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }) as Response

const category: Category = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Shirts',
  slug: 'shirts',
  description: null,
  parentId: null,
  isActive: true,
  imageUrl: null,
  publicId: null,
  altText: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const image: ProductImage = {
  id: '22222222-2222-4222-8222-222222222222',
  productId: '33333333-3333-4333-8333-333333333333',
  imageUrl: 'https://example.com/shirt.jpg',
  publicId: 'products/shirt',
  altText: 'Shirt',
  sortOrder: 0,
  isPrimary: true,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  invalidateAdminCategories()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('admin category transport', () => {
  it('caches the list and refetches after a successful write', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([category]))
      .mockResolvedValueOnce(jsonResponse(category))
      .mockResolvedValueOnce(jsonResponse([category]))

    await fetchAdminCategories()
    await fetchAdminCategories()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await createAdminCategory({
      name: 'Shirts',
      slug: 'shirts',
      isActive: true,
    })
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/admin/categories')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' })

    await fetchAdminCategories()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe('admin product subresource transport', () => {
  it('sends image uploads as multipart, leaving the boundary to the browser', async () => {
    const file = new File(['image-bytes'], 'shirt.png', { type: 'image/png' })
    fetchMock.mockResolvedValueOnce(jsonResponse(image))

    await uploadAdminProductImage('product-id', {
      file,
      altText: '  A shirt  ',
      sortOrder: 2,
      isPrimary: true,
    })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/admin/products/product-id/images/upload')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    expect(init?.headers).not.toMatchObject({ 'Content-Type': 'application/json' })

    const body = init?.body as FormData
    expect(body.get('file')).toBe(file)
    expect(body.get('altText')).toBe('A shirt')
    expect(body.get('sortOrder')).toBe('2')
    expect(body.get('isPrimary')).toBe('true')
  })

  it('treats a missing inventory row as null and keeps other errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 404, message: 'No stock row' }, 404),
    )
    await expect(fetchAdminInventory('product-id', 'variant-id')).resolves.toBeNull()

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 500, message: 'Exploded' }, 500),
    )
    await expect(fetchAdminInventory('product-id', 'variant-id')).rejects.toMatchObject({
      kind: 'server',
      status: 500,
    })
  })
})

describe('admin category image transport', () => {
  const categoryWithImage: Category = {
    ...category,
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/categories/abc.jpg',
    publicId: 'categories/abc',
    altText: 'A shirt category',
  }

  it('uploads a category image as multipart without Content-Type override', async () => {
    const file = new File(['image-bytes'], 'category.jpg', { type: 'image/jpeg' })
    fetchMock.mockResolvedValueOnce(jsonResponse(categoryWithImage))

    await uploadAdminCategoryImage(category.id, {
      file,
      altText: '  A shirt category  ',
    })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain(
      `/admin/categories/${category.id}/images/upload`,
    )
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    expect(init?.headers).not.toMatchObject({ 'Content-Type': 'application/json' })

    const body = init?.body as FormData
    expect(body.get('file')).toBe(file)
    expect(body.get('altText')).toBe('A shirt category')
  })

  it('omits altText when blank', async () => {
    const file = new File(['image-bytes'], 'category.jpg', { type: 'image/jpeg' })
    fetchMock.mockResolvedValueOnce(jsonResponse(categoryWithImage))

    await uploadAdminCategoryImage(category.id, { file })

    const [, init] = fetchMock.mock.calls[0] ?? []
    const body = init?.body as FormData
    expect(body.get('altText')).toBeNull()
  })

  it('invalidates categories cache after upload', async () => {
    const file = new File(['image-bytes'], 'category.jpg', { type: 'image/jpeg' })
    fetchMock.mockResolvedValueOnce(jsonResponse(categoryWithImage))

    await uploadAdminCategoryImage(category.id, { file })

    // Only the upload call should happen; invalidateAdminCategories clears
    // the cache without making a request.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      `/admin/categories/${category.id}/images/upload`,
    )

    // A subsequent list fetch refetches because the cache was invalidated.
    fetchMock.mockResolvedValueOnce(jsonResponse([category]))
    await fetchAdminCategories()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('removes a category image', async () => {
    fetchMock.mockResolvedValueOnce(
      ({ ok: true, status: 204, text: async () => '' } as unknown) as Response,
    )

    await removeAdminCategoryImage(category.id)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain(`/admin/categories/${category.id}/images`)
    expect(init?.method).toBe('DELETE')
  })

  it('invalidates categories cache after removal', async () => {
    fetchMock.mockResolvedValueOnce(
      ({ ok: true, status: 204, text: async () => '' } as unknown) as Response,
    )

    await removeAdminCategoryImage(category.id)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      `/admin/categories/${category.id}/images`,
    )

    // A subsequent list fetch refetches because the cache was invalidated.
    fetchMock.mockResolvedValueOnce(jsonResponse([category]))
    await fetchAdminCategories()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
