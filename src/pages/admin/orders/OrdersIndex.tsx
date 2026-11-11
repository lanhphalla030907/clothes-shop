import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextField } from '@/components/account/Field'
import { Money, StatusBadge } from '@/components/account/Bits'
import { PaymentStatusBadge } from '@/features/adminOrders/components/PaymentStatusBadge'
import { CodCollectionStatusBadge } from '@/features/adminOrders/components/CodCollectionStatusBadge'
import { fetchAdminOrders } from '@/features/adminOrders/api'
import {
  ADMIN_ORDER_PAGE_SIZES,
  ORDER_STATUS_OPTIONS,
  effectiveCodCollectionStatus,
  effectivePaymentStatus,
  formatAdminOrderDate,
  isOrderStatus,
  orderStatusLabel,
  pageBounds,
  parsePageSize,
  parsePositivePage,
  paymentCodeLabel,
  safeDateParameter,
  toCreatedFromTimestamp,
  toCreatedToTimestamp,
} from '@/features/adminOrders/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type { AdminOrderListQuery, AdminOrderSummary } from '@/types/api'

/**
 * The administrative order list.
 *
 * Filter state lives in the URL, matching the other admin indexes, and every
 * parameter here is one `GET /admin/orders` actually accepts. The endpoint has no
 * sort parameter and always returns newest first, so this page offers no sorting
 * control rather than pretending one exists.
 */
