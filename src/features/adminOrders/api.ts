import { apiGetOne, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AdminOrderDetail,
  AdminOrderListQuery,
  AdminOrderListResponse,
  UUID,
} from '@/types/api'
export const fetchAdminOrders = (
  query: AdminOrderListQuery,
  signal?: AbortSignal,
): Promise<AdminOrderListResponse> =>
  apiGetOne<AdminOrderListResponse>(API.adminOrders, {
    signal,
    query: {
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
    },
  })

export const fetchAdminOrder = (
  id: UUID,
  signal?: AbortSignal,
): Promise<AdminOrderDetail> =>
  apiGetOne<AdminOrderDetail>(`${API.adminOrders}/${id}`, { signal })

export const downloadAdminOrderReceipt = (id: UUID): Promise<Blob> =>
  apiGetOne<Blob>(`${API.adminOrders}/${id}/receipt`, {
    responseType: 'blob',
  })

export const cancelAdminOrder = (id: UUID): Promise<AdminOrderDetail> =>
  apiPost<AdminOrderDetail>(`${API.adminOrders}/${id}/cancel`, undefined).then(
    requireAdminOrder,
  )

export const confirmCodAdminOrder = (id: UUID): Promise<AdminOrderDetail> =>
  apiPost<AdminOrderDetail>(
    `${API.adminOrders}/${id}/confirm-cod`,
    undefined,
  ).then(requireAdminOrder)

export const shipAdminOrder = (id: UUID): Promise<AdminOrderDetail> =>
  apiPost<AdminOrderDetail>(`${API.adminOrders}/${id}/ship`, undefined).then(
    requireAdminOrder,
  )

const requireAdminOrder = (order: AdminOrderDetail | undefined): AdminOrderDetail => {
  if (order === undefined) {
    throw new Error('The order was not returned by the server.')
  }
  return order
}
