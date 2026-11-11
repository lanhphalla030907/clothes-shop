import { useState } from 'react'
import { formatMoney } from '@/lib/money'
import type {
  FinanceTrendGranularity,
  RevenueTrendBucket,
} from '@/types/api'
import {
  formatCompactMoney,
  formatPeriodFullLabel,
  formatPeriodLabel,
} from '../utils'

type MetricKey =
  | 'grossSales'
  | 'productDiscounts'
  | 'netProductRevenue'
  | 'shippingRevenue'
  | 'cogs'
  | 'grossProfit'

type Metric = {
  key: MetricKey
  label: string
  color: string
  dash?: string
}

const METRICS: readonly Metric[] = [
  {
    key: 'grossSales',
    label: 'Gross product sales',
    color: '#0b0b0b',
  },
  {
    key: 'productDiscounts',
    label: 'Product discounts',
    color: '#8a857c',
    dash: '5 3',
  },
  {
    key: 'netProductRevenue',
    label: 'Net product revenue',
    color: '#2d5f8a',
  },
  {
    key: 'shippingRevenue',
    label: 'Shipping revenue',
    color: '#2e7d52',
    dash: '7 3',
  },
  {
    key: 'cogs',
    label: 'COGS',
    color: '#8a5a2b',
    dash: '2 3',
  },
  {
    key: 'grossProfit',
    label: 'Known-cost gross profit',
    color: '#b8452e',
  },
]

const WIDTH = 900
const HEIGHT = 360
const PADDING = { top: 20, right: 20, bottom: 48, left: 76 }
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom

