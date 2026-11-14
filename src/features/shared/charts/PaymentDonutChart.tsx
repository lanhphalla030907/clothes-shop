import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCount } from '@/features/finance/utils'
import { formatMoney } from '@/lib/money'
import { CHART_COLORS } from './chartFormatters'
import type { CashReconciliationCurrency } from '@/types/api'
import { paymentBreakdown } from '@/features/adminDashboard/reporting'

interface PaymentDonutChartProps {
  row: CashReconciliationCurrency
  className?: string
  ariaLabel?: string
}

interface DonutSegment {
  key: 'online' | 'cod'
  label: string
  value: number
  amount: string
  share: string
  color: string
  count: number
  countLabel: string
}

export function PaymentDonutChart({
  row,
  className = '',
  ariaLabel = 'Payment collection breakdown',
}: PaymentDonutChartProps) {
  const breakdown = paymentBreakdown(row)
  const totalValue = Number(breakdown.total)

  if (totalValue <= 0 || breakdown.segments.length === 0) {
    return (
      <div className="border border-line bg-bone px-4 py-6 text-center text-[13px] text-graphite" role="img" aria-label={ariaLabel}>
        <p className="font-semibold text-ink">No cash collected in this period</p>
        <p className="mt-1 text-graphite">Only successful online payments and completed COD collections count as collected cash.</p>
      </div>
    )
  }

  const segments: DonutSegment[] = breakdown.segments.map((segment) => ({
    key: segment.key,
    label: segment.label,
    value: segment.value,
    amount: segment.amount,
    share: segment.share,
    color: CHART_COLORS[segment.key],
    count: segment.key === 'online'
      ? row.counts.onlinePaidOrders
      : row.counts.codCollectedOrders,
    countLabel: segment.key === 'online' ? 'paid orders' : 'collections',
  }))

  const chartData = segments.map((segment) => ({
    name: segment.label,
    value: segment.value,
    amount: segment.amount,
    share: segment.share,
    color: segment.color,
    count: segment.count,
    countLabel: segment.countLabel,
  }))

  return (
    <div className={`space-y-4 ${className}`} role="img" aria-label={ariaLabel}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={74}
                paddingAngle={3}
                cornerRadius={4}
                dataKey="value"
                label={false}
                labelLine={false}
                startAngle={-90}
                endAngle={270}
                stroke="var(--color-paper-pure)"
                strokeWidth={1}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomDonutTooltip />}
                wrapperStyle={{ outline: 'none' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-[9px] font-semibold tracking-[0.08em] text-ash uppercase">
              Collected
            </span>
            <span className="mt-1 max-w-[5.5rem] font-mono text-[13px] font-semibold leading-tight text-ink tabular-nums">
              {formatMoney(row.cashCollected, row.currency)}
            </span>
          </div>
        </div>

        <dl className="min-w-0 flex-1 divide-y divide-line-soft">
          {segments.map((segment) => (
            <div key={segment.key} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <dt className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span>
                  <span className="block text-[12.5px] font-medium text-ink">
                    {segment.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ash">
                    {formatCount(segment.count)} {segment.countLabel}
                  </span>
                </span>
              </dt>
              <dd className="shrink-0 text-right">
                <span className="block font-mono text-[12.5px] font-semibold text-ink tabular-nums">
                  {formatMoney(segment.amount, row.currency)}
                </span>
                <span className="mt-0.5 block text-[11px] text-ash">
                  {segment.share}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="border-t border-line-soft pt-3 text-[11.5px] leading-relaxed text-graphite">
        Only successful online payments and completed COD collections are
        included. Pending, failed, expired and cancelled payments are not cash.
      </p>
      {!breakdown.reconciles && (
        <p className="text-[11.5px] font-medium text-warning">
          The collected total does not exactly equal the two cash components.
          The server total is shown unchanged.
        </p>
      )}
    </div>
  )
}

interface CustomDonutTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    payload: {
      amount: string
      share: string
      count: number
      countLabel: string
      name: string
    }
  }>
  label?: string
}

function CustomDonutTooltip({
  active,
  payload,
}: CustomDonutTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const entry = payload[0]
  const { amount, share, count, countLabel, name } = entry.payload

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-paper-pure px-3 py-2 shadow-[var(--shadow-sm)]"
      style={{ left: '50%', width: 220 }}
    >
      <p className="text-[10px] font-semibold tracking-[0.05em] text-graphite uppercase">
        {name}
      </p>
      <dl className="mt-1.5 space-y-1">
        <div className="flex items-start justify-between gap-3 text-[11.5px]">
          <dt className="flex items-center gap-1.5 text-graphite">
            <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {name}
          </dt>
          <dd className="shrink-0 font-mono text-ink tabular-nums">{amount}</dd>
        </div>
        <div className="flex items-start justify-between gap-3 text-[11.5px]">
          <dt className="flex items-center gap-1.5 text-graphite">
            <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            Share
          </dt>
          <dd className="shrink-0 font-mono text-ink tabular-nums">{share}</dd>
        </div>
        <div className="flex items-start justify-between gap-3 text-[11.5px]">
          <dt className="flex items-center gap-1.5 text-graphite">
            <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {count} {countLabel}
          </dt>
          <dd className="shrink-0 font-mono text-ink tabular-nums">{formatCount(count)}</dd>
        </div>
      </dl>
    </div>
  )
}