import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetOne, apiPost } from '@/lib/api/client'
import {
  assignDeliveryToStaff,
  fetchActiveDeliveryStaff,
  fetchDeliveryManagerOrder,
} from './api'

vi.mock('@/lib/api/client', () => ({
  apiGetOne: vi.fn(),
  apiPost: vi.fn(),
}))

const getMock = vi.mocked(apiGetOne)
const postMock = vi.mocked(apiPost)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('delivery manager API', () => {
  it('loads active delivery staff with cancellation support', async () => {
    const signal = new AbortController().signal
    const staff = [
      {
        id: 'staff-1',
        firstName: 'Ada',
        lastName: 'Courier',
        email: 'ada@test',
      },
    ]
    getMock.mockResolvedValue(staff)

    await expect(fetchActiveDeliveryStaff(signal)).resolves.toBe(staff)
    expect(getMock).toHaveBeenCalledWith('/delivery/manager/staff', { signal })
  })

  it('loads assignment history for one order', async () => {
    const signal = new AbortController().signal
    const details = {
      id: 'order-1',
      status: 'CONFIRMED',
      deliveryAssignments: [],
    }
    getMock.mockResolvedValue(details)

    await expect(fetchDeliveryManagerOrder('order-1', signal)).resolves.toBe(
      details,
    )
    expect(getMock).toHaveBeenCalledWith('/delivery/manager/orders/order-1', {
      signal,
    })
  })

  it('uses the existing manager assignment endpoint', async () => {
    const assignment = { id: 'assignment-1' }
    postMock.mockResolvedValue(assignment)

    await expect(assignDeliveryToStaff('order-1', 'staff-1')).resolves.toBe(
      assignment,
    )
    expect(postMock).toHaveBeenCalledWith('/delivery/manager/assign', {
      orderId: 'order-1',
      deliveryStaffId: 'staff-1',
    })
  })
})