const valueOf = (
  bucket: RevenueTrendBucket,
  key: MetricKey,
): number | null => {
  const raw = bucket[key]
  if (raw === null) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

const moneyOf = (
  bucket: RevenueTrendBucket,
  key: MetricKey,
): string | null => {
  const raw = bucket[key]
  return raw === null ? null : raw
}

type RevenueTrendChartProps = {
  buckets: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
}

/**
 * A dependency-free SVG trend chart.
 *
 * The browser only maps server amounts onto a viewBox; it does not sum them.
 * Null COGS/profit values break a line rather than being plotted as zero, and
 * every point keeps the exact server string for its tooltip.
 */
export function RevenueTrendChart({
  buckets,
  currency,
  granularity,
}: RevenueTrendChartProps) {
  const [hidden, setHidden] = useState<ReadonlySet<MetricKey>>(new Set())
  const [active, setActive] = useState<number | null>(null)

  if (buckets.length === 0) return null

  const visibleMetrics = METRICS.filter((metric) => !hidden.has(metric.key))
  const allValues = visibleMetrics.flatMap((metric) =>
    buckets
      .map((bucket) => valueOf(bucket, metric.key))
      .filter((value): value is number => value !== null),
  )

  const rawMin = allValues.length > 0 ? Math.min(0, ...allValues) : 0
  const rawMax = allValues.length > 0 ? Math.max(0, ...allValues) : 1
  const spread = rawMax - rawMin || 1
  const yMin = rawMin - spread * 0.05
  const yMax = rawMax + spread * 0.05

  const x = (index: number): number => {
    if (buckets.length === 1) return PADDING.left + PLOT_WIDTH / 2
    return PADDING.left + (index / (buckets.length - 1)) * PLOT_WIDTH
  }

  const y = (value: number): number =>
    PADDING.top + ((yMax - value) / (yMax - yMin)) * PLOT_HEIGHT

  const step = buckets.length > 1 ? PLOT_WIDTH / (buckets.length - 1) : PLOT_WIDTH
  const tickValues = Array.from({ length: 5 }, (_, index) =>
    yMin + ((yMax - yMin) * index) / 4,
  )
  const axisStep = Math.max(1, Math.ceil(buckets.length / 8))
  const axisIndices = new Set<number>()
  for (let index = 0; index < buckets.length; index += axisStep) {
    axisIndices.add(index)
  }
  axisIndices.add(buckets.length - 1)

  const pathFor = (metric: Metric): string => {
    const parts: string[] = []
    let drawing = false

    buckets.forEach((bucket, index) => {
      const value = valueOf(bucket, metric.key)
      if (value === null) {
        drawing = false
        return
      }

      parts.push(`${drawing ? 'L' : 'M'}${x(index)},${y(value)}`)
      drawing = true
    })

    return parts.join(' ')
  }

  const activeBucket = active === null ? undefined : buckets[active]
  const activeX = active === null ? null : x(active)
  const tooltipLeft =
    activeX === null
      ? 50
      : Math.max(12, Math.min(88, (activeX / WIDTH) * 100))

  const toggleMetric = (key: MetricKey) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Chart legend">
        {METRICS.map((metric) => {
          const isHidden = hidden.has(metric.key)
          return (
            <button
              key={metric.key}
              type="button"
              aria-pressed={!isHidden}
              onClick={() => toggleMetric(metric.key)}
              className={`inline-flex min-h-8 items-center gap-2 text-[12px] transition-opacity ${
                isHidden ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span
                aria-hidden
                className="h-0.5 w-6 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              <span className={isHidden ? 'line-through' : ''}>{metric.label}</span>
            </button>
          )
        })}
      </div>

      {visibleMetrics.length === 0 ? (
        <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
          Select at least one metric to display the trend.
        </p>
      ) : (
<div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Revenue trend in ${currency}, ${granularity} buckets`}
            className="h-auto w-full overflow-visible"
            onMouseLeave={() => setActive(null)}
          >
            <title>{`Revenue trend in ${currency}`}</title>
            <desc>
              Revenue, discounts, cost of goods sold and known-cost gross profit
              by {granularity}. Hover or focus a period for exact values.
            </desc>

            {tickValues.map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="#eeece8"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 12}
                  y={y(tick) + 4}
                  textAnchor="end"
                  className="fill-ash font-mono text-[11px]"
                >
                  {formatCompactMoney(tick, currency)}
                </text>
              </g>
            ))}

            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y(0)}
              y2={y(0)}
              stroke="#a3a3a0"
              strokeWidth="1.5"
            />

            {[...axisIndices].map((index) => (
              <text
                key={index}
                x={x(index)}
                y={HEIGHT - 16}
                textAnchor="middle"
                className="fill-ash text-[11px]"
              >
                {formatPeriodLabel(buckets[index].period, granularity)}
              </text>
            ))}

            {visibleMetrics.map((metric) => (
              <g key={metric.key}>
                <path
                  d={pathFor(metric)}
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="2.5"
                  strokeDasharray={metric.dash}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {buckets.map((bucket, index) => {
                  const value = valueOf(bucket, metric.key)
                  if (value === null) return null
                  const amount = moneyOf(bucket, metric.key)

                  return (
                    <circle
                      key={`${metric.key}-${bucket.period}-${index}`}
                      cx={x(index)}
                      cy={y(value)}
                      r={active === index ? 5 : 2.5}
                      fill={metric.color}
                      stroke="#fbfaf8"
                      strokeWidth="1.5"
                    >
                      <title>
                        {`${metric.label}: ${amount === null ? 'Unknown' : formatMoney(amount, currency)} · ${formatPeriodFullLabel(bucket.period, granularity)}`}
                      </title>
                    </circle>
                  )
                })}
              </g>
            ))}

            {activeX !== null && (
              <line
                x1={activeX}
                x2={activeX}
                y1={PADDING.top}
                y2={PADDING.top + PLOT_HEIGHT}
                stroke="#0b0b0b"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.45"
              />
            )}

            {buckets.map((bucket, index) => (
              <rect
                key={`hit-${bucket.period}-${index}`}
                x={x(index) - step / 2}
                y={PADDING.top}
                width={step}
                height={PLOT_HEIGHT}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${formatPeriodFullLabel(bucket.period, granularity)}. Show exact values.`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              />
            ))}
          </svg>

          {activeBucket && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-2 z-10 w-64 -translate-x-1/2 border border-line bg-paper-pure p-3 shadow-[var(--shadow-raised)]"
              style={{ left: `${tooltipLeft}%` }}
            >
              <p className="text-[11px] font-semibold tracking-[0.08em] text-graphite uppercase">
                {formatPeriodFullLabel(activeBucket.period, granularity)}
              </p>
              <dl className="mt-2 space-y-1">
                {visibleMetrics.map((metric) => {
                  const amount = moneyOf(activeBucket, metric.key)
                  return (
                    <div
                      key={metric.key}
                      className="flex items-baseline justify-between gap-3 text-[12px]"
                    >
                      <dt className="text-graphite">{metric.label}</dt>
                      <dd className="text-right font-mono tabular-nums text-ink">
                        {amount === null ? 'Unknown' : formatMoney(amount, currency)}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          )}
        </div>
      )}

      <div className="sr-only">
        <table>
          <caption>{`Revenue trend table in ${currency}`}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              {METRICS.map((metric) => (
                <th key={metric.key} scope="col">
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.period}>
                <th scope="row">
                  {formatPeriodFullLabel(bucket.period, granularity)}
                </th>
                {METRICS.map((metric) => {
                  const amount = moneyOf(bucket, metric.key)
                  return (
                    <td key={metric.key}>
                      {amount === null ? 'Unknown' : formatMoney(amount, currency)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
