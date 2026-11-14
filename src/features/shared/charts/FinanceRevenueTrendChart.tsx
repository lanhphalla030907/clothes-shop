import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useState, useMemo, useCallback } from 'react'
import {
  formatCompactMoney,
  formatCount,
  formatPeriodLabel,
  formatPeriodFullLabel,
  granularityLabel,
} from '@/features/finance/utils'
import { formatMoney } from '@/lib/money'
import { CHART_COLORS } from './chartFormatters'
import type { FinanceTrendGranularity, RevenueTrendBucket } from '@/types/api'

type MetricKey =
  | 'grossSales'
  | 'productDiscounts'
  | 'netProductRevenue'
  | 'shippingRevenue'
  | 'cogs'
  | 'grossProfit'

const METRICS: readonly { key: MetricKey; label: string; color: string; dash?: string }[] = [
  { key: 'grossSales', label: 'Gross product sales', color: CHART_COLORS.grossSales },
  { key: 'productDiscounts', label: 'Product discounts', color: CHART_COLORS.productDiscounts, dash: '5 3' },
  { key: 'netProductRevenue', label: 'Net product revenue', color: CHART_COLORS.netProductRevenue },
  { key: 'shippingRevenue', label: 'Shipping revenue', color: CHART_COLORS.shippingRevenue, dash: '7 3' },
  { key: 'cogs', label: 'COGS', color: CHART_COLORS.cogs, dash: '2 3' },
  { key: 'grossProfit', label: 'Known-cost gross profit', color: CHART_COLORS.grossProfit },
]

const PRIMARY_METRIC: MetricKey = 'netProductRevenue'

