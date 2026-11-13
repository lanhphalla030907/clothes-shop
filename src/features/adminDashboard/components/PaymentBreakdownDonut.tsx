import { EmptyState } from '@/components/account/States'
import { formatMoney } from '@/lib/money'
import type { CashReconciliationCurrency } from '@/types/api'
import { formatCount } from '@/features/finance/utils'
import { paymentBreakdown } from '../reporting'

type PaymentBreakdownDonutProps = {
  rows: readonly CashReconciliationCurrency[]
  currency?: string
  onCurrencyChange: (currency: string) => void
}

const COLORS = {
  online: 'var(--color-finance-net)',
  cod: 'var(--color-finance-shipping)',
} as const

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTER = 70

/**
 * Collected cash split between online payment and cash on delivery.
 *
 * The finance API already defines the two non-overlapping cash sources and the
 * collected total. The browser only draws their shares; it never adds payments,
 * counts a pending attempt, or treats a cancelled order as cash.
 */
export function PaymentBreakdownDonut({
  rows,
  currency,
  onCurrencyChange,
}: PaymentBreakdownDonutProps) {
  const selected =
    rows.find((row) => row.currency === currency) ?? rows[0]

  if (!selected) {
    return (
      <EmptyState
        align="left"
        eyebrow="Payment collection"
        title="No cash data for this period"
        description="Collected online payments and cash on delivery will appear once money moves."
      />
    )
  }

  const breakdown = paymentBreakdown(selected)
  const circleSegments = breakdown.segments.map((segment, index) => {
    const length = (segment.value / breakdown.totalValue) * CIRCUMFERENCE
    const preceding = breakdown.segments
      .slice(0, index)
      .reduce(
        (sum, item) => sum + (item.value / breakdown.totalValue) * CIRCUMFERENCE,
        0,
      )
    return { segment, length, dashOffset: -preceding }
  })

  return (
    <div className="space-y-4">
      {rows.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Payment currency">
          {rows.map((row) => (
            <button
              key={row.currency}
              type="button"
              aria-pressed={row.currency === selected.currency}
              onClick={() => onCurrencyChange(row.currency)}
              className={`min-h-8 rounded-lg border px-3 font-mono text-[11.5px] font-semibold transition-colors ${
                row.currency === selected.currency
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper-pure text-ink hover:border-ink'
              }`}
            >
              {row.currency}
            </button>
          ))}
        </div>
      )}

      {breakdown.totalValue <= 0 || breakdown.segments.length === 0 ? (
        <EmptyState
          align="left"
          eyebrow={selected.currency}
          title="No cash collected in this period"
          description="Only successful online payments and completed cash-on-delivery collections count as collected cash."
        />
      ) : (
        <>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <svg
                viewBox="0 0 140 140"
                role="img"
                aria-label={`Payment collection breakdown in ${selected.currency}: ${breakdown.segments
                  .map((segment) => `${segment.label} ${segment.share}`)
                  .join(', ')}. Total ${formatMoney(breakdown.total, selected.currency)}.`}
                className="size-36"
              >
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  style={{ stroke: 'var(--color-line-soft)' }}
                  strokeWidth="18"
                />
                {circleSegments.map(({ segment, length, dashOffset }) => {
                  return (
                    <circle
                      key={segment.key}
                      cx={CENTER}
                      cy={CENTER}
                      r={RADIUS}
                      fill="none"
                      style={{ stroke: COLORS[segment.key] }}
                      strokeWidth="18"
                      strokeDasharray={`${length} ${Math.max(0, CIRCUMFERENCE - length)}`}
                      strokeDashoffset={dashOffset}
                      transform={`rotate(-90 ${CENTER} ${CENTER})`}
                    />
                  )
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
                <span className="text-[9.5px] font-semibold tracking-[0.07em] text-graphite uppercase">
                  Collected
                </span>
                <span className="mt-0.5 max-w-24 font-mono text-[12.5px] font-semibold leading-tight text-ink">
                  {formatMoney(breakdown.total, selected.currency)}
                </span>
              </div>
            </div>

            <dl className="min-w-0 flex-1 space-y-3">
              {breakdown.segments.map((segment) => (
                <div key={segment.key} className="flex items-start justify-between gap-3">
                  <dt className="flex min-w-0 items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[segment.key] }}
                    />
                    <span>
                      <span className="block text-[12.5px] font-medium text-ink">
                        {segment.label}
                      </span>
                      <span className="block text-[11px] text-graphite">
                        {formatCount(
                          segment.key === 'online'
                            ? selected.counts.onlinePaidOrders
                            : selected.counts.codCollectedOrders,
                        )}{' '}
                        {segment.key === 'online' ? 'paid orders' : 'collections'}
                      </span>
                    </span>
                  </dt>
                  <dd className="shrink-0 text-right">
                    <span className="block font-mono text-[12.5px] font-semibold text-ink tabular-nums">
                      {formatMoney(segment.amount, selected.currency)}
                    </span>
                    <span className="block text-[11px] text-graphite">
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
        </>
      )}
    </div>
  )
}
