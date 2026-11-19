import { apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import { ApiError } from '@/lib/api/errors'
import type {
  AdminUserRecord,
  AdminUserPage,
  AssignableUserRole,
  CreateDeliveryStaffRequest,
  ManageableUserStatus,
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

/**
 * `GET /admin/users` — the role-management table's data source.
 *
 * The endpoint is admin-only on the server; the bearer token is attached by
 * `apiGetList`, and every row is a safe `AdminUserRecord`.
 */
export const fetchAdminUsers = (
  query: {
    page?: number
    limit?: number
    role?: AdminUserRecord['role']
    status?: ManageableUserStatus
    search?: string
  } = {},
  signal?: AbortSignal,
): Promise<AdminUserPage> =>
  apiGetOne<AdminUserPage>(API.adminUsers, { signal, query })

/**
 * `PATCH /admin/users/:id/role`.
 *
 * This is the only role-changing request the dashboard sends. Registration and
 * profile updates never carry a role, so they cannot elevate an account.
 */
export const changeUserRole = async (
  id: UUID,
  role: AssignableUserRole,
): Promise<AdminUserRecord> => {
  const user = await apiPatch<AdminUserRecord>(
    `${API.adminUsers}/${id}/role`,
    { role },
  )

  if (user === undefined || user.role !== role) {
    throw new ApiError('The updated role was not returned by the server.', {
      kind: 'unknown',
    })
  }

  return user
}

/** `PATCH /admin/users/:id/status` changes access without changing a role. */
export const changeUserStatus = async (
  id: UUID,
  status: ManageableUserStatus,
): Promise<AdminUserRecord> => {
  const user = await apiPatch<AdminUserRecord>(
    `${API.adminUsers}/${id}/status`,
    { status },
  )
  if (user === undefined || user.status !== status) {
    throw new ApiError('The updated account status was not returned by the server.', {
      kind: 'unknown',
    })
  }
  return user
}
