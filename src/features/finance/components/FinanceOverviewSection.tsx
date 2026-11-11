import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { formatMoney } from '@/lib/money'
import type {
  CashReconciliationCurrency,
  FinanceOverviewCurrency,
  FinanceOverviewResponse,
} from '@/types/api'
import { toUserMessage } from '@/lib/api/errors'
import {
  formatCount,
  formatRatioPercent,
} from '../utils'
import {
  CoverageBar,
  PartialProfitBadge,
  UnknownMoney,
} from './FinanceBadges'
import { FinanceKpiCard } from './FinanceKpiCard'
import { FinanceSectionHeading } from './FinanceSectionHeading'

type FinanceOverviewSectionProps = {
  overview: FinanceOverviewResponse | undefined
  isLoading: boolean
  isRefreshing: boolean
  error: unknown
  onRetry: () => void
  onOpenCash: () => void
  onCurrencies: (currencies: readonly string[]) => void
}

/**
 * Revenue, discount and known-cost profit KPIs, rendered once per currency.
 *
 * Revenue and cash are separate rows of meaning: `netRevenue` is earned value,
 * while `cashCollected` is money that actually moved. They are never substituted
 * for one another.
 */
export function FinanceOverviewSection({
  overview,
  isLoading,
  isRefreshing,
  error,
  onRetry,
  onOpenCash,
  onCurrencies,
}: FinanceOverviewSectionProps) {
  useEffect(() => {
    if (!overview) return
    onCurrencies([
      ...overview.byCurrency.map((row) => row.currency),
      ...overview.cashByCurrency.map((row) => row.currency),
    ])
  }, [overview, onCurrencies])

  const currencies = overview?.byCurrency ?? []
  const hasMultipleCurrencies = currencies.length > 1

  return (
    <div className="space-y-6">
      <FinanceSectionHeading
        eyebrow="Overview"
        title="Revenue, profit and cash"
        description="Every figure is calculated by the finance API. Revenue is earned value; cash collected is money that moved and is shown separately. Profit is known-cost only."
        action={
          <Action
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
            Refresh
          </Action>
        }
      />

      {error !== undefined && overview === undefined && (
        <ErrorState message={toUserMessage(error)} onRetry={onRetry} />
      )}

      {error !== undefined && overview !== undefined && (
        <InlineNotice
          message={toUserMessage(error)}
          onDismiss={() => {}}
        />
      )}

      {isRefreshing && (
        <p className="text-[12px] text-graphite" role="status">
          Refreshing finance data…
        </p>
      )}

      {isLoading && overview === undefined && <OverviewSkeleton />}

      {!isLoading && overview !== undefined && currencies.length === 0 && (
        <EmptyState
          align="left"
          eyebrow="No eligible revenue"
          title="No orders match this reporting window"
          description="Revenue appears after an order is delivered, or after a payment or COD collection when the booked basis is selected."
          action={
            <Action variant="outline" size="sm" onClick={onRetry}>
              Refresh
            </Action>
          }
        />
      )}

      {hasMultipleCurrencies && (
        <p className="border border-line bg-bone px-4 py-3 text-[12.5px] leading-relaxed text-graphite">
          Multiple currencies are present. Each currency is shown in its own panel;
          amounts are never converted or added together.
        </p>
      )}

      {currencies.map((currency) => (
        <CurrencyOverview
          key={currency.currency}
          row={currency}
          cash={overview?.cashByCurrency.find(
            (candidate) => candidate.currency === currency.currency,
          )}
          onOpenCash={onOpenCash}
        />
      ))}
    </div>
  )
}

