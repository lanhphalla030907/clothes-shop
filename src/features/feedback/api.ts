import { apiDelete, apiGetOne, apiPatch, apiPost } from '@/lib/api/client'
import { API } from '@/lib/api/config'
import type {
  AdminCreateFeedbackInput,
  AdminFeedbackListResponse,
  AdminUpdateFeedbackInput,
  CreateFeedbackInput,
  CustomerFeedbackPage,
  Feedback,
  PublicFeedbackPage,
  SetFeedbackStatusInput,
  UpdateFeedbackInput,
} from '@/types/api'

/**
 * A customer's own feedback: create, list, read, edit and delete.
 *
 * Every call is scoped to the caller by the session — the server re-checks
 * ownership, so a stale page cannot touch someone else's row.
 */

/** One page of the caller's own feedback, newest first. */
export const fetchFeedbackPage = (
  query: { page?: number; limit?: number; search?: string; status?: string },
  signal?: AbortSignal,
): Promise<CustomerFeedbackPage> =>
  apiGetOne<CustomerFeedbackPage>(API.feedback, { signal, query })

/** One of the caller's own feedback rows. */
export const fetchFeedback = (id: string, signal?: AbortSignal): Promise<Feedback> =>
  apiGetOne<Feedback>(`${API.feedback}/${id}`, { signal })

/** Leaves `UNPUBLISHED` until an administrator publishes it. */
export const createFeedback = (
  input: CreateFeedbackInput,
  signal?: AbortSignal,
): Promise<Feedback> =>
  apiPost<Feedback>(API.feedback, input, { signal }).then(requireFeedback)

/** Edits the caller's own row. Absent fields are left untouched. */
export const updateFeedback = (
  id: string,
  input: UpdateFeedbackInput,
  signal?: AbortSignal,
): Promise<Feedback> =>
  apiPatch<Feedback>(`${API.feedback}/${id}`, input, { signal }).then(requireFeedback)

/** Removes the caller's own row. */
export const deleteFeedback = (id: string, signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(`${API.feedback}/${id}`, { signal })

/**
 * Administrative feedback management. Every call requires an administrator
 * session; the server refuses any other role.
 */

/** One page of all feedback, with search and status filter. */
export const fetchAdminFeedbackPage = (
  query: { page?: number; limit?: number; search?: string; status?: string },
  signal?: AbortSignal,
): Promise<AdminFeedbackListResponse> =>
  apiGetOne<AdminFeedbackListResponse>(API.adminFeedback, { signal, query })

/** Creates feedback for an existing customer account. */
export const createAdminFeedback = (
  input: AdminCreateFeedbackInput,
  signal?: AbortSignal,
): Promise<Feedback> =>
  apiPost<Feedback>(API.adminFeedback, input, { signal }).then(requireFeedback)

/** One feedback row, with its customer. */
export const fetchAdminFeedback = (id: string, signal?: AbortSignal): Promise<Feedback> =>
  apiGetOne<Feedback>(`${API.adminFeedback}/${id}`, { signal })

/** Edits a feedback row's title and/or message. */
export const updateAdminFeedback = (
  id: string,
  input: AdminUpdateFeedbackInput,
  signal?: AbortSignal,
): Promise<Feedback> =>
  apiPatch<Feedback>(`${API.adminFeedback}/${id}`, input, { signal }).then(requireFeedback)

/** Removes a feedback row. */
export const deleteAdminFeedback = (id: string, signal?: AbortSignal): Promise<void> =>
  apiDelete<void>(`${API.adminFeedback}/${id}`, { signal })

/** Publishes or unpublishes one feedback row. */
export const setFeedbackStatus = (
  id: string,
  input: SetFeedbackStatusInput,
  signal?: AbortSignal,
): Promise<Feedback> =>
  apiPatch<Feedback>(`${API.adminFeedback}/${id}/status`, input, { signal }).then(
    requireFeedback,
  )

/**
 * Public feedback: published rows only, open to every visitor.
 */

/** One page of published feedback, newest first. */
export const fetchPublishedFeedbackPage = (
  query: { page?: number; limit?: number; search?: string; status?: string },
  signal?: AbortSignal,
): Promise<PublicFeedbackPage> =>
  apiGetOne<PublicFeedbackPage>(API.publicFeedback, { signal, query })

const requireFeedback = (feedback: Feedback | undefined): Feedback => {
  if (feedback === undefined) {
    throw new Error('The feedback was not returned by the server.')
  }
  return feedback
}
