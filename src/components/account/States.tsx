import type { ReactNode } from 'react'
import { Action } from '@/components/ui/Action'

/**
 * Empty and error states.
 *
 * Both are the *same component on purpose*: a page with no orders and a page whose
 * orders could not be loaded have the same shape — a short statement, an optional
 * explanation, and one thing to do next — and a shopper should not be able to tell
 * from the layout which one they are looking at. The copy and the action differ;
 * the structure does not.
 */

type EmptyStateProps = {
  /** Uppercase technical kicker, matching the storefront's editorial voice. */
  eyebrow?: string
  title: string
  /** One sentence on why it is empty and what to do about it. */
  description?: string
  action?: ReactNode
  /** Where the empty state sits. Centred reads as a dead end; left reads as a list. */
  align?: 'left' | 'center'
  className?: string
}

export const EmptyState = ({
  eyebrow,
  title,
  description,
  action,
  align = 'center',
  className = '',
}: EmptyStateProps) => (
  <div
    className={`border border-line bg-paper px-6 py-16 text-center sm:px-10 sm:py-20 ${
      align === 'left' ? 'sm:text-left' : ''
    } ${className}`}
  >
    {eyebrow && <p className="label-micro text-ash">{eyebrow}</p>}
    <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h2>
    {description && (
      <p
        className={`mt-3 text-sm leading-relaxed text-graphite ${
          align === 'left' ? 'sm:max-w-prose' : 'mx-auto max-w-md'
        }`}
      >
        {description}
      </p>
    )}
    {action && <div className="mt-8 flex justify-center">{action}</div>}
  </div>
)

type ErrorStateProps = {
  /** The message from `toUserMessage`, already safe to show. */
  message: string
  onRetry?: () => void
  className?: string
}

export const ErrorState = ({ message, onRetry, className = '' }: ErrorStateProps) => (
  <div
    role="alert"
    className={`border border-signal/30 bg-signal-soft px-6 py-12 text-center sm:px-10 ${className}`}
  >
    <p className="label-micro text-signal">Something went wrong</p>
    <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink">{message}</p>
    {onRetry && (
      <div className="mt-8 flex justify-center">
        <Action variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Action>
      </div>
    )}
  </div>
)

/**
 * A short, non-blocking failure notice for a mutation.
 *
 * `role="status"` rather than `alert`: the page itself is still usable, and
 * interrupting a screen reader mid-form to say a quantity change failed is worse
 * than letting the notice be found at the point of attention.
 */
type InlineNoticeProps = {
  message: string
  tone?: 'error' | 'info'
  onDismiss?: () => void
  className?: string
}

export const InlineNotice = ({
  message,
  tone = 'error',
  onDismiss,
  className = '',
}: InlineNoticeProps) => (
  <div
    role="status"
    className={`flex items-start gap-3 border px-4 py-3 text-sm ${
      tone === 'error' ? 'border-signal/30 bg-signal-soft text-ink' : 'border-line bg-bone text-ink'
    } ${className}`}
  >
    <span className="flex-1 leading-relaxed">{message}</span>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="label-micro shrink-0 text-graphite transition-colors hover:text-ink"
      >
        Dismiss
      </button>
    )}
  </div>
)
