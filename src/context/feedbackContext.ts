import { createContext, useContext } from 'react'

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'confirmation'

export type FeedbackOptions = {
  type: Exclude<FeedbackType, 'confirmation'>
  title: string
  message: string
}

export type ConfirmationOptions = Omit<FeedbackOptions, 'type'> & {
  /** Confirmations are normally warnings, but login-required is informational. */
  type?: FeedbackType
  confirmLabel?: string
  /** `null` hides the secondary action when there is only one honest choice. */
  cancelLabel?: string | null
}

interface FeedbackContextValue {
  showFeedback: (options: FeedbackOptions) => void
  confirmFeedback: (options: ConfirmationOptions) => Promise<boolean>
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export const useFeedback = (): FeedbackContextValue => {
  const value = useContext(FeedbackContext)
  if (value === null) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return value
}
