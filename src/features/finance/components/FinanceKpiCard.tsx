import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/account/Skeleton'
import { FinanceInfoTip } from './FinanceInfoTip'

export type FinanceKpiTone = 'neutral' | 'positive' | 'negative' | 'info' | 'warning'

type FinanceKpiCardProps = {
  label: string
  value: ReactNode
  hint?: string
  tooltip?: string
  badge?: ReactNode
  footer?: ReactNode
  loading?: boolean
  valueClassName?: string
  /**
   * Semantic accent. The amount stays the dominant element; the tone drives the
   * small accent rule and the optional icon chip, not the whole card.
   */
  tone?: FinanceKpiTone
  /** `hero` is reserved for the two headline metrics of a currency panel. */
  emphasis?: 'default' | 'hero'
  icon?: LucideIcon
  className?: string
}

const toneAccent: Record<FinanceKpiTone, string> = {
  neutral: 'bg-line',
  positive: 'bg-emerald-500',
  negative: 'bg-rose-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
}

const toneValue: Record<FinanceKpiTone, string> = {
  neutral: 'text-ink',
  positive: 'text-emerald-700',
  negative: 'text-rose-700',
  info: 'text-ink',
  warning: 'text-ink',
}

const toneIcon: Record<FinanceKpiTone, string> = {
  neutral: 'bg-bone text-graphite',
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-rose-50 text-rose-700',
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-amber-50 text-amber-700',
}

/**
 * One KPI in a currency-separated finance grid.
 *
 * The card never decides whether a figure is known; callers pass `Unknown` for a
 * null COGS or profit value rather than a zero. The tone is presentational only:
 * no value is recalculated or reinterpreted by the card.
 */
export function FinanceKpiCard({
  label,
  value,
  hint,
  tooltip,
  badge,
  footer,
  loading = false,
  valueClassName,
  tone = 'neutral',
  emphasis = 'default',
  icon: Icon,
  className = '',
}: FinanceKpiCardProps) {
  const isHero = emphasis === 'hero'
  const resolvedValueClassName =
    valueClassName ??
    `font-mono leading-none font-semibold tabular-nums ${toneValue[tone]} ${
      isHero ? 'text-[1.9rem] sm:text-[2.15rem]' : 'text-[1.5rem]'
    }`

  return (
    <div
      className={`group relative flex min-w-0 flex-col bg-paper px-5 py-5 transition-colors hover:bg-bone sm:px-6 ${
        isHero ? 'sm:py-6' : ''
      } ${className}`}
    >
      {isHero && (
        <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${toneAccent[tone]}`} />
      )}
      <dt className="flex items-start gap-2 text-[12px] font-medium text-graphite">
        {Icon && (
          <span
            aria-hidden
            className={`grid size-7 shrink-0 place-items-center rounded-md ${toneIcon[tone]}`}
          >
            <Icon size={14} strokeWidth={1.8} />
          </span>
        )}
        <span className="leading-tight">{label}</span>
        {tooltip && <FinanceInfoTip text={tooltip} />}
      </dt>
      <dd className="mt-2.5 flex flex-1 flex-col">
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <div className={resolvedValueClassName}>{value}</div>
        )}
        {badge && <div className="mt-2 flex flex-wrap gap-1.5">{badge}</div>}
        {hint && <p className="mt-2 text-[11.5px] leading-relaxed text-ash">{hint}</p>}
        {footer}
      </dd>
    </div>
  )
}