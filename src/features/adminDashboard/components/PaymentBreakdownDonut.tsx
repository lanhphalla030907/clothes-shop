import { EmptyState } from '@/components/account/States'
import { PaymentDonutChart } from '@/features/shared/charts'
import type { CashReconciliationCurrency } from '@/types/api'

interface PaymentBreakdownDonutProps {
  rows: readonly CashReconciliationCurrency[]
  currency?: string
  onCurrencyChange: (currency: string) => void
}

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

      <PaymentDonutChart row={selected} />
    </div>
  )
}