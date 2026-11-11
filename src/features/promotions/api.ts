import { apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type { Promotion, PromotionInput, PromotionPage, PromotionUsagePage, UUID } from '@/types/api'

export const fetchAdminPromotions = (query: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
  apiGetOne<PromotionPage>(API.adminPromotions, { signal, query: toQuery(query) })

/** Booleans are serialised as `"true"`/`"false"`; the transport query type is string/number only. */
const toQuery = (query: Record<string, string | number | boolean | undefined>): Record<string, string | number | undefined> => {
  const result: Record<string, string | number | undefined> = {}
  for (const [key, value] of Object.entries(query)) {
    result[key] = typeof value === 'boolean' ? String(value) : value
  }
  return result
}

export const createPromotion = (body: PromotionInput) => apiPost<Promotion>(API.adminPromotions, body).then(requirePromotion)
export const updatePromotion = (id: UUID, body: PromotionInput) => apiPatch<Promotion>(`${API.adminPromotions}/${id}`, body).then(requirePromotion)
export const activatePromotion = (id: UUID) => apiPost<Promotion>(`${API.adminPromotions}/${id}/activate`, undefined).then(requirePromotion)
export const pausePromotion = (id: UUID) => apiPost<Promotion>(`${API.adminPromotions}/${id}/pause`, undefined).then(requirePromotion)
export const archivePromotion = (id: UUID) => apiPost<Promotion>(`${API.adminPromotions}/${id}/archive`, undefined).then(requirePromotion)
export const fetchPromotionUsages = (id: UUID, page: number, signal?: AbortSignal) =>
  apiGetOne<PromotionUsagePage>(`${API.adminPromotions}/${id}/usages`, { signal, query: { page, limit: 20 } })

const requirePromotion = (value: Promotion | undefined): Promotion => {
  if (!value) throw new Error('The promotion was not returned by the server.')
  return value
}
