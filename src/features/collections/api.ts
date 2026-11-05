import { apiGetList, apiGetOne } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type { Collection, CollectionDetail } from '@/types/api'

export const fetchCollections = (limit?: number, signal?: AbortSignal): Promise<Collection[]> =>
  apiGetList<Collection>(API.collections, { signal, query: limit === undefined ? undefined : { limit: String(limit) } })

export const fetchCollectionDetail = (slug: string, page = 1, limit = 12, signal?: AbortSignal): Promise<CollectionDetail> =>
  apiGetOne<CollectionDetail>(`${API.collections}/${encodeURIComponent(slug)}`, {
    signal,
    query: { page: String(page), limit: String(limit) },
  })
