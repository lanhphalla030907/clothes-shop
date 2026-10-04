import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * A modal dialog.
 *
 * Built on `<dialog>` rather than a hand-rolled overlay, which gets three things
 * for free that are easy to forget: the browser's inert background (so Tab cannot
 * wander into the page behind), Escape to close, and the correct `role` and
 * labelling. What is added is the styling and focus placement.
 *
 * ## Mounted means open
 *
 * There is no `open` prop. The dialog is `showModal()` on mount and closed on
 * unmount, so a caller writes `{editing && <Modal …>}` and there is no third
 * state to get wrong — no "rendered but hidden", and no way to close it by
 * forgetting to flip a flag.
 *
 * Closing is always the caller's decision — `onClose` fires for the close button,
 * Escape and a click on the backdrop, and the caller decides whether that means
 * discarding an unsaved form.
 */

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Footer actions, usually a cancel/confirm pair. */
  footer?: ReactNode
  className?: string
}

export const Modal = ({ title, onClose, children, footer, className = '' }: ModalProps) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined

    dialog.showModal()
    // Focus the first field rather than the close button, so a keyboard user
    // starts where they are about to type.
    const first = dialog.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')
    first?.focus()

    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // A click landing on the dialog element itself is a click on the backdrop.
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className={`m-auto w-[min(38rem,calc(100vw-2rem))] border border-line bg-paper p-0 backdrop:bg-ink/40 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
        <button
          type="button"
          data-close
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 place-items-center text-graphite transition-colors hover:text-ink"
        >
          <X size={15} strokeWidth={1.5} />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-6 py-6">{children}</div>

      {footer && <div className="flex justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  )
}
