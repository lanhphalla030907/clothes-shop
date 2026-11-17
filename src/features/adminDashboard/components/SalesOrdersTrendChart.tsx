import { ComposedMetricChart } from '@/features/shared/charts'
import type { ComposedDatum, ComposedSeries } from '@/features/shared/charts'
import {
  CHART_COLORS,
  formatOrdersAxisValue,
  formatOrdersTooltipValue,
  formatPeriodAxisLabel,
  formatPeriodTooltipLabel,
  formatRevenueAxisValue,
  formatRevenueTooltipValue,
} from '@/features/shared/charts/chartFormatters'
import type {
  FinanceRangeResponse,
  FinanceTrendGranularity,
  RevenueTrendBucket,
} from '@/types/api'
import {
  formatFinanceRange,
  granularityLabel,
} from '@/features/finance/utils'

interface SalesOrdersTrendChartProps {
  buckets: readonly RevenueTrendBucket[]
  currency: string
  granularity: FinanceTrendGranularity
  range: FinanceRangeResponse
  timezone: string
}

/** API money strings are kept as-is; missing cost data stays missing. */
function finiteValue(value: number | string | null): number | null {
  if (value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function SalesOrdersTrendChart({
  buckets,
  currency,
  granularity,
  range,
  timezone,
}: SalesOrdersTrendChartProps) {
  const groupLabel = `Sales, profit and orders trend in ${currency}`
  const chartLabel = `${groupLabel}. Revenue and profit use a money axis; orders use a separate count axis. ${formatFinanceRange(range)} in ${timezone}, ${granularityLabel(granularity).toLowerCase()} buckets.`

  const chartData: ComposedDatum[] = buckets.map((bucket) => ({
    label: formatPeriodAxisLabel(bucket.period, granularity),
    fullLabel: formatPeriodTooltipLabel(bucket.period, granularity),
    revenue: finiteValue(bucket.netRevenue),
    profit: finiteValue(bucket.grossProfit),
    orders: finiteValue(bucket.orderCount),
  }))

  if (chartData.length === 0) {
    return (
      <div className="space-y-4" role="group" aria-label={groupLabel}>
        <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
          No periods in this reporting window.
        </p>
        <p className="text-[11px] text-ash">
          No data available for the selected period and currency.
        </p>
        <div className="sr-only">
          <table>
            <caption>{groupLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Net revenue</th>
                <th scope="col">Profit</th>
                <th scope="col">Orders</th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>
      </div>
    )
  }

  const series: ComposedSeries[] = [
    {
      key: 'revenue',
      label: 'Revenue',
      kind: 'bar',
      color: CHART_COLORS.revenue,
      axis: 'left',
      formatValue: (value) => formatRevenueTooltipValue(value, currency),
      formatAxis: (value) => formatRevenueAxisValue(value, currency),
    },
    {
      key: 'profit',
      label: 'Profit',
      kind: 'line',
      color: CHART_COLORS.grossProfit,
      axis: 'left',
      formatValue: (value) => formatRevenueTooltipValue(value, currency),
      missingValueLabel: 'Not available',
    },
    {
      key: 'orders',
      label: 'Orders',
      kind: 'area',
      color: 'var(--color-finance-shipping)',
      axis: 'right',
      formatValue: (value) => formatOrdersTooltipValue(value),
      formatAxis: (value) => formatOrdersAxisValue(value),
    },
  ]

  const profitAvailable = chartData.some(
    (point) => typeof point.profit === 'number',
  )
  const profitNote = !profitAvailable
    ? 'Profit is unavailable for this window because cost data is missing.'
    : buckets.some((bucket) => bucket.isProfitPartial)
      ? 'Profit uses known costs only and may be partial.'
      : 'Profit uses known costs only.'

  const moneyCell = (value: number | string | null): string => {
    const parsed = finiteValue(value)
    return parsed === null ? 'Not available' : formatRevenueTooltipValue(parsed, currency)
  }

  return (
    <div className="space-y-4" role="group" aria-label={groupLabel}>
      <ComposedMetricChart
        data={chartData}
        series={series}
        height={300}
        ariaLabel={chartLabel}
      />

      <p className="text-[11px] leading-relaxed text-ash">
        {profitNote} Orders use a separate count axis. Hover or focus a period
        to inspect exact values.
      </p>

      <div className="sr-only">
        <table>
          <caption>{groupLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">Net revenue</th>
              <th scope="col">Profit (known cost)</th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.period}>
                <th scope="row">
                  {formatPeriodTooltipLabel(bucket.period, granularity)}
                </th>
                <td>{moneyCell(bucket.netRevenue)}</td>
                <td>{moneyCell(bucket.grossProfit)}</td>
                <td>{formatOrdersTooltipValue(bucket.orderCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