const valueOf = (bucket: RevenueTrendBucket, key: MetricKey): number | null => {
  const raw = bucket[key]
  if (raw === null) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

const moneyOf = (bucket: RevenueTrendBucket, key: MetricKey): string | null => {
  const raw = bucket[key]
  return raw === null ? null : raw
}

interface RevenueTrendChartProps {
  buckets: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
  height?: number
  className?: string
}

export function RevenueTrendChart({
  buckets,
  currency,
  granularity,
  height = 340,
  className = '',
}: RevenueTrendChartProps) {
  const [hidden, setHidden] = useState<Set<MetricKey>>(new Set())
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const visibleMetrics = useMemo(
    () => METRICS.filter((metric) => !hidden.has(metric.key)),
    [hidden]
  )

  const allValues = useMemo(() => {
    const values: number[] = []
    visibleMetrics.forEach((metric) => {
      buckets.forEach((bucket) => {
        const value = valueOf(bucket, metric.key)
        if (value !== null) values.push(value)
      })
    })
    return values
  }, [buckets, visibleMetrics])

  const hasData = allValues.length > 0
  const minValue = hasData ? Math.min(0, ...allValues) : 0
  const maxValue = hasData ? Math.max(0, ...allValues) : 1

  const chartData = useMemo(() => {
    return buckets.map((bucket, index) => {
      const point: Record<string, number | string | null> = {
        period: bucket.period,
        index,
        label: formatPeriodLabel(bucket.period, granularity),
        fullLabel: formatPeriodFullLabel(bucket.period, granularity),
      }
      METRICS.forEach((metric) => {
        const value = valueOf(bucket, metric.key)
        const amount = moneyOf(bucket, metric.key)
        point[metric.key] = value
        point[`${metric.key}Formatted`] = amount ? formatMoney(amount, currency) : 'Unknown'
      })
      return point
    })
  }, [buckets, currency, granularity])

  const primaryMetric = visibleMetrics.find((m) => m.key === PRIMARY_METRIC) ?? visibleMetrics[0]

  const toggleMetric = useCallback((key: MetricKey) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const safeActive = activeIndex !== null && activeIndex >= 0 && activeIndex < buckets.length ? activeIndex : null
  const activeBucket = safeActive !== null ? buckets[safeActive] : undefined

  const customTooltip = useMemo(() => (
    <CustomRevenueTrendTooltip visibleMetrics={visibleMetrics} />
  ), [visibleMetrics])

  const customLegend = useMemo(() => (
    <CustomRevenueTrendLegend metrics={METRICS} hidden={hidden} onToggle={toggleMetric} />
  ), [hidden, toggleMetric])

  if (buckets.length === 0) {
    return (
      <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
        No periods in this reporting window.
      </p>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {customLegend}

      {visibleMetrics.length === 0 ? (
        <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
          Select at least one metric to display the trend.
        </p>
      ) : (
        <div
          role="img"
          aria-label={`${granularityLabel(granularity)} revenue trend in ${currency}. Use the left and right arrow keys to inspect each period.`}
          className="relative rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <div
            role="group"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onBlur={() => setActiveIndex(null)}
            className="relative h-full w-full"
          >
            <ResponsiveContainer width="100%" height={height} aria-hidden="true">
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 20, bottom: 12, left: 8 }}
            >
              <CartesianGrid
                horizontal={true}
                vertical={false}
                strokeDasharray="2 4"
                stroke="var(--color-line-soft)"
                strokeWidth={0.8}
              />

              <XAxis
                dataKey="period"
                tick={{ fill: 'var(--color-ash)', fontSize: 10.5, fontFamily: 'var(--font-sans)' }}
                tickFormatter={(value) => value as string}
                interval={0}
                tickCount={Math.min(buckets.length, 6)}
                tickMargin={10}
                dy={6}
                axisLine={{ stroke: 'var(--color-line-soft)', strokeWidth: 0.8 }}
                tickLine={false}
              />

              <YAxis
                tick={{ fill: 'var(--color-ash)', fontSize: 10.5, fontFamily: 'var(--font-sans)' }}
                tickFormatter={(value) => formatCompactMoney(value as number, currency)}
                tickCount={4}
                tickMargin={10}
                dx={-4}
                axisLine={false}
                width={44}
                domain={[minValue, maxValue]}
                min={minValue < 0 ? minValue : 0}
                padding={{ top: 0.2, bottom: 0 }}
              />

              <Tooltip
                content={customTooltip}
                wrapperStyle={{ outline: 'none' }}
                cursor={{ strokeDasharray: '2 4', stroke: 'var(--color-ink)', strokeWidth: 0.8, opacity: 0.2 }}
              />

              <Legend
                content={customLegend}
                wrapperStyle={{ paddingTop: 4, paddingBottom: 4 }}
              />

              <ReferenceLine
                y={0}
                stroke="var(--color-line-soft)"
                strokeWidth={0.8}
                strokeDasharray="2 4"
              />

              {visibleMetrics.map((metric) => {
                const isPrimary = metric.key === primaryMetric.key
                const hasAnyData = buckets.some((b) => valueOf(b, metric.key) !== null)

                if (!hasAnyData) return null

                if (isPrimary) {
                  return (
                    <Area
                      key={`area-${metric.key}`}
                      type="monotone"
                      dataKey={metric.key}
                      stroke={metric.color}
                      strokeWidth={1.6}
                      fillOpacity={1}
                      fill={`url(#${metric.key}-gradient-${currency})`}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      connectNulls={false}
                      isAnimationActive={true}
                      animationDuration={400}
                      animationEasing="ease-out"
                    />
                  )
                }

                return (
                  <Line
                    key={`line-${metric.key}`}
                    type="monotone"
                    dataKey={metric.key}
                    stroke={metric.color}
                    strokeWidth={1.2}
                    strokeDasharray={metric.dash}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 3, fill: metric.color, stroke: 'var(--color-paper)', strokeWidth: 1.5 }}
                    opacity={0.95}
                    connectNulls={false}
                    isAnimationActive={true}
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                )
              })}

              <defs>
                {visibleMetrics.map((metric) => {
                  const isPrimary = metric.key === primaryMetric.key
                  if (!isPrimary) return null
                  return (
                    <linearGradient
                      key={`gradient-${metric.key}`}
                      id={`${metric.key}-gradient-${currency}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={metric.color} stopOpacity={0.22} />
                      <stop offset="60%" stopColor={metric.color} stopOpacity={0.08} />
                      <stop offset="100%" stopColor={metric.color} stopOpacity={0.02} />
                    </linearGradient>
                  )
                })}
              </defs>
            </LineChart>
          </ResponsiveContainer>

          {activeBucket && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-paper-pure px-3 py-2 shadow-[var(--shadow-sm)]"
              style={{ left: '50%', width: 220 }}>
              <p className="text-[10px] font-semibold tracking-[0.05em] text-graphite uppercase">
                {formatPeriodFullLabel(activeBucket.period, granularity)}
              </p>
              <dl className="mt-1.5 space-y-1">
                {visibleMetrics.map((metric) => {
                  const amount = moneyOf(activeBucket, metric.key)
                  return (
                    <div key={metric.key} className="flex items-start justify-between gap-3 text-[11.5px]">
                      <dt className="flex min-w-0 items-center gap-1.5 text-graphite">
                        <span
                          aria-hidden
                          className="mt-px size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                        <span className="leading-tight">{metric.label}</span>
                      </dt>
                      <dd className={`shrink-0 text-right font-mono tabular-nums ${amount === null ? 'text-ash' : 'text-ink'}`}>
                        {amount === null ? 'Unknown' : formatMoney(amount, currency)}
                      </dd>
                    </div>
                  )
                })}
              </dl>
              <p className="mt-2 border-t border-line-soft pt-2 text-[10.5px] text-ash">
                {formatCount(activeBucket.orderCount)} {activeBucket.orderCount === 1 ? 'order' : 'orders'}
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="sr-only">
        <table>
          <caption>{`Revenue trend table in ${currency}`}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              {METRICS.map((metric) => (
                <th key={metric.key} scope="col">{metric.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.period}>
                <th scope="row">{formatPeriodFullLabel(bucket.period, granularity)}</th>
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

function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  const buckets = (event.currentTarget as HTMLElement & { __buckets?: readonly RevenueTrendBucket[] }).__buckets
  if (!buckets || buckets.length === 0) return

  const activeIndex = (event.currentTarget as HTMLElement & { __activeIndex?: number | null }).__activeIndex ?? buckets.length - 1

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      setActiveIndexOnTarget(event.currentTarget, Math.max(0, activeIndex - 1))
      break
    case 'ArrowRight':
      event.preventDefault()
      setActiveIndexOnTarget(event.currentTarget, Math.min(buckets.length - 1, activeIndex + 1))
      break
    case 'Home':
      event.preventDefault()
      setActiveIndexOnTarget(event.currentTarget, 0)
      break
    case 'End':
      event.preventDefault()
      setActiveIndexOnTarget(event.currentTarget, buckets.length - 1)
      break
    case 'Escape':
      setActiveIndexOnTarget(event.currentTarget, null)
      break
    default:
      break
  }
}

function setActiveIndexOnTarget(target: EventTarget | null, index: number | null) {
  const element = target as HTMLElement & { __setActiveIndex?: (index: number | null) => void }
  element.__setActiveIndex?.(index)
}

interface CustomRevenueTrendTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    payload: Record<string, unknown>
  }>
  label?: string
  visibleMetrics: readonly { key: MetricKey; label: string; color: string }[]
}

function CustomRevenueTrendTooltip({
  active,
  payload,
  visibleMetrics,
}: CustomRevenueTrendTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const entry = payload[0]
  const dataPoint = entry.payload

  const fullLabel = dataPoint.fullLabel as string

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-paper-pure px-3 py-2 shadow-[var(--shadow-sm)]"
      style={{ left: '50%', width: 220 }}
    >
      <p className="text-[10px] font-semibold tracking-[0.05em] text-graphite uppercase">
        {fullLabel}
      </p>
      <dl className="mt-1.5 space-y-1">
        {visibleMetrics.map((metric) => {
          const formattedValue = dataPoint[`${metric.key}Formatted`] as string
          return (
            <div key={metric.key} className="flex items-start justify-between gap-3 text-[11px]">
              <dt className="flex min-w-0 items-center gap-1.5 text-graphite">
                <span
                  aria-hidden
                  className="mt-px size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="leading-tight">{metric.label}</span>
              </dt>
              <dd className={`shrink-0 text-right font-mono tabular-nums ${formattedValue === 'Unknown' ? 'text-ash' : 'text-ink'}`}>
                {formattedValue}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

interface CustomRevenueTrendLegendProps {
  metrics: readonly { key: MetricKey; label: string; color: string; dash?: string }[]
  hidden: Set<MetricKey>
  onToggle: (key: MetricKey) => void
}

function CustomRevenueTrendLegend({
  metrics,
  hidden,
  onToggle,
}: CustomRevenueTrendLegendProps) {
  return (
    <div className="flex flex-wrap gap-1" aria-label="Chart legend">
      {metrics.map((metric) => {
        const isHidden = hidden.has(metric.key)
        return (
          <button
            key={metric.key}
            type="button"
            aria-pressed={!isHidden}
            onClick={() => onToggle(metric.key)}
            className={`inline-flex min-h-7 items-center gap-1.5 rounded px-2 text-[11px] font-medium transition-colors ${
              isHidden
                ? 'text-ash hover:text-graphite'
                : 'text-graphite hover:text-ink'
            }`}
          >
            <span
              aria-hidden
              className="h-1 w-3.5 rounded-full"
              style={{
                backgroundColor: metric.color,
                opacity: isHidden ? 0.3 : 1,
              }}
            />
            <span className={isHidden ? 'line-through' : ''}>{metric.label}</span>
          </button>
        )
      })}
    </div>
  )
}