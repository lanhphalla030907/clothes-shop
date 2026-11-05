import { apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  CodCollection,
  CodCollectionPage,
  CodCollectionsSummary,
  DeliveryAssignmentPage,
  DeliveryAssignmentStatus,
  DeliveryStaffAssignmentDetail,
  UUID,
} from '@/types/api'

export const fetchMyAssignments = (
  query: { status?: DeliveryAssignmentStatus; page: number; limit: number },
  signal?: AbortSignal,
): Promise<DeliveryAssignmentPage> =>
  apiGetOne<DeliveryAssignmentPage>(`${API.deliveryStaff}/assignments`, {
    signal,
    query,
  })

export const fetchMyAssignment = (
  assignmentId: UUID,
  signal?: AbortSignal,
): Promise<DeliveryStaffAssignmentDetail> =>
  apiGetOne<DeliveryStaffAssignmentDetail>(
    `${API.deliveryStaff}/assignments/${assignmentId}`,
    { signal },
  )

export const updateMyAssignmentStatus = (
  assignmentId: UUID,
  status: DeliveryAssignmentStatus,
  notes?: string,
): Promise<void> =>
  apiPatch<void>(
    `${API.deliveryStaff}/assignments/${assignmentId}/status`,
    { status, ...(notes ? { notes } : {}) },
  ).then(requireResponse)

export const collectMyCod = (
  assignmentId: UUID,
  input: { amount: string; currency: string; notes?: string; receiptProof?: File },
): Promise<CodCollection> => {
  const body = new FormData()
  body.set('amount', input.amount)
  body.set('currency', input.currency)
  if (input.notes) body.set('notes', input.notes)
  if (input.receiptProof) body.set('receiptProof', input.receiptProof)

  return apiPost<CodCollection>(
    `${API.deliveryStaff}/assignments/${assignmentId}/collect-cod`,
    body,
  ).then(requireCodCollection)
}

export const fetchMyCodCollections = (
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<CodCollectionPage> =>
  apiGetOne<CodCollectionPage>(`${API.deliveryStaff}/cod-collections`, {
    signal,
    query: { page, limit },
  })

export const fetchMyCodCollectionsSummary = (
  signal?: AbortSignal,
): Promise<CodCollectionsSummary> =>
  apiGetOne<CodCollectionsSummary>(
    `${API.deliveryStaff}/cod-collections/summary`,
    { signal },
  )

const requireResponse = (response: void | undefined): void => {
  if (response === undefined) {
    throw new Error('The assignment status was not updated by the server.')
  }
}

const requireCodCollection = (
  collection: CodCollection | undefined,
): CodCollection => {
  if (collection === undefined) {
    throw new Error('The COD collection was not returned by the server.')
  }
  return collection
}
