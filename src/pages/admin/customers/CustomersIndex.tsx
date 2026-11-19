import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, ShoppingBag, UserCheck, UserPlus, UserX, Users } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextField } from '@/components/account/Field'
import { Skeleton } from '@/components/account/Skeleton'
import { fetchAdminCustomers, fetchAdminCustomerStats } from '@/features/adminCustomers/api'
import {
  ADMIN_CUSTOMER_PAGE_SIZES,
  customersWithoutOrders,
  formatCustomerDate,
  formatCustomerSpend,
  pageBounds,
  parsePageSize,
  parsePositivePage,
  safeDateParameter,
  toRegisteredFromTimestamp,
  toRegisteredToTimestamp,
} from '@/features/adminCustomers/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type { AdminCustomerListQuery, AdminCustomerStats, AdminCustomerSummary } from '@/types/api'

/**
 * The administrative customer management dashboard.
 *
 * Replaces the single-customer lookup with a full listing: statistics, search,
 * filters, sorting and server-side pagination. Every filter reaches one
 * `GET /admin/customers` call, and every count comes from
 * `GET /admin/customers/stats`.
 */
export default function CustomersIndex() {
  const [params, setParams] = useSearchParams()

  const page = parsePositivePage(params.get('page'))
  const limit = parsePageSize(params.get('limit'))
  const searchParam = params.get('search') ?? ''
  const appliedSearch = searchParam.trim()
  const statusParam = params.get('status') ?? ''
  const appliedStatus = statusParam.trim()
  const registeredFrom = safeDateParameter(params.get('registeredFrom'))
  const registeredTo = safeDateParameter(params.get('registeredTo'))
  const orderActivityParam = params.get('orderActivity')
  const appliedOrderActivity =
    orderActivityParam === 'WITH_ORDERS' || orderActivityParam === 'WITHOUT_ORDERS'
      ? orderActivityParam
      : undefined
  const sortByParam = params.get('sortBy')
  const appliedSortBy =
    sortByParam === 'createdAt' ||
    sortByParam === 'name' ||
    sortByParam === 'totalOrders' ||
    sortByParam === 'totalSpent'
      ? sortByParam
      : undefined
  const sortOrderParam = params.get('sortOrder')
  const appliedSortOrder = sortOrderParam === 'asc' || sortOrderParam === 'desc' ? sortOrderParam : undefined

  const [searchDraft, setSearchDraft] = useState(appliedSearch)
  const [statusDraft, setStatusDraft] = useState(appliedStatus)
  const [fromDraft, setFromDraft] = useState(registeredFrom)
  const [toDraft, setToDraft] = useState(registeredTo)

  const query = useMemo<AdminCustomerListQuery>(
    () => ({
      page,
      limit,
      search: appliedSearch === '' ? undefined : appliedSearch,
      status: appliedStatus === '' ? undefined : appliedStatus,
      registeredFrom: toRegisteredFromTimestamp(registeredFrom),
      registeredTo: toRegisteredToTimestamp(registeredTo),
      orderActivity: appliedOrderActivity,
      sortBy: appliedSortBy,
      sortOrder: appliedSortOrder,
    }),
    [
      page,
      limit,
      appliedSearch,
      appliedStatus,
      registeredFrom,
      registeredTo,
      appliedOrderActivity,
      appliedSortBy,
      appliedSortOrder,
    ],
  )

  const customers = useAsyncResource<Awaited<ReturnType<typeof fetchAdminCustomers>>>(
    (signal) => fetchAdminCustomers(query, signal),
    [query],
  )

  const stats = useAsyncResource<AdminCustomerStats>((signal) => fetchAdminCustomerStats(signal), [])

  const rows = customers.data?.items ?? []
  const pagination = customers.data?.pagination
  const bounds = pagination ? pageBounds(pagination) : { first: 0, last: 0 }
  const totalPages = pagination?.totalPages ?? 0
  const hasFilters =
    appliedSearch !== '' ||
    appliedStatus !== '' ||
    registeredFrom !== '' ||
    registeredTo !== '' ||
    appliedOrderActivity !== undefined ||
    appliedSortBy !== undefined ||
    appliedSortOrder !== undefined

  const customerStats = stats.data
  const customersWithoutOrdersCount = customerStats !== undefined ? customersWithoutOrders(customerStats) : undefined

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
    updateParam('status', statusDraft.trim(), true)
    updateParam('registeredFrom', fromDraft, true)
    updateParam('registeredTo', toDraft, true)
  }

  const goToPage = (nextPage: number) => {
    updateParam('page', String(nextPage))
  }

  const clearFilters = () => {
    setSearchDraft('')
    setStatusDraft('')
    setFromDraft('')
    setToDraft('')
    setParams({}, { replace: true })
  }

  const searchFailedWithData = customers.error !== undefined && customers.data !== undefined

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customers"
        description="Every customer account, with order counts, per-currency spend and registration date. Open a customer to inspect their order history and address book."
      />

      <section aria-label="Customer statistics">
        {stats.isLoading ? (
          <StatsSkeleton />
        ) : stats.error !== undefined ? (
          <div className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs">
            <ErrorState message={toUserMessage(stats.error)} onRetry={stats.refetch} />
          </div>
        ) : customerStats === undefined ? (
          <EmptyState
            align="left"
            eyebrow="Statistics"
            title="No statistics available"
            description="Customer statistics could not be loaded."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <AdminStatCard
              label="Total customers"
              value={customerStats.totalCustomers}
              hint="Every customer account"
              icon={Users}
              emphasis
            />
            <AdminStatCard
              label="Active customers"
              value={customerStats.activeCustomers}
              hint="Accounts whose status is active"
              icon={UserCheck}
            />
            <AdminStatCard
              label="New customers"
              value={customerStats.newCustomers}
              hint={`Registered in the last ${customerStats.newCustomerWindowDays} days`}
              icon={UserPlus}
            />
            <AdminStatCard
              label="With orders"
              value={customerStats.customersWithOrders}
              hint="At least one order, any status"
              icon={ShoppingBag}
            />
            <AdminStatCard
              label="Without orders"
              value={customersWithoutOrdersCount ?? 0}
              hint="No order recorded"
              icon={UserX}
            />
          </div>
        )}
      </section>

      <div className="space-y-4">
        <form
          onSubmit={submitSearch}
          className="flex flex-wrap items-end gap-x-4 gap-y-4 rounded-xl border border-line bg-paper-pure p-5 shadow-xs"
        >
          <div className="w-full sm:min-w-64 sm:flex-1">
            <TextField
              name="customer-search"
              label="Search customers"
              placeholder="Name, email, or phone"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="w-full sm:w-44">
            <TextField
              name="customer-status"
              label="Account status"
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value)}
              hint="Exact match, e.g. ACTIVE"
              autoComplete="off"
            />
          </div>
          <div className="w-full sm:w-40">
            <TextField
              type="date"
              name="registered-from"
              label="Registered from"
              value={fromDraft}
              onChange={(event) => setFromDraft(event.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <TextField
              type="date"
              name="registered-to"
              label="Registered to"
              value={toDraft}
              onChange={(event) => setToDraft(event.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <SelectField
              name="customer-order-activity"
              label="Order activity"
              value={appliedOrderActivity ?? ''}
              onChange={(event) => updateParam('orderActivity', event.target.value, true)}
            >
              <option value="">All activity</option>
              <option value="WITH_ORDERS">Has placed orders</option>
              <option value="WITHOUT_ORDERS">No orders yet</option>
            </SelectField>
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

        {searchFailedWithData && <InlineNotice message={toUserMessage(customers.error)} onDismiss={() => undefined} />}

        {customers.isLoading && <CustomersSkeleton />}

        {!customers.isLoading && customers.error !== undefined && customers.data === undefined && (
          <ErrorState message={toUserMessage(customers.error)} onRetry={customers.refetch} />
        )}

        {!customers.isLoading && customers.data !== undefined && rows.length === 0 && (
          <EmptyState
            align="left"
            eyebrow={hasFilters ? 'No matches' : 'No customers yet'}
            title={hasFilters ? 'No customers match these filters' : 'No customers have registered'}
            description={
              hasFilters
                ? 'Try a broader search, another status, or a wider date range.'
                : 'Customers appear here as soon as they register.'
            }
            action={
              hasFilters ? (
                <Action variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Action>
              ) : (
                <Action variant="ghost" size="sm" onClick={customers.refetch}>
                  Refresh
                </Action>
              )
            }
          />
        )}

        {!customers.isLoading && rows.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] text-graphite" aria-live="polite">
                Showing {bounds.first}–{bounds.last} of {pagination?.total ?? rows.length}{' '}
                {(pagination?.total ?? rows.length) === 1 ? 'customer' : 'customers'}
              </p>
              {customers.isRefreshing && (
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
                      <Column>Customer</Column>
                      <Column>Email</Column>
                      <Column>Phone</Column>
                      <Column>Orders</Column>
                      <Column>Total spent</Column>
                      <Column>Registered</Column>
                      <Column>Status</Column>
                      <Column className="text-right">Actions</Column>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {rows.map((customer) => (
                      <tr key={customer.id} className="transition-colors hover:bg-bone/40">
                        <td className="px-5 py-3.5">
                          <CustomerLink customer={customer} />
                          <span className="mt-0.5 block text-[11.5px] text-graphite">{customer.email}</span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3.5 text-[13px] text-graphite">{customer.email}</td>
                        <td className="px-4 py-3.5 text-[13px] text-graphite">{customer.phone ?? '—'}</td>
                        <td className="px-4 py-3.5 font-mono text-[13px] tabular-nums text-ink">
                          {customer.totalOrders}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[12.5px] tabular-nums text-ink">
                            {formatCustomerSpend(customer.totalSpentByCurrency)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-graphite">
                          {formatCustomerDate(customer.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <CustomerStatusBadge status={customer.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/admin/customers/${customer.id}`}
                            className="inline-flex h-8 items-center rounded-md px-2.5 font-mono text-[12px] font-medium text-graphite transition-colors hover:bg-bone hover:text-ink"
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
                {rows.map((customer) => (
                  <li key={customer.id} className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CustomerLink customer={customer} />
                        <p className="mt-0.5 truncate text-[12.5px] text-graphite">{customer.email}</p>
                      </div>
                      <span className="font-mono text-[12.5px] tabular-nums text-ink">
                        {formatCustomerSpend(customer.totalSpentByCurrency)}
                      </span>
                    </div>

                    <div className="grid gap-2 text-[12.5px] sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <span className="text-graphite">Orders</span>
                        <span className="font-mono text-ink">{customer.totalOrders}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-graphite">Registered</span>
                        <span className="font-mono text-ink">{formatCustomerDate(customer.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-graphite">Phone</span>
                        <span className="font-mono text-ink">{customer.phone ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-graphite">Status</span>
                        <CustomerStatusBadge status={customer.status} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                      <span className="text-[12px] text-graphite">
                        Last order: {customer.lastOrderAt === null ? '—' : formatCustomerDate(customer.lastOrderAt)}
                      </span>
                      <Link
                        to={`/admin/customers/${customer.id}`}
                        className="inline-flex h-8 items-center rounded-md px-2.5 font-mono text-[12px] font-medium text-graphite transition-colors hover:bg-bone hover:text-ink"
                      >
                        View customer
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
              isRefreshing={customers.isRefreshing}
              onPage={goToPage}
              onLimit={(next) => updateParam('limit', String(next), true)}
            />
          </>
        )}
      </div>
    </div>
  )
}

function Column({ children, className = '' }: { children: string; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite first:pl-5 last:pr-5 ${className}`}
    >
      {children}
    </th>
  )
}

function CustomerStatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return (
    <span
      className={`inline-flex h-6 items-center rounded-md border px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
        active ? 'border-line bg-bone text-ink' : 'border-signal/25 bg-signal-soft text-signal'
      }`}
    >
      {status}
    </span>
  )
}

function CustomerLink({ customer }: { customer: AdminCustomerSummary }) {
  return (
    <Link
      to={`/admin/customers/${customer.id}`}
      className="font-mono text-[12.5px] font-medium text-ink underline-offset-4 hover:underline"
    >
      {`${customer.firstName} ${customer.lastName}`.trim() || customer.email}
    </Link>
  )
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
      aria-label="Customer pagination"
      className="flex flex-col gap-4 rounded-xl border border-line bg-paper-pure px-5 py-4 shadow-xs sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="w-full sm:w-36">
        <SelectField
          name="customer-page-size"
          label="Per page"
          value={String(limit)}
          onChange={(event) => onLimit(Number(event.target.value))}
        >
          {ADMIN_CUSTOMER_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex items-center gap-2 sm:pb-0.5">
        <Action variant="outline" size="sm" disabled={page <= 1 || isRefreshing} onClick={() => onPage(page - 1)}>
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

const StatsSkeleton = () => (
  <div
    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    role="status"
    aria-busy="true"
    aria-label="Loading customer statistics"
  >
    <span className="sr-only">Loading customer statistics</span>
    {Array.from({ length: 5 }, (_, index) => (
      <Skeleton key={index} className="h-[108px] rounded-xl" />
    ))}
  </div>
)

const CustomersSkeleton = () => (
  <div
    className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs sm:p-6"
    role="status"
    aria-busy="true"
    aria-label="Loading customers"
  >
    <span className="sr-only">Loading customers</span>
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-3">
        <div className="h-3 w-1/5 animate-pulse rounded bg-line-soft" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-line-soft" />
        <div className="ml-auto h-3 w-1/6 animate-pulse rounded bg-line-soft" />
      </div>
    ))}
  </div>
)
