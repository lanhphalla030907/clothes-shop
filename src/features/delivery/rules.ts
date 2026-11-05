import type {
  DeliveryAssignment,
  DeliveryManagerOrderDetail,
  DeliveryStaff,
} from '@/types/api'

export const openDeliveryAssignment = (
  order: DeliveryManagerOrderDetail | undefined,
): DeliveryAssignment | undefined =>
  order?.deliveryAssignments.find(
    (assignment) =>
      assignment.endedAt === null &&
      assignment.status !== 'DELIVERED' &&
      assignment.status !== 'RETURNED',
  )

export const hasValidActiveDeliveryAssignment = (
  assignment: DeliveryAssignment | undefined,
  activeStaff: readonly DeliveryStaff[] | undefined,
): boolean =>
  assignment !== undefined &&
  activeStaff?.some((staff) => staff.id === assignment.deliveryStaffId) === true
