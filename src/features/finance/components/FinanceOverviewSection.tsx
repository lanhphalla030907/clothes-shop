import { useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BadgePercent,
  Package,
  Percent,
  Receipt,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react'
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
import { formatCount, formatRatioPercent } from '../utils'
import { CoverageBar, PartialProfitBadge, UnknownMoney } from './FinanceBadges'
import { FinanceKpiCard } from './FinanceKpiCard'
import type { FinanceKpiTone } from './FinanceKpiCard'
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
          <Action variant="outline" size="sm" onClick={onRetry} disabled={isRefreshing}>
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
            Refresh
          </Action>
        }
      />

      {error !== undefined && overview === undefined && (
        <ErrorState message={toUserMessage(error)} onRetry={onRetry} />
      )}

      {error !== undefined && overview !== undefined && (
        <InlineNotice message={toUserMessage(error)} onDismiss={() => {}} />
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
  const coverageTone: FinanceKpiTone =
    coverage === null ? 'warning' : Number(row.costCoverage) >= 1 ? 'positive' : 'warning'
  const marginTone: FinanceKpiTone =
    margin === null ? 'warning' : Number(row.grossMargin) < 0 ? 'negative' : 'positive'

  return (
    <section className="card-premium overflow-hidden" aria-label={`${row.currency} finance overview`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-8 place-items-center rounded-md bg-ink font-mono text-[10px] font-semibold tracking-[0.06em] text-paper">
            {row.currency.slice(0, 3)}
          </span>
          <span>
            <span className="block font-mono text-[13px] font-semibold tracking-[0.08em] text-ink">
              {row.currency}
            </span>
            <span className="block text-[11px] text-graphite">
              {formatCount(row.orderCount)} eligible {row.orderCount === 1 ? 'order' : 'orders'}
            </span>
          </span>
          {row.isProfitPartial && <PartialProfitBadge />}
        </div>
        <button
          type="button"
          onClick={onOpenCash}
          className="inline-flex min-h-9 items-center gap-1 text-[12px] font-medium text-graphite underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Open cash reconciliation <span aria-hidden>→</span>
        </button>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        {/* The two headline metrics of the currency. */}
        <dl className="grid gap-4 sm:grid-cols-2">
          <FinanceKpiCard
            emphasis="hero"
            tone="info"
            icon={Wallet}
            label="Net revenue"
            value={formatMoney(row.netRevenue, row.currency)}
            hint="Product revenue plus shipping revenue."
            tooltip="Earned revenue in this currency. Net product revenue plus shipping revenue; it is not cash collected."
            className="card-premium"
          />
          <FinanceKpiCard
            emphasis="hero"
            tone={row.isProfitPartial ? 'warning' : 'positive'}
            icon={TrendingUp}
            label={profitLabel}
            value={
              row.grossProfit === null ? (
                <UnknownMoney />
              ) : (
                formatMoney(row.grossProfit, row.currency)
              )
            }
            hint={
              row.isProfitPartial
                ? 'Covers only revenue with comparable cost.'
                : 'Known-cost net revenue minus COGS.'
            }
            tooltip="Calculated only over merchandise revenue whose line has a comparable historical cost. It is not total-company profit."
            badge={row.isProfitPartial ? <PartialProfitBadge /> : undefined}
            className="card-premium"
          />
        </dl>

        <section aria-labelledby={`revenue-${row.currency}`}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 id={`revenue-${row.currency}`} className="text-[15px] font-semibold text-ink">
                Revenue &amp; cost
              </h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-graphite">
                The components behind net revenue and known-cost profit.
              </p>
            </div>
            <p className="text-[11px] text-ash">All amounts in {row.currency}</p>
          </div>

          <dl className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FinanceKpiCard
              label="Gross product sales"
              value={formatMoney(row.grossSales, row.currency)}
              hint="Merchandise value before discounts, excluding shipping."
              tooltip="Order subtotal for eligible orders. This is not cash and does not include the shipping charge."
              icon={ShoppingBag}
              className="card-premium"
            />
            <FinanceKpiCard
              label="Product discounts"
              value={formatMoney(row.productDiscounts, row.currency)}
              hint="Allocated to merchandise only."
              tooltip="Promotion discounts that reduce product revenue. Free-shipping discounts are separated into shipping discounts."
              tone="negative"
              icon={BadgePercent}
              className="card-premium"
            />
            <FinanceKpiCard
              label="Net product revenue"
              value={formatMoney(row.netProductRevenue, row.currency)}
              hint="Gross product sales minus product discounts."
              tooltip="Merchandise revenue after product discounts, before shipping revenue."
              tone="info"
              icon={Receipt}
              className="card-premium"
            />
            <FinanceKpiCard
              label="Shipping revenue"
              value={formatMoney(row.shippingRevenue, row.currency)}
              hint="Customer shipping charge after free-shipping discounts."
              tooltip="The customer-facing shipping amount retained after shipping discounts. Carrier cost is not recorded."
              tone="positive"
              icon={Truck}
              className="card-premium"
            />
            <FinanceKpiCard
              label="COGS"
              value={
                hasComparableCost ? (
                  formatMoney(row.cogs!, row.currency)
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
              tone={hasComparableCost ? 'neutral' : 'warning'}
              icon={Package}
              className="card-premium"
            />
            <FinanceKpiCard
              label="Gross profit margin"
              value={margin === null ? <UnknownMoney /> : margin}
              hint="Known-cost gross profit ÷ known-cost net revenue."
              tooltip="Margin is unavailable when no line has a comparable cost. It is not calculated as revenue minus zero cost."
              tone={marginTone}
              icon={Percent}
              className="card-premium"
            />
          </dl>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <CostCoveragePanel
            row={row}
            coverage={coverage}
            coverageTone={coverageTone}
            hasComparableCost={hasComparableCost}
          />
          <OrdersAndCashPanel row={row} cash={cash} />
        </div>

        {row.discountMismatchCount > 0 && (
          <div className="flex items-start gap-2 border border-line bg-bone px-4 py-3 text-[12px] leading-relaxed text-graphite">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <p>
              <span className="font-semibold text-ink">
                {formatCount(row.discountMismatchCount)} discount{' '}
                {row.discountMismatchCount === 1 ? 'record does' : 'records do'} not reconcile.
              </span>{' '}
              The order total remains authoritative; the product/shipping split uses the
              recorded promotion usage.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function CostCoveragePanel({
  row,
  coverage,
  coverageTone,
  hasComparableCost,
}: {
  row: FinanceOverviewCurrency
  coverage: string | null
  coverageTone: FinanceKpiTone
  hasComparableCost: boolean
}) {
  const coverageColor =
    coverageTone === 'positive'
      ? 'text-emerald-700'
      : coverageTone === 'warning'
        ? 'text-warning'
        : 'text-ash'

  return (
    <section
      className="card-premium flex flex-col p-5 sm:p-6"
      aria-labelledby={`coverage-${row.currency}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-graphite">Cost coverage</p>
          <h3 id={`coverage-${row.currency}`} className="mt-1 text-[15px] font-semibold text-ink">
            How complete is the cost data?
          </h3>
        </div>
        <div className="text-right">
          <p
            className={`font-mono text-[1.85rem] leading-none font-semibold tabular-nums ${coverageColor}`}
          >
            {coverage ?? 'Unknown'}
          </p>
          <p className="mt-1 text-[11px] text-ash">of merchandise revenue</p>
        </div>
      </div>

      <div className="mt-4">
        <CoverageBar coverage={row.costCoverage} />
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border border-line bg-bone/50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-graphite">Known-cost net revenue</dt>
          <dd className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-ink">
            {formatMoney(row.knownCostNetRevenue, row.currency)}
          </dd>
        </div>
        <div className="border border-line bg-bone/50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-graphite">Net product revenue</dt>
          <dd className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-ink">
            {formatMoney(row.netProductRevenue, row.currency)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-[12px] leading-relaxed text-graphite">
        {hasComparableCost
          ? row.isProfitPartial
            ? `COGS is comparable for ${coverage ?? 'part'} of merchandise revenue. The remainder has no comparable cost snapshot and is excluded from COGS and known-cost revenue, so profit is partial.`
            : 'Every line in this currency has a comparable historical cost snapshot, so COGS and known-cost profit cover the full merchandise revenue.'
          : 'No line in this currency has a comparable historical cost snapshot. COGS, gross profit and margin are unknown, not zero.'}
      </p>

      {row.isProfitPartial && (
        <div className="mt-4 flex items-start gap-2 border border-warning/25 bg-warning-soft px-3 py-2.5 text-[12px] leading-relaxed text-ink">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <p>
            <span className="font-semibold">Known-cost profit is partial.</span> It covers
            only revenue with comparable cost data, not total company profit.
          </p>
        </div>
      )}
    </section>
  )
}

function OrdersAndCashPanel({
  row,
  cash,
}: {
  row: FinanceOverviewCurrency
  cash: CashReconciliationCurrency | undefined
}) {
  return (
    <section
      className="card-premium flex flex-col p-5 sm:p-6"
      aria-labelledby={`orders-${row.currency}`}
    >
      <div>
        <p className="eyebrow text-graphite">Orders &amp; collection</p>
        <h3 id={`orders-${row.currency}`} className="mt-1 text-[15px] font-semibold text-ink">
          Operational summary
        </h3>
      </div>

      <dl className="mt-4 grid flex-1 grid-cols-2 gap-x-4 gap-y-5">
        <Stat label="Eligible orders" value={formatCount(row.orderCount)} />
        <Stat
          label="Cash collected"
          value={cash === undefined ? '—' : formatMoney(cash.cashCollected, row.currency)}
          tone="info"
          hint="Money received, not earned revenue."
        />
        <Stat
          label="Total discounts"
          value={formatMoney(row.totalDiscounts, row.currency)}
          tone="negative"
        />
        <Stat
          label="Average order value"
          value={
            row.averageOrderValue === null
              ? '—'
              : formatMoney(row.averageOrderValue, row.currency)
          }
        />
        <Stat label="Online orders" value={formatCount(row.onlinePaidOrderCount)} />
        <Stat label="COD orders" value={formatCount(row.codOrderCount)} />
      </dl>

      <p className="mt-4 border-t border-line-soft pt-3 text-[11px] leading-relaxed text-ash">
        Cash collected is money received in this window. It is not revenue and is never
        added to revenue.
      </p>
    </section>
  )
}

function Stat({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: ReactNode
  tone?: FinanceKpiTone
  hint?: string
}) {
  const color =
    tone === 'info'
      ? 'text-blue-700'
      : tone === 'negative'
        ? 'text-rose-700'
        : tone === 'positive'
          ? 'text-emerald-700'
          : 'text-ink'

  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium text-graphite">{label}</dt>
      <dd className={`mt-1 font-mono text-[15px] font-semibold tabular-nums ${color}`}>
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-[10.5px] leading-relaxed text-ash">{hint}</p>}
    </div>
  )
}

const OverviewSkeleton = () => (
  <div
    className="card-premium p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading finance overview"
  >
    <span className="sr-only">Loading finance overview</span>
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="rounded-xl border border-line bg-paper p-5 sm:p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-40" />
          <Skeleton className="mt-3 h-2.5 w-full" />
        </div>
      ))}
    </div>

    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="rounded-xl border border-line bg-paper p-5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-2.5 w-full" />
        </div>
      ))}
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="rounded-xl border border-line bg-paper p-5 sm:p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-8 w-24" />
          <Skeleton className="mt-4 h-2.5 w-full" />
          <Skeleton className="mt-2 h-2.5 w-5/6" />
        </div>
      ))}
    </div>
  </div>
)