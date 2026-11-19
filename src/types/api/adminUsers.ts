import type { ISODateTime, UUID } from './common'

/**
 * `GET /admin/users/:id` — the one user read an administrator can perform.
 *
 * It mirrors `UserResponseDto`: no password hash, access token, or other
 * authentication material is part of this record.
 */
export interface AdminUserRecord {
  id: UUID
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: string
  role: 'CUSTOMER' | 'ADMIN' | 'DELIVERY_MANAGER' | 'DELIVERY_STAFF'
  emailVerifiedAt: ISODateTime | null
  lastLoginAt: ISODateTime | null
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Roles an administrator may assign. `CUSTOMER` is labelled USER in the UI. */
export type AssignableUserRole = Extract<
  AdminUserRecord['role'],
  'CUSTOMER' | 'ADMIN' | 'DELIVERY_STAFF'
>

export type ManageableUserStatus = 'ACTIVE' | 'INACTIVE'

export interface AdminUserPage {
  items: AdminUserRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateDeliveryStaffRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
}
