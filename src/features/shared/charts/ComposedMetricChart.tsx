import { useId } from 'react'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart as RechartsComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type ComposedAxisId = 'left' | 'right'
export type ComposedSeriesKind = 'bar' | 'line' | 'area'

export interface ComposedDatum {
  /** Short label used on the category axis. */
  label: string
  /** Full label used in the tooltip and accessible table. */
  fullLabel: string
  [key: string]: unknown
}

export interface ComposedSeries {
  key: string
  label: string
  kind: ComposedSeriesKind
  color: string
  axis: ComposedAxisId
  formatValue: (value: number, datum: ComposedDatum) => string
  formatAxis?: (value: number) => string
  missingValueLabel?: string
}

interface ComposedMetricChartProps {
  data: readonly ComposedDatum[]
  series: readonly ComposedSeries[]
  height?: number
  className?: string
  ariaLabel: string
}

const axisTick = {
  fill: 'var(--color-ash)',
  fontSize: 10,
  fontFamily: 'var(--font-sans)',
}

/**
 * A theme-aware Recharts composed chart for dashboards that need several
 * metrics with different units in one compact view. Series are configured by
 * the caller; the chart owns the visual language (grid, axes, tooltip, legend).
 *
 * Colours and fonts come from the app's CSS variables, so the chart follows the
 * active theme without installing a component library.
 */
export function ComposedMetricChart({
  data,
  series,
  height = 300,
  className = '',
  ariaLabel,
}: ComposedMetricChartProps) {
  const gradientId = `composed-area-${useId().replace(/:/g, '')}`
  const leftFormatter = series.find((item) => item.axis === 'left')?.formatAxis
  const rightFormatter = series.find((item) => item.axis === 'right')?.formatAxis

  return (
    <div className={`relative ${className}`} role="img" aria-label={ariaLabel}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-hidden="true">
        {series.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-graphite"
          >
            <SeriesMarker kind={item.kind} color={item.color} />
            {item.label}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <RechartsComposedChart
          data={data as ComposedDatum[]}
          margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            {series.map((item, index) =>
              item.kind === 'area' ? (
                <linearGradient
                  key={item.key}
                  id={`${gradientId}-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.24} />
                  <stop offset="60%" stopColor={item.color} stopOpacity={0.09} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0.01} />
                </linearGradient>
              ) : null,
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
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={24}
            interval="preserveStartEnd"
          />

          <YAxis
            yAxisId="left"
            tick={axisTick}
            tickFormatter={(value) => leftFormatter?.(Number(value)) ?? String(value)}
            tickCount={4}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[0, 'auto']}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            tick={axisTick}
            tickFormatter={(value) => rightFormatter?.(Number(value)) ?? String(value)}
            tickCount={4}
            tickLine={false}
            axisLine={false}
            width={34}
            domain={[0, 'auto']}
            allowDecimals={false}
          />

          <Tooltip
            content={<ComposedTooltip series={series} />}
            cursor={{
              stroke: 'var(--color-graphite)',
              strokeOpacity: 0.35,
              strokeWidth: 1,
              strokeDasharray: '3 4',
            }}
            wrapperStyle={{ outline: 'none' }}
          />

          {series.map((item, index) => {
            const shared = {
              key: item.key,
              dataKey: item.key,
              yAxisId: item.axis,
              name: item.label,
              isAnimationActive: true,
              animationDuration: 350,
              animationEasing: 'ease-out' as const,
            }

            if (item.kind === 'bar') {
              return (
                <Bar
                  {...shared}
                  fill={item.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                />
              )
            }

            const activeDot = {
              r: 4,
              fill: item.color,
              stroke: 'var(--color-paper-pure)',
              strokeWidth: 2,
            }

            if (item.kind === 'line') {
              return (
                <Line
                  {...shared}
                  type="monotone"
                  stroke={item.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={activeDot}
                  connectNulls={false}
                />
              )
            }

            return (
              <Area
                {...shared}
                type="monotone"
                stroke={item.color}
                strokeWidth={1.8}
                fill={`url(#${gradientId}-${index})`}
                activeDot={activeDot}
                connectNulls={false}
              />
            )
          })}
        </RechartsComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function SeriesMarker({ kind, color }: Pick<ComposedSeries, 'kind' | 'color'>) {
  if (kind === 'bar') {
    return (
      <span
        aria-hidden
        className="size-2 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
    )
  }

  if (kind === 'line') {
    return (
      <span
        aria-hidden
        className="h-[3px] w-3.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    )
  }

  return (
    <span
      aria-hidden
      className="size-2 rounded-full opacity-80"
      style={{ backgroundColor: color }}
    />
  )
}

interface ComposedTooltipProps {
  active?: boolean
  payload?: readonly { payload?: ComposedDatum }[]
  series: readonly ComposedSeries[]
}

function ComposedTooltip({ active, payload, series }: ComposedTooltipProps) {
  const datum = payload?.[0]?.payload
  if (!active || datum === undefined) return null

  return (
    <div className="pointer-events-none w-[220px] rounded-xl border border-line bg-paper-pure/95 p-3 shadow-[var(--shadow-raised)] backdrop-blur-sm">
      <p className="text-[11px] font-medium text-graphite">{datum.fullLabel}</p>
      <dl className="mt-2 space-y-1.5">
        {series.map((item) => {
          const value = datum[item.key]
          const formatted =
            typeof value === 'number' && Number.isFinite(value)
              ? item.formatValue(value, datum)
              : (item.missingValueLabel ?? '—')

          return (
            <div
              key={item.key}
              className="flex items-start justify-between gap-3 text-[11.5px]"
            >
              <dt className="flex items-center gap-1.5 text-graphite">
                <SeriesMarker kind={item.kind} color={item.color} />
                {item.label}
              </dt>
              <dd className="shrink-0 font-mono text-ink tabular-nums">
                {formatted}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
