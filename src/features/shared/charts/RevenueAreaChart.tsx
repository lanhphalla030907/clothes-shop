import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatRevenueTooltipValue, formatRevenueAxisValue, formatPeriodTooltipLabel, formatPeriodAxisLabel, CHART_COLORS } from './chartFormatters'
import type { FinanceTrendGranularity, RevenueTrendBucket } from '@/types/api'

interface RevenueAreaChartProps {
  data: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
  height?: number
  className?: string
  ariaLabel?: string
}

export function RevenueAreaChart({
  data,
  currency,
  granularity,
  height = 280,
  className = '',
  ariaLabel = 'Revenue trend',
}: RevenueAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite" role="img" aria-label={ariaLabel}>
        No periods in this reporting window.
      </div>
    )
  }

  const chartData = data.map((bucket) => ({
    period: bucket.period,
    value: Number.isFinite(Number(bucket.netRevenue)) ? Number(bucket.netRevenue) : 0,
    formattedValue: formatRevenueTooltipValue(Number.isFinite(Number(bucket.netRevenue)) ? Number(bucket.netRevenue) : 0, currency),
    label: formatPeriodAxisLabel(bucket.period, granularity),
    fullLabel: formatPeriodTooltipLabel(bucket.period, granularity),
  }))

  const maxValue = Math.max(0, ...chartData.map((d) => d.value))
  const hasData = maxValue > 0

  return (
    <div className={`relative ${className}`} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 16, right: 20, bottom: 12, left: 8 }}
          aria-hidden={true}
        >
          <defs>
            <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.revenue} stopOpacity={0.22} />
              <stop offset="55%" stopColor={CHART_COLORS.revenue} stopOpacity={0.08} />
              <stop offset="100%" stopColor={CHART_COLORS.revenue} stopOpacity={0.02} />
            </linearGradient>
          </defs>

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
            tickFormatter={(value) => formatRevenueAxisValue(value as number, currency)}
            tickCount={hasData ? 4 : 3}
            tickMargin={10}
            dx={-4}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={['dataMin', 'dataMax']}
            min={0}
            padding={{ top: 0.2, bottom: 0 }}
          />

          <Tooltip
            content={<CustomRevenueTooltip />}
            wrapperStyle={{ outline: 'none' }}
            cursor={{ strokeDasharray: '2 4', stroke: 'var(--color-ink)', strokeWidth: 0.8, opacity: 0.2 }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={CHART_COLORS.revenue}
            strokeWidth={1.8}
            fillOpacity={1}
            fill="url(#revenue-gradient)"
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls={false}
            isAnimationActive={true}
            animationDuration={400}
            animationEasing="ease-out"
          />

          <ReferenceLine
            y={0}
            stroke="var(--color-line-soft)"
            strokeWidth={0.8}
            strokeDasharray="2 4"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

interface CustomRevenueTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    payload: {
      formattedValue: string
      label: string
      fullLabel: string
      currency: string
    }
  }>
}

function CustomRevenueTooltip({
  active,
  payload,
}: CustomRevenueTooltipProps) {
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
            <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS.revenue }} />
            Revenue
          </dt>
          <dd className="shrink-0 font-mono text-ink tabular-nums">{formattedValue}</dd>
        </div>
      </dl>
    </div>
  )
}