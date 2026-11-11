import { apiGetOne } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AdminCustomerDetail,
  AdminCustomerListQuery,
  AdminCustomerListResponse,
  AdminCustomerStats,
  UUID,
} from '@/types/api'

/** One page of the customer listing — server-side pagination, search, filters, sort. */
export const fetchAdminCustomers = (
  query: AdminCustomerListQuery,
  signal?: AbortSignal,
): Promise<AdminCustomerListResponse> =>
  apiGetOne<AdminCustomerListResponse>(API.adminCustomers, {
    signal,
    query: {
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      registeredFrom: query.registeredFrom,
      registeredTo: query.registeredTo,
      orderActivity: query.orderActivity,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    },
  })

/** One customer, read-only, with order statistics, recent orders and addresses. */
export const fetchAdminCustomer = (
  id: UUID,
  signal?: AbortSignal,
): Promise<AdminCustomerDetail> =>
  apiGetOne<AdminCustomerDetail>(`${API.adminCustomers}/${id}`, { signal })

/** The headline customer counters. */
export const fetchAdminCustomerStats = (
  signal?: AbortSignal,
): Promise<AdminCustomerStats> =>
  apiGetOne<AdminCustomerStats>(`${API.adminCustomers}/stats`, { signal })
