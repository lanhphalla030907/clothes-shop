import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetOne, apiPost } from '@/lib/api/client'
import { createDeliveryStaff, fetchAdminUser } from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetOne: vi.fn(),
  apiPost: vi.fn(),
}))

const getMock = vi.mocked(apiGetOne)
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
})
