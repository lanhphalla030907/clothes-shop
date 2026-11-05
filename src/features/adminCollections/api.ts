import { apiDelete, apiGetList, apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API, UPLOAD_TIMEOUT_MS } from '@/lib/api/config'
import type { Collection, CollectionDetail, CreateCollectionInput, UpdateCollectionRequest, UUID } from '@/types/api'

export const fetchAdminCollections = (signal?: AbortSignal): Promise<Collection[]> =>
  apiGetList<Collection>(API.adminCollections, { signal })

export const fetchAdminCollection = (id: UUID, signal?: AbortSignal): Promise<CollectionDetail> =>
  apiGetOne<CollectionDetail>(`${API.adminCollections}/${id}`, { signal })

export const createAdminCollection = async (input: CreateCollectionInput): Promise<Collection> => {
  const form = new FormData()
  form.append('file', input.file)
  form.append('title', input.title.trim())
  if (input.description?.trim()) form.append('description', input.description.trim())
  form.append('displayOrder', String(input.displayOrder))
  form.append('productIds', JSON.stringify(input.productIds))
  return requireCollection(await apiPost<Collection>(API.adminCollections, form, { timeoutMs: UPLOAD_TIMEOUT_MS }))
}

export const updateAdminCollection = async (id: UUID, body: UpdateCollectionRequest): Promise<Collection> =>
  requireCollection(await apiPatch<Collection>(`${API.adminCollections}/${id}`, body))

export const replaceAdminCollectionImage = async (id: UUID, file: File): Promise<Collection> => {
  const form = new FormData()
  form.append('file', file)
  return requireCollection(await apiPost<Collection>(`${API.adminCollections}/${id}/images/upload`, form, { timeoutMs: UPLOAD_TIMEOUT_MS }))
}

export const updateAdminCollectionStatus = async (id: UUID, isActive: boolean): Promise<Collection> =>
  requireCollection(await apiPatch<Collection>(`${API.adminCollections}/${id}/status`, { isActive }))

export const deleteAdminCollection = (id: UUID): Promise<void> =>
  apiDelete<void>(`${API.adminCollections}/${id}`).then(() => undefined)

const requireCollection = (collection: Collection | undefined): Collection => {
  if (!collection) throw new Error('The studio did not return the saved collection.')
  return collection
}
