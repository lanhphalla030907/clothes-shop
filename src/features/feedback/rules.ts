import { FEEDBACK_STATUS, type FeedbackStatus } from '@/types/api'

/**
 * Client-side rules for feedback. These decide what to offer in the UI; the
 * server re-checks ownership and authorisation on every request, so nothing
 * here is a security boundary.
 */

/** The page sizes the feedback listings accept, mirrored from the server. */
export const FEEDBACK_PAGE_SIZES = [10, 20, 50, 100] as const

export type FeedbackPageSize = (typeof FEEDBACK_PAGE_SIZES)[number]

export const DEFAULT_FEEDBACK_PAGE_SIZE = 20

/** Whether a status is shown on the storefront. */
export const isPublished = (status: FeedbackStatus): boolean =>
  status === FEEDBACK_STATUS.PUBLISHED

/** Human-readable label for a status. */
export const feedbackStatusLabel = (status: FeedbackStatus): string => {
  if (status === FEEDBACK_STATUS.PUBLISHED) return 'Published'
  return 'Unpublished'
}

/** Status option labels for a filter select. */
export const FEEDBACK_FILTER_OPTIONS: readonly { value: FeedbackStatus; label: string }[] = [
  { value: FEEDBACK_STATUS.PUBLISHED, label: 'Published' },
  { value: FEEDBACK_STATUS.UNPUBLISHED, label: 'Unpublished' },
] as const

/** Maximum lengths mirrored from the DTO validation. */
export const FEEDBACK_LIMITS = {
  title: 200,
  message: 5000,
} as const
