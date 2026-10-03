import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Small label above the title — a section name or a period. */
  kicker: string
  title: string
  /** One sentence, not a paragraph. */
  lede?: string
  /** Exactly one primary action belongs here; the rest are secondary. */
  actions?: ReactNode
  /** Key/value pairs set under a rule. */
  facts?: { label: string; value: string }[]
}

/**
 * Page masthead. Same anatomy as the storefront's page headers — hairline rule,
 * micro kicker, expanded uppercase display — but sized for a screen people work
 * in rather than a poster, and never more than one line of lede.
 */
export function PageHeader({ kicker, title, lede, actions, facts }: PageHeaderProps) {
  return (
    <header className="border-b border-line pb-7">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-line" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
              {kicker}
            </span>
          </div>
          <h1 className="mt-4 text-[2.5rem] leading-[0.95] font-extrabold tracking-[-0.035em] uppercase sm:text-[3rem]">
            {title}
          </h1>
          {lede && <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-graphite">{lede}</p>}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {facts && facts.length > 0 && (
        <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-2">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-baseline gap-2">
              <dt className="text-[13px] text-ash">{fact.label}</dt>
              <dd className="font-mono text-[13px] tracking-[0.02em] tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  )
}
