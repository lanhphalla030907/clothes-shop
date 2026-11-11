import { useId, useState } from 'react'
import { Info } from 'lucide-react'

/**
 * A small explanation attached to a financial term.
 *
 * The tooltip is available on hover and keyboard focus, and the button carries
 * the accessible description so the meaning is not mouse-only.
 */
export function FinanceInfoTip({ text }: { text: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex shrink-0 align-middle">
      <button
        type="button"
        aria-label="More information"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        className="grid size-5 place-items-center text-ash transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <Info size={13} strokeWidth={1.8} aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-30 mb-2 w-64 -translate-x-1/2 border border-line bg-paper-pure px-3 py-2 text-left text-[12px] leading-relaxed font-normal text-ink shadow-[var(--shadow-raised)]"
        >
          {text}
        </span>
      )}
    </span>
  )
}
