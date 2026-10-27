import type { ReactNode } from 'react'

/**
 * The admin area's page title block, matching the dashboard's editorial voice:
 * a technical eyebrow, a display headline, an optional description and one
 * primary action opposite the title on wide screens.
 */

type AdminPageHeaderProps = {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

export function AdminPageHeader({ eyebrow, title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex items-center gap-4">
          <span className="h-px w-8 bg-line" aria-hidden />
          <span className="label-micro text-graphite">{eyebrow}</span>
        </div>
        <h1 className="type-display mt-6 text-3xl leading-[0.88] sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 text-sm leading-relaxed text-graphite">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}