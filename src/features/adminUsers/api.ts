import { apiGetOne, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { ApiError } from '@/lib/api/errors'
import type {
  AdminUserRecord,
  CreateDeliveryStaffRequest,
  UUID,
} from '@/types/api'

/**
 * `GET /admin/users/:id`.
 *
 * Administrators can look up one record and create delivery-staff accounts.
 */
export const fetchAdminUser = (id: UUID, signal?: AbortSignal): Promise<AdminUserRecord> =>
  apiGetOne<AdminUserRecord>(`${API.adminUsers}/${id}`, { signal })

export const createDeliveryStaff = async (
  body: CreateDeliveryStaffRequest,
): Promise<AdminUserRecord> => {
  const user = await apiPost<AdminUserRecord>(API.adminUsers, body)
  if (user === undefined || user.role !== 'DELIVERY_STAFF' || user.status !== 'ACTIVE') {
    throw new ApiError('The delivery staff account was not returned by the server.', {
      kind: 'unknown',
    })
  }
  return user
}
