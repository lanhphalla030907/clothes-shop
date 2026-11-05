import {
  apiDelete,
  apiGetList,
  apiGetOne,
  apiPatch,
  apiPost,
} from '@/lib/api/client'
import { API, UPLOAD_TIMEOUT_MS } from '@/lib/api/config'
import type {
  CreatePosterInput,
  Poster,
  ReplacePosterImageInput,
  UpdatePosterRequest,
  UUID,
} from '@/types/api'

/**
 * `/admin/posters`.
 *
 * Every poster write goes through this module. The image routes are multipart
 * with the single `file` field the backend interceptor expects; metadata stays
 * JSON. Authentication and 401 handling are owned by `lib/api/client`.
 */

export const fetchAdminPosters = (signal?: AbortSignal): Promise<Poster[]> =>
  apiGetList<Poster>(API.adminPosters, { signal })

export const fetchAdminPoster = (
  id: UUID,
  signal?: AbortSignal,
): Promise<Poster> =>
  apiGetOne<Poster>(`${API.adminPosters}/${id}`, { signal })

export const createAdminPoster = async (
  input: CreatePosterInput,
): Promise<Poster> => {
  const form = new FormData()
  form.append('file', input.file)
  if (input.title !== undefined && input.title.trim() !== '') {
    form.append('title', input.title.trim())
  }
  if (input.displayOrder !== undefined) {
    form.append('displayOrder', String(input.displayOrder))
  }

  const poster = await apiPost<Poster>(API.adminPosters, form, {
    timeoutMs: UPLOAD_TIMEOUT_MS,
  })

  return requirePoster(poster, 'The studio did not return the uploaded poster.')
}

export const updateAdminPoster = async (
  id: UUID,
  body: UpdatePosterRequest,
): Promise<Poster> => {
  const poster = await apiPatch<Poster>(`${API.adminPosters}/${id}`, body)

  return requirePoster(poster, 'The studio did not return the saved poster.')
}

/**
 * Replaces the image in place. Title and display order are deliberately not
 * sent: metadata edits use {@link updateAdminPoster}, so this route only ever
 * changes the asset.
 */
export const replaceAdminPosterImage = async (
  id: UUID,
  input: ReplacePosterImageInput,
): Promise<Poster> => {
  const form = new FormData()
  form.append('file', input.file)

  const poster = await apiPost<Poster>(
    `${API.adminPosters}/${id}/images/upload`,
    form,
    { timeoutMs: UPLOAD_TIMEOUT_MS },
  )

  return requirePoster(poster, 'The studio did not return the replaced poster.')
}

export const deleteAdminPoster = async (id: UUID): Promise<void> => {
  await apiDelete<void>(`${API.adminPosters}/${id}`)
}

const requirePoster = (
  poster: Poster | undefined,
  message: string,
): Poster => {
  if (poster === undefined) throw new Error(message)
  return poster
}
