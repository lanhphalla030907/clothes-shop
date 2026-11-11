import type { ISODateTime, UUID } from './common'

/**
 * `GET /feedback`, `POST /feedback`, `PATCH /feedback/:id`, `DELETE /feedback/:id`
 * (customer's own rows), plus the administrative and public listings.
 *
 * Every figure is a fixed two-decimal string and timestamps are ISO-8601 text,
 * matching what the server sends.
 */

/** The publication status of a feedback row, as stored in `feedbacks.status`. */
export const FEEDBACK_STATUS = {
  PUBLISHED: 'PUBLISHED',
  UNPUBLISHED: 'UNPUBLISHED',
} as const

export type FeedbackStatus = (typeof FEEDBACK_STATUS)[keyof typeof FEEDBACK_STATUS]

/** One row of the customer's own feedback listing and of a single-row read. */
export interface Feedback {
  id: UUID
  customerId: UUID
  title: string
  message: string
  status: FeedbackStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** One page of the customer's own feedback. */
export interface CustomerFeedbackPage {
  items: Feedback[]
  page: number
  limit: number
  total: number
  totalPages: number
}

/** One row of the administrative feedback listing, with the owning customer. */
export interface AdminFeedbackSummary {
  id: UUID
  customerId: UUID
  customerName: string
  customerEmail: string
  title: string
  message: string
  status: FeedbackStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Pagination metadata beside the administrative listing page. */
export interface AdminFeedbackPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** The administrative feedback listing. */
export interface AdminFeedbackListResponse {
  items: AdminFeedbackSummary[]
  pagination: AdminFeedbackPagination
}

/** One row of the public published feedback listing. */
export interface PublicFeedbackItem {
  id: UUID
  customerName: string
  title: string
  message: string
  createdAt: ISODateTime
}

/** One page of public published feedback. */
export interface PublicFeedbackPage {
  items: PublicFeedbackItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

/** What a customer submits to create their own feedback. */
export interface CreateFeedbackInput {
  title: string
  message: string
}

/** What a customer submits to edit their own feedback. */
export interface UpdateFeedbackInput {
  title?: string
  message?: string
}

/** What an administrator submits to create feedback for a customer. */
export interface AdminCreateFeedbackInput {
  customerId: UUID
  title: string
  message: string
}

/** What an administrator submits to edit a feedback row. */
export interface AdminUpdateFeedbackInput {
  title?: string
  message?: string
}

/** What an administrator submits to publish or unpublish a feedback row. */
export interface SetFeedbackStatusInput {
  status: FeedbackStatus
}

/** Human-readable label for a status. */
export const feedbackStatusLabel = (status: FeedbackStatus): string => {
  if (status === FEEDBACK_STATUS.PUBLISHED) return 'Published'
  return 'Unpublished'
}

/** Whether a status is shown on the storefront. */
export const isPublished = (status: FeedbackStatus): boolean =>
  status === FEEDBACK_STATUS.PUBLISHED
