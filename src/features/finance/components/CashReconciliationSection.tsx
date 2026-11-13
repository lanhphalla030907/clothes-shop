import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/api/errors'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import type { CashReconciliationCurrency } from '@/types/api'
import { fetchFinanceCashReconciliation } from '../api'
import type { AppliedFinanceFilters } from '../hooks/useFinanceFilters'
import { formatCount, formatFinanceRange } from '../utils'
import { FinanceKpiCard } from './FinanceKpiCard'
import { FinanceSectionHeading } from './FinanceSectionHeading'

type CashReconciliationSectionProps = {
  filters: AppliedFinanceFilters
  onCurrencies: (currencies: readonly string[]) => void
}

/**
 * Cash movement, receivables and unpaid online orders.
 *
 * Cash is deliberately not derived from revenue in the browser. The backend
 * returns online cash, COD cash, delivered-but-uncollected COD and unpaid online
 * orders as separate values, and this panel displays them unchanged.
 */
export function CashReconciliationSection({
  filters,
  onCurrencies,
}: CashReconciliationSectionProps) {
  const query = useMemo(
    () => ({
      from: filters.from,
      to: filters.to,
      currency: filters.currency,
    }),
    [filters.from, filters.to, filters.currency],
  )

  const cash = useAsyncResource(
    (signal) => fetchFinanceCashReconciliation(query, signal),
    [query],
  )

  useEffect(() => {
    if (!cash.data) return
    onCurrencies(cash.data.byCurrency.map((row) => row.currency))
  }, [cash.data, onCurrencies])

  const currencies = cash.data?.byCurrency ?? []

  return (
    <section className="space-y-5" aria-label="Cash reconciliation">
      <FinanceSectionHeading
        eyebrow="Cash reconciliation"
        title="Cash received, COD receivables and unpaid online orders"
        description="Cash is measured by when it moved. Delivered COD that has not been collected is a receivable, not cash. Revenue and cash are never added together."
        action={
          <Action
            variant="outline"
            size="sm"
            onClick={cash.refetch}
            disabled={cash.isRefreshing}
          >
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
            Refresh
          </Action>
        }
      />

      {cash.data && (
        <p className="border border-line bg-bone px-4 py-3 text-[12px] leading-relaxed text-graphite">
          Window {formatFinanceRange(cash.data.range)} · {cash.data.range.timezone}.
          Cash reconciliation has no revenue-basis parameter: it is dated by
          payment or collection, receivables by delivery, and unpaid online orders
          by creation.
        </p>
      )}

      {cash.error !== undefined && cash.data === undefined && (
        <ErrorState message={toUserMessage(cash.error)} onRetry={cash.refetch} />
      )}

      {cash.error !== undefined && cash.data !== undefined && (
        <InlineNotice message={toUserMessage(cash.error)} />
      )}

      {cash.isRefreshing && (
        <p className="text-[12px] text-graphite" role="status">
          Refreshing cash reconciliation…
        </p>
      )}

      {cash.isLoading && cash.data === undefined && <CashSkeleton />}

      {!cash.isLoading && cash.data !== undefined && currencies.length === 0 && (
        <EmptyState
          align="left"
          eyebrow="No cash movement"
          title="No cash or receivable records in this window"
          description="Change the date range or currency. Delivered but uncollected COD and unpaid online orders appear even when no cash was collected."
          action={
            <Action variant="outline" size="sm" onClick={cash.refetch}>
              Refresh
            </Action>
          }
        />
      )}

      {currencies.length > 1 && (
        <p className="border border-line bg-bone px-4 py-3 text-[12.5px] leading-relaxed text-graphite">
          Multiple currencies are present. Each currency is reconciled separately;
          no exchange rate is applied and no totals are combined.
        </p>
      )}

      {currencies.map((row) => (
        <CashCurrencyPanel key={row.currency} row={row} />
      ))}
    </section>
  )
}

