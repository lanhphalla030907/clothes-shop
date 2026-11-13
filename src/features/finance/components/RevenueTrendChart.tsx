import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { formatMoney } from '@/lib/money'
import type {
  FinanceRangeResponse,
  FinanceTrendGranularity,
  RevenueTrendBucket,
} from '@/types/api'
import {
  formatCompactMoney,
  formatCount,
  formatFinanceRange,
  formatPeriodFullLabel,
  formatPeriodLabel,
  granularityLabel,
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
    color: 'var(--color-finance-revenue)',
  },
  {
    key: 'productDiscounts',
    label: 'Product discounts',
    color: 'var(--color-finance-discount)',
    dash: '5 3',
  },
  {
    key: 'netProductRevenue',
    label: 'Net product revenue',
    color: 'var(--color-finance-net)',
  },
  {
    key: 'shippingRevenue',
    label: 'Shipping revenue',
    color: 'var(--color-finance-shipping)',
    dash: '7 3',
  },
  {
    key: 'cogs',
    label: 'COGS',
    color: 'var(--color-finance-cogs)',
    dash: '2 3',
  },
  {
    key: 'grossProfit',
    label: 'Known-cost gross profit',
    color: 'var(--color-finance-profit)',
  },
]

/** The metric that carries the gradient area when it is visible. */
const PRIMARY_METRIC: MetricKey = 'netProductRevenue'
const DEFAULT_WIDTH = 900
const TOOLTIP_MAX_WIDTH = 280
const TOOLTIP_MIN_WIDTH = 190

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

type Point = { x: number; y: number }
type SegmentPoint = { index: number; value: number }

/** Rounds a rough step up to a 1/2/5 × 10^n value for clean axis ticks. */
const niceStep = (rough: number): number => {
  if (!Number.isFinite(rough) || rough <= 0) return 1
  const exponent = Math.floor(Math.log10(rough))
  const fraction = rough / 10 ** exponent
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

/**
 * A zero-inclusive, human-readable value scale.
 *
 * The browser only rounds the domain for tick placement; it never rescales or
 * rebuckets the server's amounts.
 */
const niceScale = (
  dataMin: number,
  dataMax: number,
  targetTicks: number,
): { min: number; max: number; ticks: number[] } => {
  let min = dataMin
  let max = dataMax

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1, ticks: [0, 0.5, 1] }
  }
  if (min === max) {
    if (min === 0) return { min: 0, max: 1, ticks: [0, 0.5, 1] }
    const pad = Math.abs(min) * 0.1
    min -= pad
    max += pad
  }

  const step = niceStep((max - min) / Math.max(1, targetTicks - 1))
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const count = Math.round((niceMax - niceMin) / step)
  const ticks = Array.from({ length: count + 1 }, (_, index) =>
    Number((niceMin + index * step).toPrecision(12)),
  )

  return { min: niceMin, max: niceMax, ticks }
}

/**
 * Catmull-Rom spline converted to cubic Béziers.
 *
 * A single point still returns a move-only path so callers can draw a marker.
 */
