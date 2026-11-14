import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatOrdersTooltipValue, formatOrdersAxisValue, formatPeriodTooltipLabel, formatPeriodAxisLabel, CHART_COLORS } from './chartFormatters'
import type { FinanceTrendGranularity, RevenueTrendBucket } from '@/types/api'

interface OrdersLineChartProps {
  data: readonly RevenueTrendBucket[]
  granularity: FinanceTrendGranularity
  height?: number
  className?: string
  ariaLabel?: string
}

export function OrdersLineChart({
  data,
  granularity,
  height = 280,
  className = '',
  ariaLabel = 'Order count trend',
}: OrdersLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite" role="img" aria-label={ariaLabel}>
        No periods in this reporting window.
      </div>
    )
  }

  const chartData = data.map((bucket) => ({
    period: bucket.period,
    value: Number.isFinite(bucket.orderCount) ? bucket.orderCount : 0,
    formattedValue: formatOrdersTooltipValue(Number.isFinite(bucket.orderCount) ? bucket.orderCount : 0),
    label: formatPeriodAxisLabel(bucket.period, granularity),
    fullLabel: formatPeriodTooltipLabel(bucket.period, granularity),
  }))

  const maxValue = Math.max(0, ...chartData.map((d) => d.value))
  const hasData = maxValue > 0

  return (
    <div className={`relative ${className}`} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 16, right: 20, bottom: 12, left: 8 }}
          aria-hidden={true}
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
            tickCount={Math.min(data.length, 6)}
            tickMargin={10}
            dy={6}
            axisLine={{ stroke: 'var(--color-line-soft)', strokeWidth: 0.8 }}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: 'var(--color-ash)', fontSize: 10.5, fontFamily: 'var(--font-sans)' }}
            tickFormatter={(value) => formatOrdersAxisValue(value as number)}
            tickCount={hasData ? 4 : 3}
            tickMargin={10}
            dx={-4}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={['dataMin', 'dataMax']}
            min={0}
            padding={{ top: 0.2, bottom: 0 }}
            allowDecimals={false}
          />

          <Tooltip
            content={<CustomOrdersTooltip />}
            wrapperStyle={{ outline: 'none' }}
            cursor={{ strokeDasharray: '2 4', stroke: 'var(--color-ink)', strokeWidth: 0.8, opacity: 0.2 }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART_COLORS.orders}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 3.5, fill: CHART_COLORS.orders, stroke: 'var(--color-paper)', strokeWidth: 1.5 }}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-out"
            connectNulls={false}
          />

          <ReferenceLine
            y={0}
            stroke="var(--color-line-soft)"
            strokeWidth={0.8}
            strokeDasharray="2 4"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CustomOrdersTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    payload: {
      formattedValue: string
      label: string
      fullLabel: string
    }
  }>
}

function CustomOrdersTooltip({
  active,
  payload,
}: CustomOrdersTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const entry = payload[0]
  const { fullLabel, formattedValue } = entry.payload

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
        <div className="flex items-start justify-between gap-3 text-[11px]">
          <dt className="flex items-center gap-1.5 text-graphite">
            <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS.orders }} />
            Orders
          </dt>
          <dd className="shrink-0 font-mono text-ink tabular-nums">{formattedValue}</dd>
        </div>
      </dl>
    </div>
  )
}