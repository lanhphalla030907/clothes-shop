import type { ReactNode } from 'react'

type FinanceSectionHeadingProps = {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

/** A consistent heading for a finance panel. */
export function FinanceSectionHeading({
  eyebrow,
  title,
  description,
  action,
}: FinanceSectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="max-w-3xl">
        <p className="eyebrow text-ink/70">{eyebrow}</p>
        <h2 className="mt-2 text-[1.35rem] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[1.5rem]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-graphite">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
