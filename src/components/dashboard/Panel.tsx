import type { ReactNode } from 'react'

interface PanelProps {
  /** Section heading — sans, uppercase, 13px. Readable at a glance. */
  title?: string
  /** Quiet context on the right of the heading. */
  meta?: string
  /** Trailing control: a search field, a chip group, a link. */
  action?: ReactNode
  children: ReactNode
  /** Body has no padding — for tables and lists that own their own insets. */
  flush?: boolean
  /** Drop the border entirely and rely on spacing alone. */
  bare?: boolean
  className?: string
}

/**
 * The dashboard's only container. A hairline box on `bg-paper` over the
 * `bg-canvas` page — the storefront's flat-surface-plus-rule idiom, rotated
 * from horizontal lists to vertical panels.
 *
 * Borders are the exception, not the default: nesting them is what made the
 * first pass feel noisy, so `bare` is there for the cases where a panel would
 * just be a second border inside a border.
 */
export function Panel({
  title,
  meta,
  action,
  children,
  flush = false,
  bare = false,
  className = '',
}: PanelProps) {
  const hasHeader = Boolean(title || action || meta)

  return (
    <section className={`${bare ? '' : 'border border-line bg-paper'} ${className}`}>
      {hasHeader && (
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-baseline gap-3">
            {title && (
              <h2 className="truncate text-[13px] font-bold tracking-[-0.01em] uppercase">
                {title}
              </h2>
            )}
            {meta && <span className="truncate text-xs text-graphite">{meta}</span>}
          </div>
          {action && <div className="flex min-w-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={flush ? '' : 'px-5 py-5 sm:px-6 sm:py-6'}>{children}</div>
    </section>
  )
}

/**
 * Secondary page block: a heading with a rule, then content. No box.
 *
 * `title` goes in the heading, `meta` sits beside it — a Section that needs its
 * own bordered Panel underneath (a table, say) should not repeat the title.
 */
export function Section({
  title,
  meta,
  action,
  children,
  className = '',
}: {
  title: string
  meta?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="text-[13px] font-bold tracking-[-0.01em] uppercase">{title}</h2>
          {meta && <span className="truncate text-xs text-graphite">{meta}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
