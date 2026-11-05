import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { FeedbackContext } from './feedbackContext'
import type { ConfirmationOptions, FeedbackOptions, FeedbackType } from './feedbackContext'

type FeedbackRequest = {
  id: number
  type: FeedbackType
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  resolve?: (confirmed: boolean) => void
}

const styles = {
  success: {
    icon: CheckCircle2,
    accent: 'border-success/30 bg-success-soft text-success',
    role: 'status',
  },
  error: {
    icon: AlertCircle,
    accent: 'border-signal/30 bg-signal-soft text-signal',
    role: 'alert',
  },
  warning: {
    icon: TriangleAlert,
    accent: 'border-warning/30 bg-warning-soft text-warning',
    role: 'alert',
  },
  info: {
    icon: Info,
    accent: 'border-info/30 bg-info-soft text-info',
    role: 'status',
  },
  confirmation: {
    icon: TriangleAlert,
    accent: 'border-warning/30 bg-warning-soft text-warning',
    role: 'alert',
  },
} as const

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<FeedbackRequest[]>([])
  const nextId = useRef(0)
  const requestsRef = useRef<FeedbackRequest[]>([])

  useEffect(
    () => () => {
      const pending = requestsRef.current
      requestsRef.current = []
      for (const request of pending) request.resolve?.(false)
    },
    [],
  )

  const enqueue = useCallback((request: Omit<FeedbackRequest, 'id'>) => {
    const signature = `${request.type}\n${request.title}\n${request.message}`
    const current = requestsRef.current
    if (current.some((queued) => `${queued.type}\n${queued.title}\n${queued.message}` === signature)) {
      return undefined
    }

    const id = ++nextId.current
    const next = [...current, { ...request, id }]
    requestsRef.current = next
    setRequests(next)
    return id
  }, [])

  const showFeedback = useCallback(
    (options: FeedbackOptions) => {
      enqueue(options)
    },
    [enqueue],
  )

  const confirmFeedback = useCallback(
    (options: ConfirmationOptions) =>
      new Promise<boolean>((resolve) => {
        const id = enqueue({
          ...options,
          type: options.type ?? 'confirmation',
          resolve,
        })
        if (id === undefined) resolve(false)
      }),
    [enqueue],
  )

  const finish = useCallback((id: number, confirmed: boolean) => {
    const request = requestsRef.current.find((entry) => entry.id === id)
    const next = requestsRef.current.filter((entry) => entry.id !== id)
    requestsRef.current = next
    setRequests(next)
    request?.resolve?.(confirmed)
  }, [])

  const active = requests[0]

  return (
    <FeedbackContext.Provider value={{ showFeedback, confirmFeedback }}>
      {children}
      {active && (
        <FeedbackDialog
          key={active.id}
          request={active}
          onClose={() => finish(active.id, false)}
          onConfirm={() => finish(active.id, true)}
        />
      )}
    </FeedbackContext.Provider>
  )
}

function FeedbackDialog({
  request,
  onClose,
  onConfirm,
}: {
  request: FeedbackRequest
  onClose: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isConfirmation = request.resolve !== undefined
  const style = styles[request.type]
  const Icon = style.icon

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined

    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-feedback-primary]')?.focus()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="feedback-title"
      aria-describedby="feedback-message"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault()
        if (!isConfirmation) onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isConfirmation) onClose()
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-line bg-paper p-0 text-ink shadow-[var(--shadow-raised)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px] motion-safe:animate-[feedback-enter_180ms_ease-out]"
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-full border ${style.accent}`}
          >
            <Icon size={21} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <h2 id="feedback-title" className="text-lg font-semibold tracking-tight text-ink">
              {request.title}
            </h2>
            <p
              id="feedback-message"
              role={style.role}
              className="mt-2 text-sm leading-relaxed text-graphite"
            >
              {request.message}
            </p>
          </div>
          {!isConfirmation && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close message"
              data-feedback-primary
              className="grid size-9 shrink-0 place-items-center rounded-lg text-graphite transition-colors hover:bg-bone hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <X size={17} aria-hidden />
            </button>
          )}
        </div>

        <div className="mt-7 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          {isConfirmation ? (
            <>
              <Action variant="outline" size="sm" onClick={onClose}>
                {request.cancelLabel ?? 'Cancel'}
              </Action>
              <Action
                variant={request.type === 'warning' ? 'warning' : 'solid'}
                size="sm"
                onClick={onConfirm}
                data-feedback-primary
                className="rounded-md"
              >
                {request.confirmLabel ?? 'Confirm'}
              </Action>
            </>
          ) : (
            <Action size="sm" onClick={onClose} data-feedback-primary className="rounded-md">
              Okay
            </Action>
          )}
        </div>
      </div>
    </dialog>
  )
}
