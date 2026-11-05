import { apiGetList, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  CodArea,
  CreateCodAreaRequest,
  PublicCodArea,
  UpdateCodAreaRequest,
  UUID,
} from '@/types/api'

export const fetchCodEnabledAreas = (signal?: AbortSignal): Promise<PublicCodArea[]> =>
  apiGetList<PublicCodArea>(API.codAreas, { signal })

export const fetchAdminCodAreas = (signal?: AbortSignal): Promise<CodArea[]> =>
  apiGetList<CodArea>(API.adminCodAreas, { signal })

export const createCodArea = (body: CreateCodAreaRequest): Promise<CodArea> =>
  apiPost<CodArea>(API.adminCodAreas, body).then(requireArea)

export const updateCodArea = (
  id: UUID,
  body: UpdateCodAreaRequest,
): Promise<CodArea> =>
  apiPatch<CodArea>(`${API.adminCodAreas}/${id}`, body).then(requireArea)

const requireArea = (area: CodArea | undefined): CodArea => {
  if (!area) throw new Error('The COD area was not returned by the server.')
  return area
}
