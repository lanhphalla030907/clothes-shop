import { createContext, useContext } from 'react'

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'confirmation'

export type FeedbackOptions = {
  type: Exclude<FeedbackType, 'confirmation'>
  title: string
  message: string
}

export type ConfirmationOptions = Omit<FeedbackOptions, 'type'> & {
  type?: 'warning' | 'confirmation'
  confirmLabel?: string
  cancelLabel?: string
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