function CashCurrencyPanel({ row }: { row: CashReconciliationCurrency }) {
  const varianceIsNonZero = Number(row.reconciliationVariance) !== 0

  return (
    <div className="card-premium overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-ink">
            {row.currency}
          </span>
          <span className="text-[12px] text-graphite">
            {formatCount(row.counts.deliveredOrders)} delivered ·{' '}
            {formatCount(row.counts.onlinePaidOrders)} online paid ·{' '}
            {formatCount(row.counts.codCollectedOrders)} COD collected
          </span>
        </div>
        <span
          className={`inline-flex border px-2 py-0.5 text-[11px] font-semibold ${
            varianceIsNonZero
              ? 'border-warning/25 bg-warning-soft text-warning'
              : 'border-success/25 bg-success-soft text-success'
          }`}
        >
          {varianceIsNonZero ? 'Variance detected' : 'Reconciled'}
        </span>
      </div>

      <dl className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
        <FinanceKpiCard
          label="Online cash collected"
          value={<CashMoney amount={row.onlineCash} currency={row.currency} />}
          hint={`${formatCount(row.counts.onlinePaidOrders)} paid online orders.`}
          tooltip="Confirmed online payments in this window. A paid order linked to COD is not counted here again as COD cash."
        />
        <FinanceKpiCard
          label="COD cash collected"
          value={<CashMoney amount={row.codCash} currency={row.currency} />}
          hint={`${formatCount(row.counts.codCollectedOrders)} COD collections.`}
          tooltip="COD cash recorded by collection time. It may be collected before delivery and is counted once."
        />
        <FinanceKpiCard
          label="Delivered but uncollected COD"
          value={<CashMoney amount={row.codReceivable} currency={row.currency} />}
          hint={`${formatCount(row.counts.codReceivableOrders)} delivered COD orders.`}
          tooltip="A receivable: the order was delivered but no COD collection is recorded. It is not cash collected."
        />
        <FinanceKpiCard
          label="Unpaid online orders"
          value={<CashMoney amount={row.unpaidOnline} currency={row.currency} />}
          hint={`${formatCount(row.counts.unpaidOnlineOrders)} online orders.`}
          tooltip="Online orders with no successful payment in this window. These are neither revenue nor cash collected."
        />
      </dl>

      <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <CashStat
          label="Total cash collected"
          value={<CashMoney amount={row.cashCollected} currency={row.currency} small />}
          hint="Online cash plus COD cash."
        />
        <CashStat
          label="Accrual revenue"
          value={<CashMoney amount={row.accrualRevenue} currency={row.currency} small />}
          hint="Revenue recognised in the same window, for comparison only."
        />
        <CashStat
          label="Reconciliation variance"
          value={
            <CashMoney amount={row.reconciliationVariance} currency={row.currency} small />
          }
          hint={
            varianceIsNonZero
              ? 'Cash movement and accrual revenue differ. Investigate collections and timing.'
              : 'Cash movement and accrual revenue agree for this window.'
          }
        />
        <CashStat
          label="Other cash"
          value={
            <span className="font-mono text-[12px] tabular-nums text-ink">
              {formatMoney(row.orphanCash, row.currency)} orphan ·{' '}
              {formatMoney(row.deferredCash, row.currency)} deferred
            </span>
          }
          hint={`${formatCount(row.counts.orphanCashOrders)} orphan · ${formatCount(row.counts.deferredCashOrders)} deferred orders.`}
        />
      </div>

      <div className="border-t border-line bg-bone px-5 py-4 text-[12px] leading-relaxed text-graphite sm:px-6">
        Cash collected is not revenue. Delivered COD that remains uncollected is a
        receivable, and unpaid online orders are neither revenue nor cash. The
        values above come directly from the cash reconciliation response.
      </div>
    </div>
  )
}

function CashStat({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint: string
}) {
  return (
    <div className="bg-paper px-5 py-4 sm:px-6">
      <dt className="text-[11px] font-medium text-graphite">{label}</dt>
      <dd className="mt-1.5 text-[13px] text-ink">{value}</dd>
      <p className="mt-1 text-[11px] leading-relaxed text-ash">{hint}</p>
    </div>
  )
}

function CashMoney({
  amount,
  currency,
  small = false,
}: {
  amount: string
  currency: string
  small?: boolean
}) {
  return (
    <span
      className={
        small
          ? 'font-mono text-[13px] font-medium tabular-nums text-ink'
          : 'font-mono text-[1.45rem] leading-none font-semibold tabular-nums text-ink'
      }
    >
      {formatMoney(amount, currency)}
    </span>
  )
}

const CashSkeleton = () => (
  <div
    className="card-premium p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading cash reconciliation"
  >
    <span className="sr-only">Loading cash reconciliation</span>
    <Skeleton className="h-3 w-52" />
    <div className="mt-5 grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="bg-paper p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-2.5 w-full" />
        </div>
      ))}
    </div>
  </div>
)
