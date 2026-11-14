import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Package, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminCard, AdminCardHeader } from '@/components/admin/AdminCard'
import {
  AdminTable,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminTable'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { SelectField, TextField } from '@/components/account/Field'
import { fetchStockAlerts } from '@/features/adminDashboard/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type {
  StockAlertFilter,
  StockAlertItem,
  StockAlertsQuery,
  StockAlertsResponse,
} from '@/types/api'

const STOCK_ALERT_PAGE_SIZES = [10, 25, 50] as const
const DEFAULT_STOCK_ALERT_PAGE = 1
const DEFAULT_STOCK_ALERT_LIMIT = 10

const FILTERS: Array<{ value: Exclude<StockAlertFilter, 'alerts'>; label: string }> = [  { value: 'all', label: 'All' },
  { value: 'in', label: 'In stock' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
]

type StockStatusBadgeProps = { status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' }

const StockStatusBadge = ({ status }: StockStatusBadgeProps) => {
  const meta: Record<
    'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
    { variant: 'success' | 'warning' | 'danger'; label: string }
  > = {
    IN_STOCK: { variant: 'success', label: 'In stock' },
    LOW_STOCK: { variant: 'warning', label: 'Low stock' },
    OUT_OF_STOCK: { variant: 'danger', label: 'Out of stock' },
  }
  const m = meta[status]
  return <AdminBadge variant={m.variant}>{m.label}</AdminBadge>
}

const parsePositivePage = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_STOCK_ALERT_PAGE
}

const parsePageSize = (value: string | null): number => {
  const parsed = Number(value)
  return (STOCK_ALERT_PAGE_SIZES as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_STOCK_ALERT_LIMIT
}

const isStockStatus = (
  value: string | null | undefined,
): value is Exclude<StockAlertFilter, 'alerts'> =>
  (FILTERS.map((filter) => filter.value) as readonly string[]).includes(
    value ?? '',
  )

export default function InventoryStockTable() {
  const [params, setParams] = useSearchParams()
  const [searchDraft, setSearchDraft] = useState(params.get('search') ?? '')

  const page = parsePositivePage(params.get('page'))
  const limit = parsePageSize(params.get('limit'))
  const statusParam = params.get('status')
  const appliedStatus = isStockStatus(statusParam) ? statusParam : 'all'
  // The search term is committed to the URL only when the operator applies it;
  // the local draft is kept in the input until then so typing does not refetch.
  const appliedSearch = (params.get('search') ?? '').trim()

  const query = useMemo<StockAlertsQuery>(
    () => ({
      page,
      limit,
      status: appliedStatus,
      search: appliedSearch === '' ? undefined : appliedSearch,
    }),
    [page, limit, appliedStatus, appliedSearch],
  )

  const stock = useAsyncResource<StockAlertsResponse>(
    (signal) => fetchStockAlerts(query, signal),
    [query],
  )

  const { data, error, isLoading, refetch } = stock
  const items: StockAlertItem[] = data?.items ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 0

  const updateParam = (key: string, value: string, resetPage = false) => {
    const next = new URLSearchParams(params)
    if (value === '') next.delete(key)
    else next.set(key, value)
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParam('search', searchDraft.trim(), true)
  }

  const goToPage = (nextPage: number) => {
    updateParam('page', String(nextPage))
  }

  const bounds =
    pagination && pagination.total > 0
      ? {
          first: (pagination.page - 1) * pagination.limit + 1,
          last: Math.min(pagination.page * pagination.limit, pagination.total),
        }
      : { first: 0, last: 0 }

  if (isLoading) {
    return (
      <div className="p-5 sm:p-6" role="status" aria-busy="true">
        <span className="sr-only">Loading inventory stock</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="rounded-xl border border-line bg-paper p-4">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-3 h-6 w-12" />
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error !== undefined) {
    return (
      <div className="p-5 sm:p-6">
        <ErrorState
          message={toUserMessage(error)}
          onRetry={refetch}
          className="border-line bg-paper"
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AdminCard>
        <AdminCardHeader
          title="Inventory stock"
          description="Every variant with an inventory row. Use the filters or search to narrow the list."
        />
        <div className="p-5 sm:p-6">
          <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap gap-1 md:gap-2">
              {FILTERS.map((option) => {
                const active = option.value === appliedStatus
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateParam('status', option.value, true)}
                    className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors ${
                      active
                        ? 'bg-ink text-paper'
                        : 'text-graphite hover:text-ink border border-line bg-bone'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="w-full sm:min-w-[220px] sm:flex-1">
              <TextField
                name="inventory-search"
                label="Search by product name or SKU"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={searchDraft.trim() === ''}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-bone disabled:opacity-50 disabled:pointer-events-none"
              >
                <Search size={14} strokeWidth={1.8} aria-hidden />
                Apply
              </button>
              {appliedSearch !== '' && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft('')
                    updateParam('search', '', true)
                  }}
                  className="min-h-10 inline-flex items-center gap-2 rounded-md border border-line bg-paper px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-bone"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-end gap-2">
              <SelectField
                name="inventory-page-size"
                label="Per page"
                value={String(limit)}
                onChange={(event) =>
                  updateParam('limit', String(Number(event.target.value)), true)
                }
              >
                {STOCK_ALERT_PAGE_SIZES.map((size) => (
                  <option key={size} value={String(size)}>
                    {size}
                  </option>
                ))}
              </SelectField>
            </div>
          </form>

          {items.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title={
                  data?.summary.total === 0
                    ? 'No stock records yet'
                    : 'Nothing in this view'
                }
                description={
                  data?.summary.total === 0
                    ? 'Variants appear here once they have an inventory row.'
                    : 'No variants match the selected filters and search.'
                }
                align="left"
              />
            </div>
          ) : (
            <>
              <AdminTable className="mt-4">
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>Product</AdminTableHeaderCell>
                    <AdminTableHeaderCell>SKU</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="hidden sm:table-cell">
                      Color
                    </AdminTableHeaderCell>
                    <AdminTableHeaderCell className="hidden sm:table-cell">
                      Size
                    </AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">Available</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">On hand</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">Reserved</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <tbody>
                  {items.map((item) => (
                    <AdminTableRow key={item.variantId}>
                      <AdminTableCell className="min-w-0">
                        <Link to={`/admin/products/${item.productId}`} className="block">
                          <div className="flex items-center gap-3">
                            {item.productImage === null ? (
                              <span
                                className="size-10 shrink-0 place-items-center rounded-md border border-line bg-bone text-graphite flex"
                              >
                                <Package size={16} strokeWidth={1.7} />
                              </span>
                            ) : (
                              <img
                                src={item.productImage}
                                alt=""
                                loading="lazy"
                                className="size-10 shrink-0 rounded-md border border-line object-cover"
                              />
                            )}
                            <span className="truncate text-[13px] font-medium text-ink">
                              {item.productName}
                            </span>
                          </div>
                        </Link>
                      </AdminTableCell>
                      <AdminTableCell className="font-mono text-[12px] text-graphite">
                        {item.sku}
                      </AdminTableCell>
                      <AdminTableCell className="hidden sm:table-cell text-[12px] text-graphite">
                        {item.color ?? '—'}
                      </AdminTableCell>
                      <AdminTableCell className="hidden sm:table-cell text-[12px] text-graphite">
                        {item.size ?? '—'}
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <p className="font-mono text-[13px] font-semibold tabular-nums text-ink">
                          {item.available}
                        </p>
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <p className="font-mono text-[12px] text-graphite tabular-nums">
                          {item.quantity}
                        </p>
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <p className="font-mono text-[12px] text-graphite tabular-nums">
                          {item.reservedQuantity}
                        </p>
                      </AdminTableCell>
                      <AdminTableCell>
                        <StockStatusBadge status={item.status} />
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>

              <nav
                aria-label="Inventory pagination"
                className="flex flex-col gap-4 rounded-xl border border-line bg-paper-pure px-5 py-4 shadow-xs sm:flex-row sm:items-end sm:justify-between"
              >
                <div className="w-full sm:w-48">
                  <SelectField
                    name="inventory-page-size-nav"
                    label="Per page"
                    value={String(limit)}
                    onChange={(event) =>
                      updateParam('limit', String(Number(event.target.value)), true)
                    }
                  >
                    {STOCK_ALERT_PAGE_SIZES.map((size) => (
                      <option key={size} value={String(size)}>
                        {size}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="flex items-center gap-2 sm:pb-0.5">
                  <p className="min-w-28 text-center text-[12.5px] text-graphite" aria-live="polite">
                    {pagination && pagination.total > 0
                      ? `${bounds.first}–${bounds.last} of ${pagination.total}`
                      : '0 of 0'}
                  </p>
                  <p className="min-w-28 text-center text-[12.5px] text-graphite" aria-live="polite">
                    Page {page} of {Math.max(totalPages, 1)}
                  </p>
                  <Action
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
                    Previous
                  </Action>
                  <Action
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || totalPages === 0}
                    onClick={() => goToPage(page + 1)}
                  >
                    Next
                    <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
                  </Action>
                </div>
              </nav>
            </>
          )}
        </div>
      </AdminCard>
    </div>
  )
}
