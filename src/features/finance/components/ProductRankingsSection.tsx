import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/api/errors'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import type {
  ProductProfitItem,
  ProductProfitResponse,
  ProductRankingItem,
  ProductRankingsResponse,
} from '@/types/api'
import { fetchFinanceProducts, fetchFinanceRankings } from '../api'
import type { AppliedFinanceFilters } from '../hooks/useFinanceFilters'
import {
  FINANCE_RANKING_VIEWS,
  formatCount,
  formatRatioPercent,
  isFinanceRankingView,
  type FinanceRankingView,
} from '../utils'
import {
  CoverageBadge,
  PartialProfitBadge,
  UnknownCostBadge,
} from './FinanceBadges'
import { FinanceSectionHeading } from './FinanceSectionHeading'

type ProductRankingsSectionProps = {
  filters: AppliedFinanceFilters
  params: URLSearchParams
  setParams: (next: URLSearchParams, options?: { replace?: boolean }) => void
  onCurrencies: (currencies: readonly string[]) => void
}

const setOrDelete = (
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void => {
  if (value === undefined || value === '') params.delete(key)
  else params.set(key, value)
}
const RANKING_LIMIT = 10
export function ProductRankingsSection({
  filters,
  params,
  setParams,
  onCurrencies,
}: ProductRankingsSectionProps) {
  const viewParam = params.get('ranking')
  const view: FinanceRankingView = isFinanceRankingView(viewParam)
    ? viewParam
    : 'best-selling'
  const [refreshKey, setRefreshKey] = useState(0)

  const changeView = (next: FinanceRankingView) => {
    const updated = new URLSearchParams(params)
    setOrDelete(updated, 'ranking', next === 'best-selling' ? undefined : next)
    setParams(updated, { replace: true })
  }

  const activeView = FINANCE_RANKING_VIEWS.find((option) => option.value === view)

  return (
    <section className="space-y-5" aria-label="Product rankings">
      <FinanceSectionHeading
        eyebrow="Rankings"
        title="Best selling, most profitable and lowest profit"
        description="Units sold, revenue and known-cost profit are different measures. A product with insufficient cost data is never presented as a reliable profit ranking."
        action={
          <Action
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
            Refresh
          </Action>
        }
      />

      <div className="card-premium px-5 py-4 sm:px-6">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Ranking view">
          {FINANCE_RANKING_VIEWS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={view === option.value}
              onClick={() => changeView(option.value)}
              className={`min-h-9 border px-3 text-[12px] font-medium transition-colors ${
                view === option.value
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-paper-pure text-ink hover:border-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {activeView && (
          <p className="mt-3 text-[12px] leading-relaxed text-graphite">
            {activeView.description}
          </p>
        )}
      </div>

      {view === 'lowest-profit' && (
        <InlineNotice
          tone="info"
          message="Product-level rankings are descending-only in the finance API. This view uses server-sorted variant profitability, lowest first. It is not an aggregate product total calculated in the browser."
        />
      )}

      <RankingsDataView
        key={`${view}-${refreshKey}`}
        filters={filters}
        view={view}
        onCurrencies={onCurrencies}
      />
    </section>
  )
}

type RankingsData =
  | { kind: 'rankings'; response: ProductRankingsResponse }
  | { kind: 'products'; response: ProductProfitResponse }

function RankingsDataView({
  filters,
  view,
  onCurrencies,
}: {
  filters: AppliedFinanceFilters
  view: FinanceRankingView
  onCurrencies: (currencies: readonly string[]) => void
}) {
  const resource = useAsyncResource<RankingsData>(async (signal) => {
    if (view === 'lowest-profit') {
      const response = await fetchFinanceProducts(
        {
          ...filters,
          page: 1,
          limit: RANKING_LIMIT,
          sortBy: 'profit',
          sortOrder: 'asc',
        },
        signal,
      )
      return { kind: 'products', response }
    }

    const response = await fetchFinanceRankings(
      {
        ...filters,
        metric: view === 'best-selling' ? 'units' : 'profit',
        limit: RANKING_LIMIT,
      },
      signal,
    )
    return { kind: 'rankings', response }
  }, [filters, view])

  useEffect(() => {
    if (!resource.data) return
    onCurrencies(
      resource.data.response.items.map((item) => item.currency),
    )
  }, [resource.data, onCurrencies])

  if (resource.error !== undefined && resource.data === undefined) {
    return <ErrorState message={toUserMessage(resource.error)} onRetry={resource.refetch} />
  }

  if (resource.isLoading && resource.data === undefined) {
    return <RankingsSkeleton />
  }

  if (resource.data === undefined) return null

  const data = resource.data
  const items = data.response.items
  const isProfitView = view === 'most-profitable' || view === 'lowest-profit'

  if (items.length === 0) {
    return (
      <EmptyState
        align="left"
        eyebrow="No rankings"
        title="No products match this reporting window"
        description="Change the date range or recognition basis. A product needs eligible sales before it can appear here."
        action={
          <Action variant="outline" size="sm" onClick={resource.refetch}>
            Refresh
          </Action>
        }
      />
    )
  }

  const groups = groupByCurrency<CurrencyItem>(items)

  return (
    <div className="space-y-5">
      {resource.error !== undefined && (
        <InlineNotice message={toUserMessage(resource.error)} />
      )}
      {resource.isRefreshing && (
        <p className="text-[12px] text-graphite" role="status">
          Refreshing rankings…
        </p>
      )}

      {groups.map(([currency, currencyItems]) => (
        <div key={currency} className="card-premium overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12px] font-semibold tracking-[0.08em] text-ink">
                {currency}
              </span>
              <span className="text-[12px] text-graphite">
                Top {formatCount(currencyItems.length)}
              </span>
            </div>
            <p className="text-[11px] text-ash">
              {view === 'best-selling'
                ? 'Ranked by units sold'
                : view === 'most-profitable'
                  ? 'Ranked by known-cost gross profit'
                  : 'Server-sorted variant profit, lowest first'}
            </p>
          </div>

          {isProfitView ? (
            <ProfitRanking
              items={currencyItems}
              kind={data.kind}
              view={view}
            />
          ) : (
            <UnitsRanking items={currencyItems} kind={data.kind} />
          )}
        </div>
      ))}
    </div>
  )
}

type CurrencyItem = ProductRankingItem | ProductProfitItem

const isProductProfitItem = (
  item: CurrencyItem,
): item is ProductProfitItem => 'variantSku' in item

function ProfitRanking({
  items,
  kind,
  view,
}: {
  items: CurrencyItem[]
  kind: RankingsData['kind']
  view: FinanceRankingView
}) {
  const reliable = items.filter((item) => item.grossProfit !== null)
  const unknown = items.filter((item) => item.grossProfit === null)

  return (
    <div>
      {reliable.length === 0 ? (
        <div className="px-5 py-6 text-[13px] leading-relaxed text-graphite sm:px-6">
          No product in this currency has comparable cost data, so a profit
          ranking would be misleading. The rows below are shown without a rank.
        </div>
      ) : (
        <RankingTable
          items={reliable}
          kind={kind}
          view={view}
          rankOffset={0}
        />
      )}

      {unknown.length > 0 && (
        <div className="border-t border-line bg-bone px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-semibold text-ink">
              Not ranked — insufficient cost data
            </p>
            <UnknownCostBadge />
          </div>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-graphite">
            These products have sales but no comparable historical cost snapshot
            in this currency. Their profit is unknown, not zero, so they are not
            ordered as if profit were reliable.
          </p>
          <ul className="mt-3 divide-y divide-line-soft border border-line bg-paper">
            {unknown.map((item) => (
              <li
                key={
                  isProductProfitItem(item)
                    ? `${item.variantId}-${item.currency}`
                    : `${item.productId}-${item.currency}`
                }
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-ink">
                    {item.productName}
                  </p>
                  {isProductProfitItem(item) && (
                    <p className="mt-0.5 font-mono text-[10.5px] text-graphite">
                      {item.variantSku}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-right">
                  <span className="font-mono text-[11.5px] tabular-nums text-ink">
                    {formatCount(item.unitsSold)} units
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums text-ink">
                    {formatMoney(item.netRevenue, item.currency)}
                  </span>
                  <CoverageBadge coverage={item.costCoverage} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function UnitsRanking({
  items,
  kind,
}: {
  items: CurrencyItem[]
  kind: RankingsData['kind']
}) {
  return <RankingTable items={items} kind={kind} view="best-selling" rankOffset={0} />
}

function RankingTable({
  items,
  kind,
  view,
  rankOffset,
}: {
  items: CurrencyItem[]
  kind: RankingsData['kind']
  view: FinanceRankingView
  rankOffset: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <caption className="sr-only">
          {view === 'best-selling'
            ? 'Best-selling products'
            : view === 'most-profitable'
              ? 'Most profitable products'
              : 'Lowest-profit variants'}
        </caption>
        <thead>
          <tr className="border-b border-line bg-bone">
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              Rank
            </th>
            <th scope="col" className="px-4 py-3 text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              Product
            </th>
            <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              Units sold
            </th>
            <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              Net revenue
            </th>
            <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              COGS
            </th>
            <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              Gross profit
            </th>
            <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              Margin
            </th>
            <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase">
              Coverage
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const rank =
              kind === 'rankings'
                ? (item as ProductRankingItem).rank
                : index + 1 + rankOffset
            return (
              <tr
                key={
                  isProductProfitItem(item)
                    ? `${item.variantId}-${item.currency}`
                    : `${item.productId}-${item.currency}`
                }
                className="border-b border-line-soft last:border-b-0 transition-colors hover:bg-bone"
              >
                <td className="px-4 py-3 align-top font-mono text-[12px] font-semibold tabular-nums text-ink">
                  {rank}
                </td>
                <td className="max-w-[280px] px-4 py-3 align-top">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {item.productName}
                  </p>
                  {isProductProfitItem(item) && (
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-graphite">
                      {item.variantSku}
                    </p>
                  )}
                  {item.isProfitPartial && (
                    <span className="mt-1 inline-flex">
                      <PartialProfitBadge />
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                  {formatCount(item.unitsSold)}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                  {formatMoney(item.netRevenue, item.currency)}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                  {item.cogs === null ? (
                    <span className="text-graphite">Unknown</span>
                  ) : (
                    formatMoney(item.cogs, item.currency)
                  )}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                  {item.grossProfit === null ? (
                    <span className="text-graphite">Unknown</span>
                  ) : (
                    formatMoney(item.grossProfit, item.currency)
                  )}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                  {formatRatioPercent(item.grossMargin) ?? '—'}
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <CoverageBadge coverage={item.costCoverage} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function groupByCurrency<T extends { currency: string }>(
  items: readonly T[],
): Array<[string, T[]]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const existing = groups.get(item.currency)
    if (existing) existing.push(item)
    else groups.set(item.currency, [item])
  }
  return Array.from(groups.entries())
}

const RankingsSkeleton = () => (
  <div
    className="card-premium p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading product rankings"
  >
    <span className="sr-only">Loading product rankings</span>
    <Skeleton className="h-3 w-44" />
    <div className="mt-5 space-y-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  </div>
)