function CurrencyOverview({
  row,
  cash,
  onOpenCash,
}: {
  row: FinanceOverviewCurrency
  cash: CashReconciliationCurrency | undefined
  onOpenCash: () => void
}) {
  const coverage = formatRatioPercent(row.costCoverage)
  const margin = formatRatioPercent(row.grossMargin)
  const hasComparableCost = row.cogs !== null
  const profitLabel = row.isProfitPartial
    ? 'Known-cost gross profit'
    : 'Gross profit'

  return (
    <div className="border border-line bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-ink">
            {row.currency}
          </span>
          <span className="text-[12px] text-graphite">
            {formatCount(row.orderCount)} eligible {row.orderCount === 1 ? 'order' : 'orders'}
          </span>
          {row.isProfitPartial && <PartialProfitBadge />}
        </div>
        <button
          type="button"
          onClick={onOpenCash}
          className="inline-flex min-h-9 items-center text-[12px] font-medium text-graphite underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Open cash reconciliation →
        </button>
      </div>

      <dl className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-5">
        <FinanceKpiCard
          label="Gross product sales"
          value={<KpiMoney amount={row.grossSales} currency={row.currency} />}
          hint="Merchandise value before discounts, excluding shipping."
          tooltip="Order subtotal for eligible orders. This is not cash and does not include the shipping charge."
        />
        <FinanceKpiCard
          label="Product discounts"
          value={<KpiMoney amount={row.productDiscounts} currency={row.currency} />}
          hint="Allocated to merchandise only."
          tooltip="Promotion discounts that reduce product revenue. Free-shipping discounts are separated into shipping discounts."
        />
        <FinanceKpiCard
          label="Net product revenue"
          value={<KpiMoney amount={row.netProductRevenue} currency={row.currency} />}
          hint="Gross product sales minus product discounts."
          tooltip="Merchandise revenue after product discounts, before shipping revenue."
        />
        <FinanceKpiCard
          label="Shipping revenue"
          value={<KpiMoney amount={row.shippingRevenue} currency={row.currency} />}
          hint="Customer shipping charge after free-shipping discounts."
          tooltip="The customer-facing shipping amount retained after shipping discounts. Carrier cost is not recorded."
        />
        <FinanceKpiCard
          label="COGS"
          value={
            hasComparableCost ? (
              <KpiMoney amount={row.cogs!} currency={row.currency} />
            ) : (
              <UnknownMoney />
            )
          }
          hint={
            hasComparableCost
              ? `Cost for ${coverage ?? 'part'} of merchandise revenue.`
              : 'No comparable historical cost snapshot.'
          }
          tooltip="Cost of goods sold from the cost snapshot captured at checkout. Missing or mismatched cost is never treated as zero."
        />
        <FinanceKpiCard
          label={profitLabel}
          value={
            row.grossProfit === null ? (
              <UnknownMoney />
            ) : (
              <KpiMoney amount={row.grossProfit} currency={row.currency} />
            )
          }
          hint={
            row.isProfitPartial
              ? 'Covers only revenue with comparable cost.'
              : 'Known-cost net revenue minus COGS.'
          }
          tooltip="Gross profit is calculated only over merchandise revenue whose line has a comparable historical cost. It is not total-company profit."
          badge={row.isProfitPartial ? <PartialProfitBadge /> : undefined}
        />
        <FinanceKpiCard
          label="Gross profit margin"
          value={
            margin === null ? (
              <UnknownMoney />
            ) : (
              <span className="font-mono text-[1.45rem] leading-none font-semibold tabular-nums text-ink">
                {margin}
              </span>
            )
          }
          hint="Known-cost gross profit ÷ known-cost net revenue."
          tooltip="Margin is unavailable when no line has a comparable cost. It is not calculated as revenue minus zero cost."
        />
        <FinanceKpiCard
          label="Cost coverage"
          value={
            coverage === null ? (
              <UnknownMoney />
            ) : (
              <span className="font-mono text-[1.45rem] leading-none font-semibold tabular-nums text-ink">
                {coverage}
              </span>
            )
          }
          hint="Share of merchandise revenue with comparable cost."
          tooltip="The portion of product revenue that has a historical cost snapshot in the same currency. Lower coverage makes profit partial."
          footer={<CoverageBar coverage={row.costCoverage} />}
        />
        <FinanceKpiCard
          label="Eligible orders"
          value={
            <span className="font-mono text-[1.45rem] leading-none font-semibold tabular-nums text-ink">
              {formatCount(row.orderCount)}
            </span>
          }
          hint="Orders recognised under the selected basis."
          tooltip="Delivered basis counts successful deliveries; booked basis counts online payment or COD collection evidence."
        />
        <FinanceKpiCard
          label="Cash collected"
          value={
            cash === undefined ? (
              <span className="text-[13px] font-medium text-graphite">—</span>
            ) : (
              <KpiMoney amount={cash.cashCollected} currency={row.currency} />
            )
          }
          hint="Money received, not earned revenue."
          tooltip="Online cash plus confirmed COD cash in this window. It is not the same as revenue and is never added to revenue."
        />
      </dl>

      <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <SecondaryStat
          label="Net revenue"
          value={<KpiMoney amount={row.netRevenue} currency={row.currency} small />}
          hint="Product revenue plus shipping revenue."
        />
        <SecondaryStat
          label="Total discounts"
          value={<KpiMoney amount={row.totalDiscounts} currency={row.currency} small />}
          hint={`Includes ${formatMoney(row.shippingDiscounts, row.currency)} shipping discounts.`}
        />
        <SecondaryStat
          label="Average order value"
          value={
            row.averageOrderValue === null ? (
              '—'
            ) : (
              <KpiMoney amount={row.averageOrderValue} currency={row.currency} small />
            )
          }
          hint="Net revenue ÷ eligible orders."
        />
        <SecondaryStat
          label="Order mix"
          value={
            <span className="font-mono text-[13px] tabular-nums text-ink">
              {formatCount(row.onlinePaidOrderCount)} online · {formatCount(row.codOrderCount)} COD
            </span>
          }
          hint="Paid online orders and COD orders in the eligible set."
        />
      </div>

      {row.isProfitPartial && (
        <div className="border-t border-line bg-warning-soft px-5 py-4 text-[12.5px] leading-relaxed text-ink sm:px-6">
          <p className="font-semibold">Profit is partial</p>
          <p className="mt-1 text-ink/80">
            {hasComparableCost
              ? `COGS is comparable for ${coverage ?? 'less than 100%'} of merchandise revenue. Missing or mismatched-currency cost is excluded from COGS and from known-cost revenue, so the profit and margin above are not total profit.`
              : 'No line in this currency has a comparable historical cost snapshot. COGS, gross profit and margin are unknown, not zero. Unknown-cost revenue remains visible in net revenue.'}
          </p>
        </div>
      )}

      {row.discountMismatchCount > 0 && (
        <div className="border-t border-line bg-bone px-5 py-4 text-[12.5px] leading-relaxed text-graphite sm:px-6">
          <span className="font-medium text-ink">
            {formatCount(row.discountMismatchCount)} discount{' '}
            {row.discountMismatchCount === 1 ? 'record does' : 'records do'} not reconcile.
          </span>{' '}
          The order total remains authoritative; the product/shipping split uses the
          recorded promotion usage.
        </div>
      )}
    </div>
  )
}

function SecondaryStat({
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

function KpiMoney({
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

const OverviewSkeleton = () => (
  <div
    className="border border-line bg-paper p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading finance overview"
  >
    <span className="sr-only">Loading finance overview</span>
    <Skeleton className="h-3 w-40" />
    <div className="mt-5 grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="bg-paper p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-3 h-2.5 w-full" />
        </div>
      ))}
    </div>
  </div>
)
