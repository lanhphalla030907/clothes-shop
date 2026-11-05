import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAdminPoster,
  deleteAdminPoster,
  replaceAdminPosterImage,
  updateAdminPoster,
} from './api'
import type { Poster } from '@/types/api'

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  }) as Response

const poster: Poster = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Spring campaign',
  imageUrl: 'https://example.com/spring.jpg',
  publicId: 'posters/spring',
  isActive: true,
  displayOrder: 0,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

const fetchMock = vi.fn<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('admin poster transport', () => {
  it('creates a poster as multipart with only the fields the API accepts', async () => {
    const file = new File(['image-bytes'], 'landscape.jpg', {
      type: 'image/jpeg',
    })
    fetchMock.mockResolvedValueOnce(jsonResponse(poster))

    await createAdminPoster({
      file,
      title: '  Spring campaign  ',
      displayOrder: 3,
    })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain('/admin/posters')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    expect(init?.headers).not.toMatchObject({
      'Content-Type': 'application/json',
    })

    const body = init?.body as FormData
    expect(body.get('file')).toBe(file)
    expect(body.get('title')).toBe('Spring campaign')
    expect(body.get('displayOrder')).toBe('3')
  })

  it('replaces the image through the nested upload route', async () => {
    const file = new File(['image-bytes'], 'replacement.png', {
      type: 'image/png',
    })
    fetchMock.mockResolvedValueOnce(jsonResponse(poster))

    await replaceAdminPosterImage(poster.id, { file })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toContain(`/admin/posters/${poster.id}/images/upload`)
    expect(init?.method).toBe('POST')
    expect((init?.body as FormData).get('file')).toBe(file)
  })

  it('sends metadata as a JSON patch and returns no body on delete', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(poster))

    await updateAdminPoster(poster.id, { isActive: false, displayOrder: 2 })

    const [patchUrl, patchInit] = fetchMock.mock.calls[0] ?? []
    expect(String(patchUrl)).toContain(`/admin/posters/${poster.id}`)
    expect(patchInit?.method).toBe('PATCH')
    expect(JSON.parse(String(patchInit?.body))).toEqual({
      isActive: false,
      displayOrder: 2,
    })

    fetchMock.mockResolvedValueOnce(jsonResponse(undefined, 204))

    await deleteAdminPoster(poster.id)

    const [deleteUrl, deleteInit] = fetchMock.mock.calls[1] ?? []
    expect(String(deleteUrl)).toContain(`/admin/posters/${poster.id}`)
    expect(deleteInit?.method).toBe('DELETE')
  })
})
