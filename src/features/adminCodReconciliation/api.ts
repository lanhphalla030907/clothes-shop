import { apiGetOne, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AdminCodReconciliationExecution,
  AdminCodReconciliationListDto,
  AdminCodReconciliationListQuery,
  AdminCodReconciliationRunDetail,
  AdminCodReconciliationRunHistory,
  AdminCodReconciliationRunQuery,
  AdminCodReconciliationSummary,
  ManualReconciliationTrigger,
  UUID,
} from '@/types/api'

export const fetchAdminCodReconciliationRuns = (
  query: AdminCodReconciliationRunQuery,
  signal?: AbortSignal,
): Promise<AdminCodReconciliationRunHistory> =>
  apiGetOne<AdminCodReconciliationRunHistory>(`${API.adminCodReconciliation}/runs`, {
    signal,
    query: {
      page: query.page,
      limit: query.limit,
      status: query.status,
      triggerType: query.triggerType,
      startDate: query.startDate,
      endDate: query.endDate,
    },
  })

export const fetchAdminCodReconciliationRun = (
  id: UUID,
  options: { signal?: AbortSignal; query?: Record<string, string | number> } = {},
): Promise<AdminCodReconciliationRunDetail> =>
  apiGetOne<AdminCodReconciliationRunDetail>(
    `${API.adminCodReconciliation}/runs/${id}`,
    options,
  )

export const triggerAdminCodReconciliation = (
  body: ManualReconciliationTrigger,
): Promise<AdminCodReconciliationExecution> =>
  apiPost<AdminCodReconciliationExecution>(
    `${API.adminCodReconciliation}/runs/trigger`,
    body,
  ).then(requireExecution)

const requireExecution = (
  result: AdminCodReconciliationExecution | undefined,
): AdminCodReconciliationExecution => {
  if (result === undefined) {
    throw new Error('The reconciliation run was not returned by the server.')
  }
  return result
}

/** Fetches the live COD reconciliation order listing with supported filters. */
export const fetchAdminCodReconciliationRecords = (
  query: AdminCodReconciliationListQuery,
  signal?: AbortSignal,
): Promise<AdminCodReconciliationListDto> =>
  apiGetOne<AdminCodReconciliationListDto>(`${API.adminCodReconciliation}`, {
    signal,
    query: {
      page: query.page,
      limit: query.limit,
      startDate: query.startDate,
      endDate: query.endDate,
      staffId: query.staffId,
      orderNumber: query.orderNumber,
      status: query.status,
      currency: query.currency,
    },
  })

/** Fetches currency-separated COD reconciliation totals from the summary endpoint. */
export const fetchAdminCodReconciliationSummary = (
  signal?: AbortSignal,
): Promise<AdminCodReconciliationSummary> =>
  apiGetOne<AdminCodReconciliationSummary>(`${API.adminCodReconciliation}/summary`, { signal })
