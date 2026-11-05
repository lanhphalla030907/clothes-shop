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
    <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="max-w-2xl">
        <p className="eyebrow text-graphite">{eyebrow}</p>
        <h1 className="mt-2.5 text-[1.65rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-graphite">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div>}
    </header>
  )
}
