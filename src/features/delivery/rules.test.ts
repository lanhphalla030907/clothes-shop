import { describe, expect, it } from 'vitest'
import type {
  DeliveryAssignment,
  DeliveryManagerOrderDetail,
  DeliveryStaff,
} from '@/types/api'
import {
  hasValidActiveDeliveryAssignment,
  openDeliveryAssignment,
} from './rules'

const staff: DeliveryStaff = {
  id: 'staff-1',
  firstName: 'Ada',
  lastName: 'Courier',
  email: 'ada@example.test',
}

const assignment: DeliveryAssignment = {
  id: 'assignment-1',
  orderId: 'order-1',
  deliveryStaffId: staff.id,
  status: 'ASSIGNED',
  assignedAt: '2026-10-01T00:00:00.000Z',
  startedAt: null,
  endedAt: null,
  deliveryStaff: staff,
}

const order: DeliveryManagerOrderDetail = {
  id: 'order-1',
  status: 'CONFIRMED',
  deliveryAssignments: [assignment],
}

describe('delivery assignment rules', () => {
  it('finds an open, non-terminal assignment', () => {
    expect(openDeliveryAssignment(order)).toBe(assignment)
  })

  it.each(['DELIVERED', 'RETURNED'] as const)(
    'does not treat a %s assignment as open',
    (status) => {
      expect(
        openDeliveryAssignment({
          ...order,
          deliveryAssignments: [{ ...assignment, status }],
        }),
      ).toBeUndefined()
    },
  )

  it('requires an active staff-list entry for a valid assignment', () => {
    expect(hasValidActiveDeliveryAssignment(assignment, [staff])).toBe(true)
    expect(hasValidActiveDeliveryAssignment(assignment, [])).toBe(false)
    expect(hasValidActiveDeliveryAssignment(undefined, [staff])).toBe(false)
  })
})
