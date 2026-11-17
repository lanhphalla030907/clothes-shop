import { apiDelete, apiGetList, apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  CreateNextDropInput,
  NextDrop,
  UpdateNextDropInput,
  UUID,
} from '@/types/api'

export const fetchAdminNextDrops = (query: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
  apiGetList<NextDrop>(API.adminNextDrops, { signal, query: toQuery(query) })

export const fetchNextDrop = (id: UUID, signal?: AbortSignal) =>
  apiGetOne<NextDrop>(`${API.adminNextDrops}/${id}`, { signal })

export const createNextDrop = (body: CreateNextDropInput) =>
  apiPost<NextDrop>(API.adminNextDrops, body).then(requireNextDrop)

export const updateNextDrop = (id: UUID, body: UpdateNextDropInput) =>
  apiPatch<NextDrop>(`${API.adminNextDrops}/${id}`, body).then(requireNextDrop)

export const publishNextDrop = (id: UUID) =>
  apiPost<NextDrop>(`${API.adminNextDrops}/${id}/publish`, undefined).then(requireNextDrop)

export const unpublishNextDrop = (id: UUID) =>
  apiPost<NextDrop>(`${API.adminNextDrops}/${id}/unpublish`, undefined).then(requireNextDrop)

export const deleteNextDrop = (id: UUID) =>
  apiDelete<NextDrop>(`${API.adminNextDrops}/${id}`)

export const fetchActiveNextDrop = (signal?: AbortSignal) =>
  apiGetOne<NextDrop>(API.nextDropsActive, { signal })

/** Booleans are serialised as `"true"`/`"false"`; the transport query type is string/number only. */
const toQuery = (query: Record<string, string | number | boolean | undefined>): Record<string, string | number | undefined> => {
  const result: Record<string, string | number | undefined> = {}
  for (const [key, value] of Object.entries(query)) {
    result[key] = typeof value === 'boolean' ? String(value) : value
  }
  return result
}

const requireNextDrop = (value: NextDrop | undefined): NextDrop => {
  if (!value) throw new Error('The next drop was not returned by the server.')
  return value
}
