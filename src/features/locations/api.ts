import { apiGetList, apiPatch } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AdminCodEligibility,
  AdministrativeLocation,
  UpdateCodEligibilityRequest,
} from '@/types/api'

export const fetchCambodiaLocations = (
  parentPcode?: string,
  signal?: AbortSignal,
): Promise<AdministrativeLocation[]> => {
  const query = parentPcode
    ? `?parentPcode=${encodeURIComponent(parentPcode)}`
    : ''
  return apiGetList<AdministrativeLocation>(`${API.cambodiaLocations}${query}`, {
    signal,
  })
}

export const fetchAdminCodEligibility = (
  parentPcode?: string,
  signal?: AbortSignal,
): Promise<AdminCodEligibility[]> => {
  const query = parentPcode
    ? `?parentPcode=${encodeURIComponent(parentPcode)}`
    : ''
  return apiGetList<AdminCodEligibility>(
    `${API.adminCodEligibility}${query}`,
    { signal },
  )
}

export const updateAdminCodEligibility = (
  pcode: string,
  body: UpdateCodEligibilityRequest,
): Promise<AdminCodEligibility> =>
  apiPatch<AdminCodEligibility>(
    `${API.adminCodEligibility}/${encodeURIComponent(pcode)}`,
    body,
  ).then((value) => {
    if (!value) {
      throw new Error('COD eligibility was not returned by the server.')
    }
    return value
  })