export default function OrdersIndex() {
  const [params, setParams] = useSearchParams()

  const page = parsePositivePage(params.get('page'))
  const limit = parsePageSize(params.get('limit'))
  const statusParam = params.get('status')
  const appliedStatus = isOrderStatus(statusParam) ? statusParam : undefined
  const searchParam = params.get('search') ?? ''
  const appliedSearch = searchParam.trim()
  const createdFrom = safeDateParameter(params.get('createdFrom'))
  const createdTo = safeDateParameter(params.get('createdTo'))

  const [searchDraft, setSearchDraft] = useState(searchParam)

  const query = useMemo<AdminOrderListQuery>(
    () => ({
      page,
      limit,
      status: appliedStatus,
      search: appliedSearch === '' ? undefined : appliedSearch,
      createdFrom: toCreatedFromTimestamp(createdFrom),
      createdTo: toCreatedToTimestamp(createdTo),
    }),
    [page, limit, appliedStatus, appliedSearch, createdFrom, createdTo],
  )

  const orders = useAsyncResource<Awaited<ReturnType<typeof fetchAdminOrders>>>(
    (signal) => fetchAdminOrders(query, signal),
    [query],
  )

  const rows = orders.data?.items ?? []
  const pagination = orders.data?.pagination
  const bounds = pagination ? pageBounds(pagination) : { first: 0, last: 0 }
  const totalPages = pagination?.totalPages ?? 0
  const hasFilters =
    appliedSearch !== '' ||
    appliedStatus !== undefined ||
    createdFrom !== '' ||
    createdTo !== ''

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

  const clearFilters = () => {
    setSearchDraft('')
    setParams({}, { replace: true })
  }

  const searchFailedWithData = orders.error !== undefined && orders.data !== undefined

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Orders"
        title="Orders"
        description="Every customer order, newest first. Open an order to inspect its receipt or use the restricted cancellation and shipment actions."
      />

      <div className="space-y-4">
        <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-x-4 gap-y-4 rounded-xl border border-line bg-paper-pure p-5 shadow-xs">
          <div className="w-full sm:min-w-64 sm:flex-1">
            <TextField
              name="order-search"
              label="Search orders"
              placeholder="Order number, customer name, or email…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="w-full sm:w-44">
            <SelectField
              name="order-status"
              label="Order status"
              value={appliedStatus ?? ''}
              onChange={(event) => updateParam('status', event.target.value, true)}
            >
              <option value="">All statuses</option>
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {orderStatusLabel(option)}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="w-full sm:w-40">
            <TextField
              type="date"
              name="created-from"
              label="Created from"
              value={createdFrom}
              onChange={(event) => updateParam('createdFrom', event.target.value, true)}
            />
          </div>
          <div className="w-full sm:w-40">
            <TextField
              type="date"
              name="created-to"
              label="Created to"
              value={createdTo}
              onChange={(event) => updateParam('createdTo', event.target.value, true)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Action type="submit" size="sm">
              <Search size={14} strokeWidth={1.8} aria-hidden />
              Search
            </Action>
            {hasFilters && (
              <Action type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Action>
            )}
          </div>
        </form>

        {searchFailedWithData && (
          <InlineNotice
            message={toUserMessage(orders.error)}
            onDismiss={() => undefined}
          />
        )}

        {orders.isLoading && <OrdersSkeleton />}

        {!orders.isLoading && orders.error !== undefined && orders.data === undefined && (
          <ErrorState message={toUserMessage(orders.error)} onRetry={orders.refetch} />
        )}

        {!orders.isLoading && orders.data !== undefined && rows.length === 0 && (
          <EmptyState
            align="left"
            eyebrow={hasFilters ? 'No matches' : 'No orders yet'}
            title={hasFilters ? 'No orders match these filters' : 'No orders have been placed'}
            description={
              hasFilters
                ? 'Try a broader search, another status, or a wider date range.'
                : 'Orders appear here as soon as checkout creates one.'
            }
            action={
              hasFilters ? (
                <Action variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Action>
              ) : (
                <Action variant="ghost" size="sm" onClick={orders.refetch}>
                  Refresh
                </Action>
              )
            }
          />
        )}

        {!orders.isLoading && rows.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] text-graphite" aria-live="polite">
                Showing {bounds.first}–{bounds.last} of {pagination?.total ?? rows.length}{' '}
                {(pagination?.total ?? rows.length) === 1 ? 'order' : 'orders'}
              </p>
              {orders.isRefreshing && (
                <span className="text-[12px] text-graphite" role="status">
                  Refreshing…
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-canvas/40">
                      <Column>Order</Column>
                      <Column>Customer</Column>
                      <Column>Placed</Column>
                      <Column>Total</Column>
                      <Column>Payment method</Column>
                      <Column>Payment status</Column>
                      <Column>COD collection</Column>
                      <Column>Order status</Column>
                      <Column className="text-right">Actions</Column>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {rows.map((order) => (
                      <tr key={order.id}>
                        <td className="px-5 py-4">
                          <OrderLink order={order} />
                          <span className="mt-1 block text-[11.5px] text-graphite">
                            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
                            {order.lineCount} {order.lineCount === 1 ? 'line' : 'lines'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <CustomerCell order={order} />
                        </td>
                        <td className="px-4 py-4 text-[13px] text-graphite">
                          {formatAdminOrderDate(order.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <Money
                            amount={order.totalAmount}
                            currency={order.currency}
                            className="font-mono font-medium"
                          />
                        </td>
                        <td className="px-4 py-4 text-[13px] text-graphite">
                          {paymentCodeLabel(order.paymentMethod)}
                        </td>
                        <td className="px-4 py-4">
                          <PaymentStatusBadge
                            status={effectivePaymentStatus(
                              order.hasPaidPayment,
                              order.payment?.status ?? null,
                              order.paymentMethod,
                            )}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <CodCollectionCell order={order} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="inline-flex min-h-9 items-center font-mono text-[12px] font-medium text-graphite underline-offset-4 transition-colors hover:text-ink hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-line-soft lg:hidden">
                {rows.map((order) => (
                  <li key={order.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <OrderLink order={order} />
                        <p className="mt-1 text-[12.5px] text-graphite">
                          {formatAdminOrderDate(order.createdAt)}
                        </p>
                      </div>
                      <Money
                        amount={order.totalAmount}
                        currency={order.currency}
                        className="font-mono font-medium"
                      />
                    </div>

                    <CustomerCell order={order} />

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={order.status} />
                      <PaymentStatusBadge
                        status={effectivePaymentStatus(
                          order.hasPaidPayment,
                          order.payment?.status ?? null,
                          order.paymentMethod,
                        )}
                      />
                      <CodCollectionStatusBadge
                        status={effectiveCodCollectionStatus(
                          order.paymentMethod,
                          order.codCollection,
                        )}
                      />
                      <span className="text-[12px] text-graphite">
                        {paymentCodeLabel(order.paymentMethod)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                      <span className="text-[12px] text-graphite">
                        {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
                        {order.lineCount} {order.lineCount === 1 ? 'line' : 'lines'}
                      </span>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex min-h-10 items-center font-mono text-[12px] font-medium text-graphite underline-offset-4 transition-colors hover:text-ink hover:underline"
                      >
                        View order
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Pagination
              page={pagination?.page ?? page}
              totalPages={totalPages}
              limit={limit}
              isRefreshing={orders.isRefreshing}
              onPage={goToPage}
              onLimit={(next) => updateParam('limit', String(next), true)}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Column({
  children,
  className = '',
}: {
  children: string
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[12px] font-medium text-graphite first:pl-5 last:pr-5 ${className}`}
    >
      {children}
    </th>
  )
}

function OrderLink({ order }: { order: AdminOrderSummary }) {
  return (
    <Link
      to={`/admin/orders/${order.id}`}
      className="font-mono text-[12.5px] font-medium text-ink underline-offset-4 hover:underline"
    >
      {order.orderNumber}
    </Link>
  )
}

function CustomerCell({ order }: { order: AdminOrderSummary }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[13.5px] font-medium text-ink">
        {`${order.customer.firstName} ${order.customer.lastName}`.trim() || order.customer.email}
      </p>
      <p className="mt-0.5 truncate text-[12px] text-graphite">{order.customer.email}</p>
    </div>
  )
}

function CodCollectionCell({ order }: { order: AdminOrderSummary }) {
  const status = effectiveCodCollectionStatus(
    order.paymentMethod,
    order.codCollection,
  )

  if (status === null) {
    return <span className="text-[13px] text-graphite">—</span>
  }

  return <CodCollectionStatusBadge status={status} />
}

function Pagination({
  page,
  totalPages,
  limit,
  isRefreshing,
  onPage,
  onLimit,
}: {
  page: number
  totalPages: number
  limit: number
  isRefreshing: boolean
  onPage: (page: number) => void
  onLimit: (limit: number) => void
}) {
  const lastPage = Math.max(totalPages, 1)

  return (
    <nav
      aria-label="Order pagination"
      className="flex flex-col gap-4 rounded-xl border border-line bg-paper-pure px-5 py-4 shadow-xs sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="w-full sm:w-36">
        <SelectField
          name="order-page-size"
          label="Per page"
          value={String(limit)}
          onChange={(event) => onLimit(Number(event.target.value))}
        >
          {ADMIN_ORDER_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex items-center gap-2 sm:pb-0.5">
        <Action
          variant="outline"
          size="sm"
          disabled={page <= 1 || isRefreshing}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
          Previous
        </Action>
        <p className="min-w-28 text-center text-[12.5px] text-graphite" aria-live="polite">
          Page {page} of {lastPage}
        </p>
        <Action
          variant="outline"
          size="sm"
          disabled={page >= lastPage || isRefreshing}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
        </Action>
      </div>
    </nav>
  )
}

const OrdersSkeleton = () => (
  <div
    className="border border-line bg-paper p-5 sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading orders"
  >
    <span className="sr-only">Loading orders</span>
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-3">
        <div className="h-3 w-1/5 animate-pulse bg-line-soft" />
        <div className="h-3 w-1/4 animate-pulse bg-line-soft" />
        <div className="ml-auto h-3 w-1/6 animate-pulse bg-line-soft" />
      </div>
    ))}
  </div>
)
