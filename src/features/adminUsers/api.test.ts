import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import {
  changeUserRole,
  changeUserStatus,
  createDeliveryStaff,
  fetchAdminUser,
  fetchAdminUsers,
} from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetOne: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

const getMock = vi.mocked(apiGetOne)
const patchMock = vi.mocked(apiPatch)
const postMock = vi.mocked(apiPost)

const staff = {
  id: 'staff-id',
  firstName: 'Ada',
  lastName: 'Courier',
  email: 'ada@example.test',
  phone: null,
  status: 'ACTIVE',
  role: 'DELIVERY_STAFF',
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as const

beforeEach(() => {
  getMock.mockReset()
  patchMock.mockReset()
  postMock.mockReset()
})

describe('admin user API', () => {
  it('posts the delivery staff fields without allowing a role or status', async () => {
    postMock.mockResolvedValue(staff)
    const body = {
      firstName: 'Ada',
      lastName: 'Courier',
      email: 'ada@example.test',
      password: 'a-secure-password',
    }

    await expect(createDeliveryStaff(body)).resolves.toEqual(staff)

    expect(postMock).toHaveBeenCalledWith('/admin/users', body)
  })

  it('rejects a response that does not confirm active delivery staff', async () => {
    postMock.mockResolvedValue({ ...staff, role: 'ADMIN' })

    await expect(
      createDeliveryStaff({
        firstName: 'Ada',
        lastName: 'Courier',
        email: 'ada@example.test',
        password: 'a-secure-password',
      }),
    ).rejects.toThrow('delivery staff account was not returned')
  })

  it('preserves the existing user lookup endpoint', async () => {
    getMock.mockResolvedValue(staff)

    await expect(fetchAdminUser('staff-id')).resolves.toEqual(staff)
    expect(getMock).toHaveBeenCalledWith('/admin/users/staff-id', {
      signal: undefined,
    })
  })

  it('fetches one bounded server-side user page from the admin-only endpoint', async () => {
    const page = { items: [staff], pagination: { page: 2, limit: 10, total: 11, totalPages: 2 } }
    getMock.mockResolvedValue(page)

    await expect(fetchAdminUsers({ page: 2, limit: 10 })).resolves.toEqual(page)
    expect(getMock).toHaveBeenCalledWith('/admin/users', { signal: undefined, query: { page: 2, limit: 10 } })
  })

  it('patches only the role to the role-change endpoint', async () => {
    patchMock.mockResolvedValue({ ...staff, role: 'ADMIN' })

    await expect(changeUserRole('staff-id', 'ADMIN')).resolves.toEqual({
      ...staff,
      role: 'ADMIN',
    })
    expect(patchMock).toHaveBeenCalledWith('/admin/users/staff-id/role', {
      role: 'ADMIN',
    })
  })

  it('rejects a role-change response that does not confirm the new role', async () => {
    patchMock.mockResolvedValue(staff)

    await expect(changeUserRole('staff-id', 'ADMIN')).rejects.toThrow(
      'updated role was not returned',
    )
  })

  it('patches only account status to the account-status endpoint', async () => {
    patchMock.mockResolvedValue({ ...staff, status: 'INACTIVE' })
    await expect(changeUserStatus('staff-id', 'INACTIVE')).resolves.toEqual({ ...staff, status: 'INACTIVE' })
    expect(patchMock).toHaveBeenCalledWith('/admin/users/staff-id/status', { status: 'INACTIVE' })
  })
})
