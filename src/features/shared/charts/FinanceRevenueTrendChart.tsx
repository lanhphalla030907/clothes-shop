import { useId, useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatCompactMoney,
  formatCount,
  formatPeriodFullLabel,
  formatPeriodLabel,
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

interface MetricConfig {
  key: MetricKey
  label: string
  color: string
  dash?: string
  /** Cost and profit only exist when the API has a cost snapshot. */
  defaultVisible: boolean
}

/** Same six metrics, labels and API fields as the original trend chart. */
const METRICS: readonly MetricConfig[] = [
  {
    key: 'grossSales',
    label: 'Gross product sales',
    color: CHART_COLORS.grossSales,
    defaultVisible: true,
  },
  {
    key: 'productDiscounts',
    label: 'Product discounts',
    color: CHART_COLORS.productDiscounts,
    dash: '5 3',
    defaultVisible: true,
  },
  {
    key: 'netProductRevenue',
    label: 'Net product revenue',
    color: CHART_COLORS.netProductRevenue,
    defaultVisible: true,
  },
  {
    key: 'shippingRevenue',
    label: 'Shipping revenue',
    color: CHART_COLORS.shippingRevenue,
    dash: '7 3',
    defaultVisible: true,
  },
  {
    key: 'cogs',
    label: 'COGS',
    color: CHART_COLORS.cogs,
    dash: '2 3',
    defaultVisible: false,
  },
  {
    key: 'grossProfit',
    label: 'Known-cost gross profit',
    color: CHART_COLORS.grossProfit,
    defaultVisible: false,
  },
]

const PRIMARY_METRIC: MetricKey = 'netProductRevenue'

interface ChartDatum {
  period: string
  label: string
  fullLabel: string
  [key: string]: string | number | null
}

interface FinanceRevenueTrendChartProps {
  buckets: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
  height?: number
  className?: string
}

const toFiniteMoney = (value: string | null): number | null => {
  if (value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Revenue trend for the finance dashboard.
 *
 * Reporting periods come from the API already bucketed in `Asia/Phnom_Penh`.
 * They are formatted as calendar strings without constructing a local `Date`,
 * so no UTC/host-timezone shift can move a day. Every series is read from its
 * original finance field; no metric is calculated or invented in the browser.
 */
export function RevenueTrendChart({
  buckets,
  currency,
  granularity,
  height = 340,
  className = '',
}: FinanceRevenueTrendChartProps) {
  const gradientId = `revenue-trend-${useId().replace(/:/g, '')}`
  const [hidden, setHidden] = useState<Set<MetricKey>>(
    () => new Set(METRICS.filter((metric) => !metric.defaultVisible).map((metric) => metric.key)),
  )

  const chartData = useMemo<ChartDatum[]>(
    () =>
      buckets.map((bucket) => {
        const point: ChartDatum = {
          period: bucket.period,
          label: formatPeriodLabel(bucket.period, granularity),
          fullLabel: formatPeriodFullLabel(bucket.period, granularity),
          orderCount: bucket.orderCount,
        }

        METRICS.forEach((metric) => {
          const amount = bucket[metric.key]
          point[metric.key] = toFiniteMoney(amount)
          point[`${metric.key}Formatted`] =
            amount === null ? 'Unknown' : formatMoney(amount, currency)
        })

        return point
      }),
    [buckets, currency, granularity],
  )

  if (buckets.length === 0) {
    return (
      <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
        No periods in this reporting window.
      </p>
    )
  }

  const visibleMetrics = METRICS.filter((metric) => !hidden.has(metric.key))
  const renderableMetrics = visibleMetrics.filter((metric) =>
    chartData.some((point) => typeof point[metric.key] === 'number'),
  )

  const values = renderableMetrics.flatMap((metric) =>
    chartData
      .map((point) => point[metric.key])
      .filter((value): value is number => typeof value === 'number'),
  )
  const min = values.length > 0 ? Math.min(0, ...values) : 0
  const max = values.length > 0 ? Math.max(0, ...values) : 1
  const primaryMetric =
    renderableMetrics.find((metric) => metric.key === PRIMARY_METRIC) ??
    renderableMetrics[0]

  const toggleMetric = (key: MetricKey) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="flex flex-wrap gap-x-4 gap-y-2"
        role="group"
        aria-label="Revenue trend series"
      >
        {METRICS.map((metric) => {
          const isHidden = hidden.has(metric.key)
          return (
            <button
              key={metric.key}
              type="button"
              aria-pressed={!isHidden}
              onClick={() => toggleMetric(metric.key)}
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium transition-colors ${
                isHidden
                  ? 'text-ash hover:text-graphite'
                  : 'text-graphite hover:text-ink'
              }`}
            >
              <LineSwatch metric={metric} muted={isHidden} />
              <span className={isHidden ? 'line-through' : ''}>
                {metric.label}
              </span>
            </button>
          )
        })}
      </div>

      <div
        role="img"
        aria-label={`${granularityLabel(granularity)} revenue trend in ${currency}. ${renderableMetrics.length} series displayed.`}
      >
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 6, bottom: 0, left: 0 }}
          >
            <defs>
              {primaryMetric && (
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryMetric.color} stopOpacity={0.22} />
                  <stop offset="60%" stopColor={primaryMetric.color} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={primaryMetric.color} stopOpacity={0.01} />
                </linearGradient>
              )}
            </defs>

            <CartesianGrid
              vertical={false}
              stroke="var(--color-line-soft)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />

            <XAxis
              dataKey="label"
              tick={{
                fill: 'var(--color-ash)',
                fontSize: 10,
                fontFamily: 'var(--font-sans)',
              }}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              minTickGap={24}
              interval="preserveStartEnd"
            />

            <YAxis
              tick={{
                fill: 'var(--color-ash)',
                fontSize: 10,
                fontFamily: 'var(--font-sans)',
              }}
              tickFormatter={(value) => formatCompactMoney(Number(value), currency)}
              tickCount={4}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={52}
              domain={[min, max]}
              padding={min < 0 ? { bottom: 8 } : { top: 8 }}
            />

            <Tooltip
              content={<RevenueTooltip metrics={renderableMetrics} />}
              cursor={{
                stroke: 'var(--color-graphite)',
                strokeOpacity: 0.35,
                strokeWidth: 1,
                strokeDasharray: '3 4',
              }}
              wrapperStyle={{ outline: 'none' }}
            />

            {primaryMetric && (
              <Area
                type="monotone"
                dataKey={primaryMetric.key}
                stroke="none"
                fill={`url(#${gradientId})`}
                connectNulls={false}
                isAnimationActive
                animationDuration={350}
                animationEasing="ease-out"
              />
            )}

            {renderableMetrics.map((metric) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={metric.color}
                strokeWidth={metric.key === PRIMARY_METRIC ? 2 : 1.6}
                strokeDasharray={metric.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: metric.color,
                  stroke: 'var(--color-paper-pure)',
                  strokeWidth: 2,
                }}
                connectNulls={false}
                isAnimationActive
                animationDuration={350}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="sr-only">
        <table>
          <caption>{`Revenue trend table in ${currency}`}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Orders</th>
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
                <td>{formatCount(bucket.orderCount)}</td>
                {METRICS.map((metric) => {
                  const amount = bucket[metric.key]
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

function LineSwatch({ metric, muted }: { metric: MetricConfig; muted: boolean }) {
  return (
    <svg width="18" height="4" aria-hidden className="shrink-0">
      <line
        x1="0"
        y1="2"
        x2="18"
        y2="2"
        stroke={metric.color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={metric.dash}
        opacity={muted ? 0.35 : 1}
      />
    </svg>
  )
}

interface RevenueTooltipProps {
  active?: boolean
  payload?: readonly { payload?: ChartDatum }[]
  metrics: readonly MetricConfig[]
}

function RevenueTooltip({ active, payload, metrics }: RevenueTooltipProps) {
  const datum = payload?.[0]?.payload
  if (!active || datum === undefined) return null

  const orderCount =
    typeof datum.orderCount === 'number' ? datum.orderCount : undefined

  return (
    <div className="w-[240px] rounded-xl border border-line bg-paper-pure/95 p-3 shadow-[var(--shadow-raised)] backdrop-blur-sm">
      <p className="text-[11px] font-medium text-graphite">{datum.fullLabel}</p>
      <dl className="mt-2 space-y-1.5">
        {metrics.map((metric) => {
          const formatted = datum[`${metric.key}Formatted`] as string
          return (
            <div
              key={metric.key}
              className="flex items-start justify-between gap-3 text-[11.5px]"
            >
              <dt className="flex min-w-0 items-center gap-1.5 text-graphite">
                <LineSwatch metric={metric} muted={formatted === 'Unknown'} />
                <span className="leading-tight">{metric.label}</span>
              </dt>
              <dd
                className={`shrink-0 text-right font-mono tabular-nums ${
                  formatted === 'Unknown' ? 'text-ash' : 'text-ink'
                }`}
              >
                {formatted}
              </dd>
            </div>
          )
        })}
      </dl>
      {orderCount !== undefined && (
        <p className="mt-2 border-t border-line-soft pt-2 text-[10.5px] text-ash">
          {formatCount(orderCount)} {orderCount === 1 ? 'order' : 'orders'}
        </p>
      )}
    </div>
  )
}
