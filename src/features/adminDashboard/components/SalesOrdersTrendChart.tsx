import { RevenueAreaChart, OrdersLineChart } from '@/features/shared/charts'
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

export function SalesOrdersTrendChart({
  buckets,
  currency,
  granularity,
  range,
  timezone,
}: SalesOrdersTrendChartProps) {
  if (buckets.length === 0) {
    return (
      <div className="space-y-4" role="group" aria-label={`Sales and orders trend in ${currency}`}>
        <p className="border border-line bg-bone px-4 py-6 text-[13px] text-graphite">
          No periods in this reporting window.
        </p>
        <p className="text-[11px] text-ash">
          No data available for the selected period and currency.
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
            <tbody />
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="group" aria-label={`Sales and orders trend in ${currency}. Revenue and order count use separate Y axes.`}>
      <section aria-labelledby="revenue-heading">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="revenue-heading" className="text-[12px] font-semibold text-ink">Revenue</h3>
          <span className="font-mono text-[10.5px] text-graphite">{currency}</span>
        </div>
        <RevenueAreaChart
          data={buckets}
          currency={currency}
          granularity={granularity}
          height={196}
          ariaLabel={`Revenue trend in ${currency}, ${granularityLabel(granularity).toLowerCase()} buckets. ${formatFinanceRange(range)} in ${timezone}.`}
        />
      </section>

      <section aria-labelledby="orders-heading">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="orders-heading" className="text-[12px] font-semibold text-ink">Orders</h3>
          <span className="font-mono text-[10.5px] text-graphite">count</span>
        </div>
        <OrdersLineChart
          data={buckets}
          granularity={granularity}
          height={196}
          ariaLabel={`Order count trend. ${formatFinanceRange(range)} · ${granularityLabel(granularity)} buckets in ${timezone}. Orders per period, on a separate count axis.`}
        />
      </section>

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
                <th scope="row">{bucket.period}</th>
                <td>{bucket.netRevenue}</td>
                <td>{bucket.orderCount.toString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}