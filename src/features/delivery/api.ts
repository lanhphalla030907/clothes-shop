import { apiGetOne, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  DeliveryAssignment,
  DeliveryManagerOrderDetail,
  DeliveryStaff,
  UUID,
} from '@/types/api'

export const fetchActiveDeliveryStaff = (
  signal?: AbortSignal,
): Promise<DeliveryStaff[]> =>
  apiGetOne<DeliveryStaff[]>(`${API.deliveryManager}/staff`, { signal })

export const fetchDeliveryManagerOrder = (
  orderId: UUID,
  signal?: AbortSignal,
): Promise<DeliveryManagerOrderDetail> =>
  apiGetOne<DeliveryManagerOrderDetail>(
    `${API.deliveryManager}/orders/${orderId}`,
    { signal },
  )

export const assignDeliveryToStaff = (
  orderId: UUID,
  deliveryStaffId: UUID,
): Promise<DeliveryAssignment> =>
  apiPost<DeliveryAssignment>(`${API.deliveryManager}/assign`, {
    orderId,
    deliveryStaffId,
  }).then(requireDeliveryAssignment)

const requireDeliveryAssignment = (
  assignment: DeliveryAssignment | undefined,
): DeliveryAssignment => {
  if (assignment === undefined) {
    throw new Error('The delivery assignment was not returned by the server.')
  }
  return assignment
}
