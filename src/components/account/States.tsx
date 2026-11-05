import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Action } from '@/components/ui/Action'

/**
 * Empty and error states.
 *
 * Both are the *same shape on purpose*: a page with no orders and a page whose
 * orders could not be loaded both need a short statement, an explanation and one
 * thing to do next. A shopper should not have to decode a different layout to
 * understand which one they are looking at.
 */

type EmptyStateProps = {
  /** Short uppercase kicker, matching the account shell's eyebrow. */
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
    className={`border border-line bg-paper px-6 py-12 sm:px-10 sm:py-16 ${
      align === 'left' ? '' : 'text-center'
    } ${className}`}
  >
    {eyebrow && <p className="eyebrow text-graphite">{eyebrow}</p>}
    <h2 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink sm:text-[1.375rem]">
      {title}
    </h2>
    {description && (
      <p
        className={`mt-2.5 text-sm leading-relaxed text-graphite ${
          align === 'left' ? 'max-w-prose' : 'mx-auto max-w-md'
        }`}
      >
        {description}
      </p>
    )}
    {action && (
      <div className={`mt-6 flex flex-wrap gap-3 ${align === 'left' ? '' : 'justify-center'}`}>
        {action}
      </div>
    )}
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
    className={`border border-signal/25 bg-signal-soft px-6 py-10 sm:px-10 ${className}`}
  >
    <div className="flex items-start gap-3">
      <TriangleAlert size={18} strokeWidth={1.7} aria-hidden className="mt-0.5 shrink-0 text-signal" />
      <div>
        <p className="text-[15px] font-semibold text-ink">Something went wrong</p>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink/80">{message}</p>
      </div>
    </div>
    {onRetry && (
      <div className="mt-6">
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
  tone?: 'error' | 'info' | 'success'
  onDismiss?: () => void
  className?: string
}

const noticeTone = {
  error: 'border-signal/25 bg-signal-soft text-ink',
  info: 'border-info/25 bg-info-soft text-ink',
  success: 'border-success/25 bg-success-soft text-ink',
} as const

export const InlineNotice = ({
  message,
  tone = 'error',
  onDismiss,
  className = '',
}: InlineNoticeProps) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`flex items-start gap-3 border px-4 py-3 text-sm ${noticeTone[tone]} ${className}`}
  >
    <span className="flex-1 leading-relaxed">{message}</span>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-[13px] font-medium text-graphite underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        Dismiss
      </button>
    )}
  </div>
)
