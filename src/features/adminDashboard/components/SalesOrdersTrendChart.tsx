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
} from '@/features/finance/utils'

const DEFAULT_WIDTH = 900
const TOOLTIP_MAX_WIDTH = 280
const TOOLTIP_MIN_WIDTH = 190

type Point = { x: number; y: number }

/** Rounds a rough step up to a 1/2/5 × 10^n value for clean axis ticks. */
const niceStep = (rough: number): number => {
  if (!Number.isFinite(rough) || rough <= 0) return 1
  const exponent = Math.floor(Math.log10(rough))
  const fraction = rough / 10 ** exponent
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

const niceScale = (
  dataMax: number,
  targetTicks: number,
): { min: number; max: number; ticks: number[] } => {
  if (!Number.isFinite(dataMax) || dataMax <= 0) {
    return { min: 0, max: 1, ticks: [0, 0.5, 1] }
  }

  const step = niceStep(dataMax / Math.max(1, targetTicks - 1))
  const max = Math.ceil(dataMax / step) * step
  const count = Math.round(max / step)
  const ticks = Array.from({ length: count + 1 }, (_, index) =>
    Number((index * step).toPrecision(12)),
  )
  return { min: 0, max, ticks }
}

/** Integer-only ticks for the order-count panel. */
const niceCountScale = (
  dataMax: number,
  targetTicks: number,
): { min: number; max: number; ticks: number[] } => {
  const safeMax = Number.isFinite(dataMax) && dataMax > 0 ? dataMax : 1
  const step = Math.max(1, niceStep(safeMax / Math.max(1, targetTicks - 1)))
  const max = Math.ceil(safeMax / step) * step
  const count = Math.round(max / step)
  const ticks = Array.from({ length: count + 1 }, (_, index) => index * step)
  return { min: 0, max, ticks }
}

/** Catmull-Rom spline converted to cubic Béziers. */
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

type SalesOrdersTrendChartProps = {
  buckets: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
  range: FinanceRangeResponse
  timezone: string
}

/**
 * Revenue and order count over time, on two aligned panels.
 *
 * Money and order counts have different units, so they get separate Y axes. The
 * panels share only the X positions and the inspected bucket. The browser maps
 * server amounts onto pixels and never sums or rebuckets them.
 */
export function SalesOrdersTrendChart({
  buckets,
  currency,
  granularity,
  range,
  timezone,
}: SalesOrdersTrendChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gradientId = `sales-orders-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

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

  const compact = width < 560
  const panelHeight = compact ? 162 : 196
  const padding = {
    top: 16,
    right: compact ? 12 : 18,
    bottom: compact ? 30 : 36,
    left: compact ? 54 : 70,
  }
  const plotWidth = Math.max(10, width - padding.left - padding.right)
  const plotHeight = Math.max(10, panelHeight - padding.top - padding.bottom)

  const revenueValues = buckets.map((bucket) => {
    const value = Number(bucket.netRevenue)
    return Number.isFinite(value) ? value : 0
  })
  const orderValues = buckets.map((bucket) =>
    Number.isFinite(bucket.orderCount) ? bucket.orderCount : 0,
  )

  const revenueScale = niceScale(
    Math.max(0, ...revenueValues),
    compact ? 4 : 5,
  )
  const orderScale = niceCountScale(
    Math.max(0, ...orderValues),
    compact ? 4 : 5,
  )

  const x = (index: number): number =>
    buckets.length <= 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (buckets.length - 1)) * plotWidth

  const yFor = (
    value: number,
    scale: { min: number; max: number },
  ): number =>
    padding.top +
    ((scale.max - value) / (scale.max - scale.min || 1)) * plotHeight

  const revenuePoints = buckets.map((_, index) => ({
    x: x(index),
    y: yFor(revenueValues[index], revenueScale),
  }))
  const orderPoints = buckets.map((_, index) => ({
    x: x(index),
    y: yFor(orderValues[index], orderScale),
  }))

  const revenuePath = smoothPath(revenuePoints)
  const orderPath = smoothPath(orderPoints)
  const baseline = yFor(0, revenueScale)
  const lastRevenue = revenuePoints[revenuePoints.length - 1]
  const revenueArea = `${revenuePath} L${lastRevenue.x.toFixed(2)},${baseline.toFixed(2)} L${revenuePoints[0].x.toFixed(2)},${baseline.toFixed(2)} Z`

  const maxLabels = compact ? 3 : Math.max(3, Math.floor(plotWidth / 100))
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

  const safeActive =
    active !== null && active >= 0 && active < buckets.length ? active : null
  const activeBucket = safeActive === null ? undefined : buckets[safeActive]

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

  const inspectAt = (index: number) => {
    setActive(Math.min(buckets.length - 1, Math.max(0, index)))
  }

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
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

  const chartSignature = [
    currency,
    granularity,
    buckets.length,
    buckets[0]?.period ?? '',
    buckets[buckets.length - 1]?.period ?? '',
  ].join('|')

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        role="group"
        tabIndex={0}
        aria-label={`Sales and orders trend in ${currency}. Use the left and right arrow keys to inspect each period.`}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? buckets.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={handleKeyDown}
        className="relative rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <div key={chartSignature} className="chart-enter space-y-3">
          <div>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12px] font-semibold text-ink">Revenue</p>
              <p className="font-mono text-[10.5px] text-graphite">{currency}</p>
            </div>
            <svg
              viewBox={`0 0 ${width} ${panelHeight}`}
              width={width}
              height={panelHeight}
              role="img"
              aria-label={`Revenue trend in ${currency}, ${granularityLabel(granularity).toLowerCase()} buckets`}
              className="block h-auto w-full select-none"
            >
              <title>{`Revenue trend in ${currency}`}</title>
              <desc>
                {`${formatFinanceRange(range)} · ${granularityLabel(granularity)} buckets in ${timezone}. Net revenue per period.`}
              </desc>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    style={{ stopColor: 'var(--color-finance-net)' }}
                    stopOpacity="0.16"
                  />
                  <stop
                    offset="72%"
                    style={{ stopColor: 'var(--color-finance-net)' }}
                    stopOpacity="0.03"
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: 'var(--color-finance-net)' }}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {revenueScale.ticks.map((tick) => (
                <g key={`revenue-grid-${tick}`}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={yFor(tick, revenueScale)}
                    y2={yFor(tick, revenueScale)}
                    style={{
                      stroke:
                        tick === 0
                          ? 'var(--color-line)'
                          : 'var(--color-line-soft)',
                    }}
                    strokeWidth="1"
                    shapeRendering="crispEdges"
                  />
                  <text
                    x={padding.left - 9}
                    y={yFor(tick, revenueScale)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-ash font-mono text-[10px] tabular-nums"
                  >
                    {formatCompactMoney(tick, currency)}
                  </text>
                </g>
              ))}

              <path d={revenueArea} fill={`url(#${gradientId})`} stroke="none" />
              <path
                d={revenuePath}
                fill="none"
                style={{ stroke: 'var(--color-finance-net)' }}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

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
                    opacity="0.26"
                  />
                  <circle
                    className="chart-point"
                    cx={x(safeActive)}
                    cy={yFor(revenueValues[safeActive], revenueScale)}
                    r={4}
                    style={{
                      fill: 'var(--color-finance-net)',
                      stroke: 'var(--color-paper)',
                    }}
                    strokeWidth={2}
                  />
                </g>
              )}
            </svg>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12px] font-semibold text-ink">Orders</p>
              <p className="font-mono text-[10.5px] text-graphite">count</p>
            </div>
            <svg
              viewBox={`0 0 ${width} ${panelHeight}`}
              width={width}
              height={panelHeight}
              role="img"
              aria-label="Order count trend"
              className="block h-auto w-full select-none"
            >
              <title>Order count trend</title>
              <desc>
                {`${formatFinanceRange(range)} · ${granularityLabel(granularity)} buckets in ${timezone}. Orders per period, on a separate count axis.`}
              </desc>

              {orderScale.ticks.map((tick) => (
                <g key={`order-grid-${tick}`}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={yFor(tick, orderScale)}
                    y2={yFor(tick, orderScale)}
                    style={{
                      stroke:
                        tick === 0
                          ? 'var(--color-line)'
                          : 'var(--color-line-soft)',
                    }}
                    strokeWidth="1"
                    shapeRendering="crispEdges"
                  />
                  <text
                    x={padding.left - 9}
                    y={yFor(tick, orderScale)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-ash font-mono text-[10px] tabular-nums"
                  >
                    {formatCount(tick)}
                  </text>
                </g>
              ))}

              <path
                d={orderPath}
                fill="none"
                style={{ stroke: 'var(--color-finance-profit)' }}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {labelIndices.map((index) => (
                <text
                  key={`label-${index}`}
                  x={x(index)}
                  y={panelHeight - 9}
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
                    opacity="0.26"
                  />
                  <circle
                    className="chart-point"
                    cx={x(safeActive)}
                    cy={yFor(orderValues[safeActive], orderScale)}
                    r={4}
                    style={{
                      fill: 'var(--color-finance-profit)',
                      stroke: 'var(--color-paper)',
                    }}
                    strokeWidth={2}
                  />
                </g>
              )}
            </svg>
          </div>
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
              <div className="flex items-start justify-between gap-3 text-[11.5px]">
                <dt className="flex items-center gap-1.5 text-graphite">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-[var(--color-finance-net)]"
                  />
                  Revenue
                </dt>
                <dd className="shrink-0 font-mono text-ink tabular-nums">
                  {formatMoney(activeBucket.netRevenue, currency)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 text-[11.5px]">
                <dt className="flex items-center gap-1.5 text-graphite">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-[var(--color-finance-profit)]"
                  />
                  Orders
                </dt>
                <dd className="shrink-0 font-mono text-ink tabular-nums">
                  {formatCount(activeBucket.orderCount)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <p className="text-[11px] text-ash">
        Hover, tap or focus the chart to inspect a period. Revenue and order count
        use separate Y axes.
      </p>

      <div className="sr-only">
        <table>
          <caption>{`Sales and orders trend in ${currency}`}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Net revenue</th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.period}>
                <th scope="row">
                  {formatPeriodFullLabel(bucket.period, granularity)}
                </th>
                <td>{formatMoney(bucket.netRevenue, currency)}</td>
                <td>{formatCount(bucket.orderCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
