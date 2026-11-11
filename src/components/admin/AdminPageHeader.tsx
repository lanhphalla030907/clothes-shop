import type { ReactNode } from 'react'

/**
 * The admin area's page title block.
 *
 * Functional headings are set in the sans face at a readable size. The poster
 * display treatment belongs to the storefront; an operator scanning a table
 * needs the title to be distinct, not enormous.
 */

type AdminPageHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

export function AdminPageHeader({ eyebrow, title, description, action }: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="max-w-3xl">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.09em] text-graphite/80">
          {eyebrow}
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-graphite">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
    </header>
  )
}
