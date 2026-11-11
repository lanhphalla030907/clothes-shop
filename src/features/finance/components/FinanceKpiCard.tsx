import type { ReactNode } from 'react'
import { Skeleton } from '@/components/account/Skeleton'
import { FinanceInfoTip } from './FinanceInfoTip'

type FinanceKpiCardProps = {
  label: string
  value: ReactNode
  hint?: string
  tooltip?: string
  badge?: ReactNode
  footer?: ReactNode
  loading?: boolean
  valueClassName?: string
}

/**
 * One KPI in a currency-separated finance grid.
 *
 * The card never decides whether a figure is known; callers pass `Unknown` for a
 * null COGS or profit value rather than a zero.
 */
export function FinanceKpiCard({
  label,
  value,
  hint,
  tooltip,
  badge,
  footer,
  loading = false,
  valueClassName = 'font-mono text-[1.5rem] leading-none font-semibold tabular-nums text-ink',
}: FinanceKpiCardProps) {
  return (
    <div className="group min-w-0 bg-paper px-5 py-5 sm:px-6 transition-colors hover:bg-bone">
      <dt className="flex items-start gap-1.5 text-[12px] font-medium text-graphite">
        <span className="leading-tight">{label}</span>
        {tooltip && <FinanceInfoTip text={tooltip} />}
      </dt>
      <dd className="mt-2.5">
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <div className={valueClassName}>{value}</div>
        )}
        {badge && <div className="mt-2 flex flex-wrap gap-1.5">{badge}</div>}
        {hint && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ash">{hint}</p>
        )}
        {footer}
      </dd>
    </div>
  )
}
