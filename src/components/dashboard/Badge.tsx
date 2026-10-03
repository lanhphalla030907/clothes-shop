import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Sparkline } from '@/components/dashboard/Sparkline'

type Tone = 'neutral' | 'strong' | 'outline' | 'muted' | 'signal'

const tones: Record<Tone, string> = {
  /** Resting state — hairline only. */
  neutral: 'border-line text-graphite',
  /** The finished or most important state — solid ink, the loudest mark here. */
  strong: 'border-ink bg-ink text-paper',
  /** In-flight — ink outline, "claimed but unfinished". */
  outline: 'border-ink text-ink',
  /** De-emphasised — bone fill. */
  muted: 'border-transparent bg-bone text-graphite',
  /** Needs attention — the single semantic accent. */
  signal: 'border-signal bg-signal-soft text-signal',
}

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  /** Prefix a filled dot — useful when the label alone is ambiguous. */
  dot?: boolean
  className?: string
}

/**
 * Status chip. Square, hairline or ink fill, 12px caps — large enough to read
 * without hunting, small enough not to shout over the value beside it.
 */
export function Badge({ children, tone = 'neutral', dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1 font-mono text-[10px] uppercase leading-none tracking-[0.1em] ${tones[tone]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden
          className={`size-1 shrink-0 ${tone === 'strong' ? 'bg-paper' : 'bg-current'}`}
        />
      )}
      {children}
    </span>
  )
}

/* ------------------------------- movement -------------------------------- */

interface DeltaProps {
  /** Percentage change. Sign carries the direction. */
  value: number
  /** Whether the direction is good, which is independent of the sign. */
  favourable?: boolean
  /** Quiet comparison text after the arrow. */
  suffix?: string
  className?: string
}

/**
 * Movement marker. Positive is ink with an up arrow; negative borrows the signal
 * red. Because `favourable` is passed separately, a *rising* return rate shows in
 * red and a *falling* one never does.
 */
export function Delta({ value, favourable = true, suffix, className = '' }: DeltaProps) {
  const flat = Math.abs(value) < 0.05
  const positive = value > 0
  const good = flat ? null : positive === favourable
  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-0.5 font-mono text-xs tabular-nums ${
          good === null ? 'text-ash' : good ? 'text-ink' : 'text-signal'
        }`}
      >
        <Icon size={13} strokeWidth={1.6} aria-hidden />
        {flat ? '0.0' : `${Math.abs(value).toFixed(1)}%`}
      </span>
      {suffix && <span className="text-xs text-graphite">{suffix}</span>}
    </span>
  )
}

/* -------------------------------- metrics -------------------------------- */

export interface MetricTile {
  label: string
  value: string
  delta?: number
  favourable?: boolean
  footnote?: string
  /** Small trend drawn under the figure, full tile width. */
  spark?: number[]
  sparkTone?: 'ink' | 'signal'
}

const COLUMN_CLASSES = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
} as const

/**
 * The metric bar. One bordered block divided by 1px rules rather than four
 * separate boxes — it reads as a single figure row, and it removes three
 * borders from the page. Cells use the storefront's `gap-px` + `bg-line`
 * hairline-list trick.
 */
export function StatGrid({
  metrics,
  columns = 4,
}: {
  metrics: MetricTile[]
  columns?: 2 | 3 | 4
}) {
  return (
    <div className={`grid gap-px border border-line bg-line ${COLUMN_CLASSES[columns]}`}>
      {metrics.map((metric) => (
        <div key={metric.label} className="flex flex-col gap-5 bg-paper px-5 py-5 sm:px-6">
          <span className="font-mono text-[10px] uppercase leading-none tracking-[0.14em] text-graphite">
            {metric.label}
          </span>

          <div>
            <p className="font-mono text-[1.6rem] leading-none tracking-[-0.02em] tabular-nums sm:text-[1.75rem]">
              {metric.value}
            </p>
            {(metric.delta !== undefined || metric.footnote) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {metric.delta !== undefined && (
                  <Delta value={metric.delta} favourable={metric.favourable} />
                )}
                {metric.footnote && (
                  <span className="text-xs text-ash">{metric.footnote}</span>
                )}
              </div>
            )}
          </div>

          {metric.spark && metric.spark.length > 1 && (
            <Sparkline
              values={metric.spark}
              tone={metric.sparkTone ?? 'ink'}
              className="h-8 w-full"
            />
          )}
        </div>
      ))}
    </div>
  )
}
