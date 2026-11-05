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

export interface CreateDeliveryStaffRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
}
