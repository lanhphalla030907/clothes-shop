import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextField } from '@/components/account/Field'
import { Skeleton } from '@/components/account/Skeleton'
import { formatMoney } from '@/lib/money'
import { toUserMessage } from '@/lib/api/errors'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import type {
  FinanceProductSortBy,
  FinanceSortOrder,
  ProductProfitItem,
} from '@/types/api'
import { fetchFinanceProducts } from '../api'
import type { AppliedFinanceFilters } from '../hooks/useFinanceFilters'
import {
  FINANCE_PRODUCT_PAGE_SIZES,
  formatCount,
  formatRatioPercent,
  isFinanceProductSortBy,
  isFinanceSortOrder,
  pageBounds,
  parseFinancePageSize,
  parsePositiveInteger,
} from '../utils'
import {
  CoverageBadge,
  PartialProfitBadge,
  UnknownCostBadge,
} from './FinanceBadges'
import { FinanceSectionHeading } from './FinanceSectionHeading'

type ProductProfitSectionProps = {
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

const tableColumns: ReadonlyArray<{
  key: string
  label: string
  sortKey?: FinanceProductSortBy
  align?: 'left' | 'right'
}> = [
  { key: 'product', label: 'Product' },
  { key: 'variant', label: 'Variant' },
  { key: 'units', label: 'Units sold', sortKey: 'units', align: 'right' },
  { key: 'gross', label: 'Gross sales', align: 'right' },
  { key: 'discounts', label: 'Discounts', align: 'right' },
  { key: 'revenue', label: 'Net revenue', sortKey: 'revenue', align: 'right' },
  { key: 'cogs', label: 'COGS', align: 'right' },
  { key: 'profit', label: 'Gross profit', sortKey: 'profit', align: 'right' },
  { key: 'margin', label: 'Margin', sortKey: 'margin', align: 'right' },
  { key: 'coverage', label: 'Coverage', align: 'right' },
]

/**
 * Server-paginated product and variant profitability.
 *
 * Every financial value is the API's string. The only browser-side filtering is
 * a text filter over the rows already on the current page, because the finance
 * products endpoint does not expose a search parameter.
 */
export function ProductProfitSection({
  filters,
  params,
  setParams,
  onCurrencies,
}: ProductProfitSectionProps) {
  const page = parsePositiveInteger(params.get('page'))
  const limit = parseFinancePageSize(params.get('limit'))
  const sortByParam = params.get('sortBy')
  const sortOrderParam = params.get('sortOrder')
  const sortBy: FinanceProductSortBy = isFinanceProductSortBy(sortByParam)
    ? sortByParam
    : 'revenue'
  const sortOrder: FinanceSortOrder = isFinanceSortOrder(sortOrderParam)
    ? sortOrderParam
    : 'desc'
  const appliedSearch = params.get('q')?.trim() ?? ''

  const [searchDraft, setSearchDraft] = useState(appliedSearch)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync search draft with URL; functional update prevents cascading renders
    setSearchDraft((current) => (current === appliedSearch ? current : appliedSearch))
  }, [appliedSearch])

  const query = useMemo(
    () => ({
      ...filters,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [filters, page, limit, sortBy, sortOrder],
  )

  const products = useAsyncResource(
    (signal) => fetchFinanceProducts(query, signal),
    [query],
  )

  useEffect(() => {
    if (!products.data) return
    onCurrencies(products.data.items.map((item) => item.currency))
  }, [products.data, onCurrencies])

  const updateParams = (
    updates: Record<string, string | undefined>,
    resetPage = true,
  ) => {
    const updated = new URLSearchParams(params)
    for (const [key, value] of Object.entries(updates)) {
      setOrDelete(updated, key, value)
    }
    if (resetPage) updated.delete('page')
    setParams(updated, { replace: true })
  }

  const changeSort = (nextSortBy: FinanceProductSortBy) => {
    const nextOrder: FinanceSortOrder =
      sortBy === nextSortBy && sortOrder === 'desc' ? 'asc' : 'desc'
    updateParams({ sortBy: nextSortBy, sortOrder: nextOrder })
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParams({ q: searchDraft.trim() === '' ? undefined : searchDraft.trim() })
  }

  const items = useMemo(
    () => products.data?.items ?? [],
    [products.data],
  )
  const visibleItems = useMemo(() => {
    const needle = appliedSearch.toLowerCase()
    if (needle === '') return items
    return items.filter(
      (item) =>
        item.productName.toLowerCase().includes(needle) ||
        item.variantSku.toLowerCase().includes(needle),
    )
  }, [items, appliedSearch])

  const pagination = products.data?.pagination
  const bounds = pageBounds(page, limit, pagination?.total ?? 0)

  return (
    <section className="space-y-5" aria-label="Product profitability">
      <FinanceSectionHeading
        eyebrow="Products"
        title="Product and variant profitability"
        description="Server-side pagination, date, currency and sorting. Unknown cost is shown as Unknown, never zero, and profit is known-cost only."
        action={
          <Action
            variant="outline"
            size="sm"
            onClick={products.refetch}
            disabled={products.isRefreshing}
          >
            <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
            Refresh
          </Action>
        }
      />

      <div className="border border-line bg-paper p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
          <form onSubmit={submitSearch} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                name="finance-product-search"
                label="Search this page"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Product or variant SKU"
                hint="The finance API has no search parameter; this filters the current page only."
              />
            </div>
            <Action type="submit" variant="outline" size="sm">
              <Search size={14} strokeWidth={1.8} aria-hidden />
              Filter
            </Action>
            {appliedSearch !== '' && (
              <Action
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateParams({ q: undefined })}
              >
                Clear
              </Action>
            )}
          </form>

          <SelectField
            name="finance-product-limit"
            label="Rows per page"
            value={String(limit)}
            onChange={(event) =>
              updateParams({ limit: event.target.value })
            }
          >
            {FINANCE_PRODUCT_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </SelectField>

          <p className="text-[12px] leading-relaxed text-graphite lg:pb-3 lg:text-right">
            {pagination ? (
              <>
                Showing {formatCount(bounds.first)}–{formatCount(bounds.last)} of{' '}
                {formatCount(pagination.total)} rows
                {appliedSearch !== '' && (
                  <span className="block">
                    {formatCount(visibleItems.length)} match this page filter
                  </span>
                )}
              </>
            ) : (
              'Loading rows…'
            )}
          </p>
        </div>
      </div>

      {products.error !== undefined && products.data === undefined && (
        <ErrorState
          message={toUserMessage(products.error)}
          onRetry={products.refetch}
        />
      )}

      {products.error !== undefined && products.data !== undefined && (
        <InlineNotice message={toUserMessage(products.error)} />
      )}

      {products.isRefreshing && (
        <p className="text-[12px] text-graphite" role="status">
          Refreshing product rows…
        </p>
      )}

      {products.isLoading && products.data === undefined && <ProductsSkeleton />}

      {!products.isLoading &&
        products.data !== undefined &&
        items.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No product rows"
            title="No products match this reporting window"
            description="Change the filters, or wait until an eligible order contains a product line."
            action={
              <Action variant="outline" size="sm" onClick={products.refetch}>
                Refresh
              </Action>
            }
          />
        )}

      {!products.isLoading &&
        products.data !== undefined &&
        items.length > 0 &&
        visibleItems.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No matches on this page"
            title="No row on this page matches the search"
            description="Clear the page filter or move to another page. Server-side product search is not available from the finance API."
            action={
              <Action
                variant="outline"
                size="sm"
                onClick={() => updateParams({ q: undefined })}
              >
                Clear page filter
              </Action>
            }
          />
        )}

      {visibleItems.length > 0 && (
        <>
          <div className="hidden overflow-x-auto border border-line bg-paper md:block">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <caption className="sr-only">
                Product and variant profitability for the selected reporting window
              </caption>
              <thead>
                <tr className="border-b border-line bg-bone">
                  {tableColumns.map((column) =>
                    column.sortKey ? (
                      <SortHeader
                        key={column.key}
                        label={column.label}
                        sortKey={column.sortKey}
                        currentSortBy={sortBy}
                        currentSortOrder={sortOrder}
                        align={column.align}
                        onSort={changeSort}
                      />
                    ) : (
                      <th
                        key={column.key}
                        scope="col"
                        className={`px-4 py-3 text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase ${
                          column.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {column.label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr
                    key={`${item.variantId}-${item.currency}`}
                    className="border-b border-line-soft last:border-b-0 transition-colors hover:bg-bone"
                  >
                    <td className="max-w-[220px] px-4 py-3 align-top">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-graphite">
                        {item.currency}
                      </p>
                    </td>
                    <td className="max-w-[170px] px-4 py-3 align-top">
                      <p className="truncate font-mono text-[11.5px] text-ink">
                        {item.variantSku}
                      </p>
                      <p className="mt-0.5 text-[11px] text-graphite">
                        {formatCount(item.orderCount)} orders
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                      {formatCount(item.unitsSold)}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                      {formatMoney(item.grossRevenue, item.currency)}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                      {formatMoney(item.productDiscounts, item.currency)}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                      {formatMoney(item.netRevenue, item.currency)}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      {item.cogs === null ? (
                        <span className="inline-flex flex-col items-end gap-1">
                          <span className="font-mono text-[12px] text-graphite">
                            Unknown
                          </span>
                          <UnknownCostBadge />
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] tabular-nums text-ink">
                          {formatMoney(item.cogs, item.currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      {item.grossProfit === null ? (
                        <span className="font-mono text-[12px] text-graphite">
                          Unknown
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] tabular-nums text-ink">
                          {formatMoney(item.grossProfit, item.currency)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-top font-mono text-[12px] tabular-nums text-ink">
                      {formatRatioPercent(item.grossMargin) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <span className="inline-flex flex-col items-end gap-1">
                        <CoverageBadge coverage={item.costCoverage} />
                        {item.isProfitPartial && <PartialProfitBadge />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {visibleItems.map((item) => (
              <ProductCard
                key={`${item.variantId}-${item.currency}`}
                item={item}
              />
            ))}
          </div>
        </>
      )}

      {pagination && pagination.total > 0 && (
        <div className="flex flex-col gap-3 border border-line bg-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-graphite">
            Page {formatCount(pagination.page)} of{' '}
            {formatCount(Math.max(1, pagination.totalPages))}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) }, false)}
              className="inline-flex min-h-9 items-center gap-1 border border-line px-3 text-[12px] font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= Math.max(1, pagination.totalPages)}
              onClick={() => updateParams({ page: String(page + 1) }, false)}
              className="inline-flex min-h-9 items-center gap-1 border border-line px-3 text-[12px] font-medium text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next
              <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function SortHeader({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  align = 'left',
  onSort,
}: {
  label: string
  sortKey: FinanceProductSortBy
  currentSortBy: FinanceProductSortBy
  currentSortOrder: FinanceSortOrder
  align?: 'left' | 'right'
  onSort: (sortKey: FinanceProductSortBy) => void
}) {
  const active = currentSortBy === sortKey
  const ariaSort = active
    ? currentSortOrder === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-4 py-3 text-[11px] font-semibold tracking-[0.06em] text-graphite uppercase ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex min-h-8 items-center gap-1 transition-colors hover:text-ink ${
          align === 'right' ? 'justify-end' : 'justify-start'
        }`}
      >
        {label}
        <span aria-hidden className="text-[10px]">
          {active ? (currentSortOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  )
}

function ProductCard({ item }: { item: ProductProfitItem }) {
  return (
    <article className="border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-ink">{item.productName}</h3>
          <p className="mt-1 font-mono text-[11px] text-graphite">
            {item.variantSku} · {item.currency}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {item.isProfitPartial && <PartialProfitBadge />}
          {item.cogs === null && <UnknownCostBadge />}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Units sold" value={formatCount(item.unitsSold)} />
        <Stat label="Orders" value={formatCount(item.orderCount)} />
        <Stat
          label="Gross sales"
          value={formatMoney(item.grossRevenue, item.currency)}
        />
        <Stat
          label="Discounts"
          value={formatMoney(item.productDiscounts, item.currency)}
        />
        <Stat
          label="Net revenue"
          value={formatMoney(item.netRevenue, item.currency)}
        />
        <Stat
          label="COGS"
          value={
            item.cogs === null
              ? 'Unknown'
              : formatMoney(item.cogs, item.currency)
          }
        />
        <Stat
          label="Gross profit"
          value={
            item.grossProfit === null
              ? 'Unknown'
              : formatMoney(item.grossProfit, item.currency)
          }
        />
        <Stat
          label="Profit margin"
          value={formatRatioPercent(item.grossMargin) ?? '—'}
        />
        <Stat
          label="Cost coverage"
          value={<CoverageBadge coverage={item.costCoverage} />}
        />
      </dl>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium tracking-[0.04em] text-graphite uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-[12px] tabular-nums text-ink">
        {value}
      </dd>
    </div>
  )
}

const ProductsSkeleton = () => (
  <div
    className="border border-line bg-paper p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading product profitability"
  >
    <span className="sr-only">Loading product profitability</span>
    <Skeleton className="h-3 w-48" />
    <div className="mt-5 space-y-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  </div>
)