const smoothPath = (points: readonly Point[]): string => {
  if (points.length === 0) return ''
  const [first] = points
  if (points.length === 1) return `M${first.x},${first.y}`

  let path = `M${first.x},${first.y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? p2

    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6

    path += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }

  return path
}

type RevenueTrendChartProps = {
  buckets: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
  range: FinanceRangeResponse
  timezone: string
}

/**
 * A dependency-free, responsive SVG trend chart.
 *
 * The browser only maps server amounts onto a pixel grid: it does not sum,
 * rebucket or interpolate them. Null COGS/profit values break a line rather
 * than being plotted as zero, and the tooltip always shows the exact server
 * string for the inspected bucket.
 */
export function RevenueTrendChart({
  buckets,
  currency,
  granularity,
  range,
  timezone,
}: RevenueTrendChartProps) {
  const [hidden, setHidden] = useState<ReadonlySet<MetricKey>>(new Set())
  const [active, setActive] = useState<number | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const gradientId = `trend-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = () => {
      const next = element.clientWidth
      if (next > 0) setWidth(next)
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (buckets.length === 0) {
    return (
      <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
        No periods in this reporting window.
      </p>
    )
  }

  const visibleMetrics = METRICS.filter((metric) => !hidden.has(metric.key))
  const allValues = visibleMetrics.flatMap((metric) =>
    buckets
      .map((bucket) => valueOf(bucket, metric.key))
      .filter((value): value is number => value !== null),
  )

  const scale = niceScale(
    allValues.length > 0 ? Math.min(0, ...allValues) : 0,
    allValues.length > 0 ? Math.max(0, ...allValues) : 1,
    width < 520 ? 4 : 5,
  )

  const compact = width < 520
  const height = compact ? 264 : 344
  const padding = {
    top: 18,
    right: compact ? 10 : 18,
    bottom: compact ? 32 : 38,
    left: compact ? 58 : 74,
  }
  const plotWidth = Math.max(10, width - padding.left - padding.right)
  const plotHeight = Math.max(10, height - padding.top - padding.bottom)

  const x = (index: number): number =>
    buckets.length <= 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (buckets.length - 1)) * plotWidth

  const y = (value: number): number =>
    padding.top +
    ((scale.max - value) / (scale.max - scale.min || 1)) * plotHeight

  const segmentsFor = (metric: Metric): SegmentPoint[][] => {
    const segments: SegmentPoint[][] = []
    let current: SegmentPoint[] = []

    buckets.forEach((bucket, index) => {
      const value = valueOf(bucket, metric.key)
      if (value === null) {
        if (current.length > 0) segments.push(current)
        current = []
        return
      }
      current.push({ index, value })
    })

    if (current.length > 0) segments.push(current)
    return segments
  }

  const primary =
    visibleMetrics.find((metric) => metric.key === PRIMARY_METRIC) ??
    visibleMetrics[0]

  const safeActive =
    active !== null && active >= 0 && active < buckets.length ? active : null
  const activeBucket = safeActive === null ? undefined : buckets[safeActive]

  const maxLabels = compact ? 4 : Math.max(3, Math.floor(plotWidth / 92))
  const labelStep = Math.max(
    1,
    Math.ceil((buckets.length - 1) / Math.max(1, maxLabels - 1)),
  )
  const labelIndices: number[] = []
  for (let index = 0; index < buckets.length; index += labelStep) {
    labelIndices.push(index)
  }
  const lastIndex = buckets.length - 1
  if (labelIndices[labelIndices.length - 1] !== lastIndex) {
    const previous = labelIndices[labelIndices.length - 1] ?? -Infinity
    if (lastIndex - previous >= labelStep * 0.55) labelIndices.push(lastIndex)
    else labelIndices[labelIndices.length - 1] = lastIndex
  }

  const tooltipWidth = Math.min(
    TOOLTIP_MAX_WIDTH,
    Math.max(TOOLTIP_MIN_WIDTH, width - 24),
  )
  const tooltipHalf = tooltipWidth / 2
  const tooltipX =
    safeActive === null
      ? width / 2
      : Math.min(
          Math.max(x(safeActive), tooltipHalf + 8),
          Math.max(tooltipHalf + 8, width - tooltipHalf - 8),
        )

  const chartSignature = [
    currency,
    granularity,
    buckets.length,
    buckets[0]?.period ?? '',
    buckets[buckets.length - 1]?.period ?? '',
  ].join('|')

  const toggleMetric = (key: MetricKey) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const inspectAt = (index: number) => {
    setActive(Math.min(buckets.length - 1, Math.max(0, index)))
  }

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (buckets.length === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width === 0) return
    const localX = ((event.clientX - bounds.left) / bounds.width) * width
    const ratio =
      buckets.length <= 1
        ? 0
        : (localX - padding.left) / (plotWidth || 1)
    inspectAt(Math.round(ratio * (buckets.length - 1)))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (buckets.length === 0) return
    const start = safeActive ?? buckets.length - 1

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        inspectAt(start - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        inspectAt(start + 1)
        break
      case 'Home':
        event.preventDefault()
        inspectAt(0)
        break
      case 'End':
        event.preventDefault()
        inspectAt(buckets.length - 1)
        break
      case 'Escape':
        setActive(null)
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" aria-label="Chart legend">
        {METRICS.map((metric) => {
          const isHidden = hidden.has(metric.key)
          return (
            <button
              key={metric.key}
              type="button"
              aria-pressed={!isHidden}
              onClick={() => toggleMetric(metric.key)}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2 text-[11.5px] font-medium transition-colors ${
                isHidden
                  ? 'border-line bg-bone text-ash'
                  : 'border-line bg-paper-pure text-graphite hover:border-ink hover:text-ink'
              }`}
            >
              <span
                aria-hidden
                className="h-[3px] w-4 rounded-full"
                style={{
                  backgroundColor: metric.color,
                  opacity: isHidden ? 0.35 : 1,
                }}
              />
              <span className={isHidden ? 'line-through' : ''}>
                {metric.label}
              </span>
            </button>
          )
        })}
      </div>

      {visibleMetrics.length === 0 ? (
        <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
          Select at least one metric to display the trend.
        </p>
      ) : (
        <div
          ref={containerRef}
          role="group"
          tabIndex={0}
          aria-label={`${granularityLabel(granularity)} revenue trend in ${currency}. Use the left and right arrow keys to inspect each period.`}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((current) => current ?? buckets.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={handleKeyDown}
          className="relative rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <div key={chartSignature} className="chart-enter">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={width}
              height={height}
              role="img"
              aria-label={`Revenue trend in ${currency}, ${granularityLabel(granularity).toLowerCase()} buckets`}
              className="block h-auto w-full select-none"
            >
              <title>{`Revenue trend in ${currency}`}</title>
              <desc>
                {`${formatFinanceRange(range)} · ${granularityLabel(granularity)} buckets in ${timezone}. Revenue, discounts, cost of goods sold and known-cost gross profit. Hover or focus a period for exact values.`}
              </desc>

              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    style={{ stopColor: primary.color }}
                    stopOpacity="0.16"
                  />
                  <stop
                    offset="72%"
                    style={{ stopColor: primary.color }}
                    stopOpacity="0.04"
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: primary.color }}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {scale.ticks.map((tick) => (
                <line
                  key={`grid-${tick}`}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  style={{
                    stroke:
                      tick === 0
                        ? 'var(--color-line)'
                        : 'var(--color-line-soft)',
                  }}
                  strokeWidth="1"
                  shapeRendering="crispEdges"
                />
              ))}

              {scale.ticks.map((tick) => (
                <text
                  key={`tick-${tick}`}
                  x={padding.left - 10}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-ash font-mono text-[10px] tabular-nums"
                >
                  {formatCompactMoney(tick, currency)}
                </text>
              ))}

              {segmentsFor(primary).map((segment, index) => {
                if (segment.length < 2) return null
                const points = segment.map((point) => ({
                  x: x(point.index),
                  y: y(point.value),
                }))
                const line = smoothPath(points)
                const baseline = y(0)
                const last = points[points.length - 1]
                const area = `${line} L${last.x.toFixed(2)},${baseline.toFixed(2)} L${points[0].x.toFixed(2)},${baseline.toFixed(2)} Z`

                return (
                  <path
                    key={`area-${index}`}
                    d={area}
                    fill={`url(#${gradientId})`}
                    stroke="none"
                  />
                )
              })}

              {visibleMetrics.map((metric) => {
                const isPrimary = metric.key === primary.key
                const segments = segmentsFor(metric)

                return (
                  <g key={metric.key}>
                    {segments.map((segment, index) => (
                      <path
                        key={`line-${index}`}
                        d={smoothPath(
                          segment.map((point) => ({
                            x: x(point.index),
                            y: y(point.value),
                          })),
                        )}
                        fill="none"
                        style={{ stroke: metric.color }}
                        strokeWidth={isPrimary ? 2.4 : 1.7}
                        strokeDasharray={metric.dash}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={isPrimary ? 1 : 0.8}
                      />
                    ))}

                    {segments.map((segment, index) =>
                      segment.length === 1 ? (
                        <circle
                          key={`dot-${index}`}
                          cx={x(segment[0].index)}
                          cy={y(segment[0].value)}
                          r={3}
                          style={{
                            fill: metric.color,
                            stroke: 'var(--color-paper)',
                          }}
                          strokeWidth={1.5}
                        />
                      ) : null,
                    )}
                  </g>
                )
              })}

              {labelIndices.map((index) => (
                <text
                  key={`label-${index}`}
                  x={x(index)}
                  y={height - 11}
                  textAnchor={
                    index === 0
                      ? 'start'
                      : index === buckets.length - 1
                        ? 'end'
                        : 'middle'
                  }
                  className="fill-ash text-[10.5px]"
                >
                  {formatPeriodLabel(buckets[index].period, granularity)}
                </text>
              ))}

              {safeActive !== null && (
                <g pointerEvents="none">
                  <line
                    x1={x(safeActive)}
                    x2={x(safeActive)}
                    y1={padding.top}
                    y2={padding.top + plotHeight}
                    style={{ stroke: 'var(--color-ink)' }}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.28"
                  />
                  {visibleMetrics.map((metric) => {
                    const value = valueOf(buckets[safeActive], metric.key)
                    if (value === null) return null
                    return (
                      <circle
                        key={`active-${metric.key}`}
                        className="chart-point"
                        cx={x(safeActive)}
                        cy={y(value)}
                        r={4}
                        style={{
                          fill: metric.color,
                          stroke: 'var(--color-paper)',
                        }}
                        strokeWidth={2}
                      />
                    )
                  })}
                </g>
              )}
            </svg>
          </div>

          {activeBucket && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-line bg-paper-pure p-3 shadow-[var(--shadow-raised)]"
              style={{ left: tooltipX, width: tooltipWidth }}
            >
              <p className="text-[10.5px] font-semibold tracking-[0.06em] text-graphite uppercase">
                {formatPeriodFullLabel(activeBucket.period, granularity)}
              </p>
              <dl className="mt-2 space-y-1.5">
                {visibleMetrics.map((metric) => {
                  const amount = moneyOf(activeBucket, metric.key)
                  return (
                    <div
                      key={metric.key}
                      className="flex items-start justify-between gap-3 text-[11.5px]"
                    >
                      <dt className="flex min-w-0 items-center gap-1.5 text-graphite">
                        <span
                          aria-hidden
                          className="mt-px size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                        <span className="leading-tight">{metric.label}</span>
                      </dt>
                      <dd
                        className={`shrink-0 text-right font-mono tabular-nums ${
                          amount === null ? 'text-ash' : 'text-ink'
                        }`}
                      >
                        {amount === null
                          ? 'Unknown'
                          : formatMoney(amount, currency)}
                      </dd>
                    </div>
                  )
                })}
              </dl>
              <p className="mt-2 border-t border-line-soft pt-2 text-[10.5px] text-ash">
                {formatCount(activeBucket.orderCount)}{' '}
                {activeBucket.orderCount === 1 ? 'order' : 'orders'}
              </p>
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