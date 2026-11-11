import { useMemo, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileClock, RefreshCw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SelectField, TextField } from '@/components/account/Field'
import { Skeleton } from '@/components/account/Skeleton'
import { Money } from '@/components/account/Bits'
import { CodCollectionStatusBadge } from '@/features/adminOrders/components/CodCollectionStatusBadge'
import { fetchActiveDeliveryStaff } from '@/features/delivery/api'
import {
  fetchAdminCodReconciliationRecords,
  fetchAdminCodReconciliationSummary,
} from '@/features/adminCodReconciliation/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type {
  AdminCodReconciliationCurrencyTotal,
  AdminCodReconciliationListDto,
  AdminCodReconciliationListRow,
  AdminCodReconciliationListQuery,
  AdminCodReconciliationSummary,
  DeliveryStaff,
} from '@/types/api'

const PAGE_SIZES = [10, 20, 50, 100] as const

const pageNumber = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

const pageSize = (value: string | null): number => {
  const parsed = Number(value)
  return PAGE_SIZES.includes(parsed as (typeof PAGE_SIZES)[number]) ? parsed : 20
}

const isDate = (value: string | null): value is string =>
  value !== null &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value

const formatDateTime = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const personName = (person: { firstName: string; lastName: string } | null): string =>
  person ? `${person.firstName} ${person.lastName}`.trim() || '—' : '—'

const collectionStatus = (collectedAmount: string | null): 'COLLECTED' | 'NOT_COLLECTED' =>
  collectedAmount !== null ? 'COLLECTED' : 'NOT_COLLECTED'

export default function CodDashboard() {
  const [params, setParams] = useSearchParams()
  const page = pageNumber(params.get('page'))
  const limit = pageSize(params.get('limit'))
  const statusValue = params.get('status')
  const orderNumberValue = params.get('orderNumber')
  const startValue = params.get('startDate')
  const endValue = params.get('endDate')
  const staffIdValue = params.get('staffId')
  const currencyValue = params.get('currency')

  const query = useMemo<AdminCodReconciliationListQuery>(
    () => ({
      page,
      limit,
      startDate: isDate(startValue) ? startValue : undefined,
      endDate: isDate(endValue) ? endValue : undefined,
      staffId: staffIdValue || undefined,
      orderNumber: orderNumberValue || undefined,
      status: statusValue || undefined,
      currency: currencyValue || undefined,
    }),
    [page, limit, startValue, endValue, staffIdValue, orderNumberValue, statusValue, currencyValue],
  )

  const records = useAsyncResource<AdminCodReconciliationListDto>(
    (signal) => fetchAdminCodReconciliationRecords(query, signal),
    [query],
  )
  const summary = useAsyncResource<AdminCodReconciliationSummary>(
    (signal) => fetchAdminCodReconciliationSummary(signal),
    [],
  )
  const staff = useAsyncResource<DeliveryStaff[]>(
    (signal) => fetchActiveDeliveryStaff(signal),
    [],
  )

  const items = records.data?.items ?? []
  const total = records.data?.pagination.total ?? 0
  const totalPages = records.data?.pagination.totalPages ?? 0
  const hasFilters =
    query.status !== undefined ||
    query.orderNumber !== undefined ||
    query.startDate !== undefined ||
    query.endDate !== undefined ||
    query.staffId !== undefined ||
    query.currency !== undefined

  const updateParam = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const clearFilters = () => setParams({}, { replace: true })

  const totalsByCurrency = summary.data?.totalsByCurrency ?? []
  const discrepancyCount = summary.data?.discrepancyCount ?? 0

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Cash on delivery"
        title="COD Dashboard"
        description="Monitor delivered COD orders and collection status by currency. Reconciliation runs remain the immutable audit trail — this view shows live operational data."
        action={
          <Action
            variant="outline"
            size="sm"
            onClick={records.refetch}
            disabled={records.isRefreshing}
          >
            <RefreshCw size={14} aria-hidden />
            Refresh
          </Action>
        }
      />

      <section aria-label="COD financial summary by currency">
        <h2 className="text-[15px] font-semibold text-ink">Financial summary</h2>
        <p className="mt-1 text-[13px] text-graphite">
          Amounts are grouped by currency and never combined. Figures come from the reconciliation summary.
        </p>
        {summary.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs sm:p-6">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-2 h-8 w-24" />
              </div>
            ))}
          </div>
        ) : summary.error !== undefined ? (
          <ErrorState message={toUserMessage(summary.error)} onRetry={summary.refetch} />
        ) : totalsByCurrency.length === 0 ? (
          <EmptyState
            align="left"
            eyebrow="No summary data"
            title="No COD orders to summarise"
            description="Delivered COD orders will appear here once collections exist."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {totalsByCurrency.map((total) => (
              <CurrencyCard key={total.currency} total={total} />
            ))}
            <div className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-all hover:border-graphite/30 sm:p-6">
              <dt className="text-[12px] font-medium text-graphite">Discrepancies (all currencies)</dt>
              <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums text-ink">
                {discrepancyCount}
              </dd>
              <p className="mt-1 text-[11px] text-ash">Orders where collected amount differs from expected</p>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
        <div className="border-b border-line bg-canvas/30 px-5 py-4 sm:px-6">
          <p className="eyebrow text-graphite">Filters</p>
          <h2 className="mt-1 text-[16px] font-semibold text-ink">COD orders</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-graphite">
            Delivered COD orders with expected vs collected amounts. Filters are reflected in the URL.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 p-5 sm:p-6">
          <SelectField
            name="order-status"
            label="Order status"
            value={query.status ?? ''}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SHIPPED">Shipped</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Preparing</option>
            <option value="PENDING">Awaiting payment</option>
            <option value="CANCELLED">Cancelled</option>
          </SelectField>
          <TextField
            name="order-number"
            label="Order number"
            value={query.orderNumber ?? ''}
            onChange={(event) => updateParam('orderNumber', event.target.value)}
            hint="Customer-facing order reference"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              type="date"
              name="start-date"
              label="Delivered from"
              value={query.startDate ?? ''}
              onChange={(event) => updateParam('startDate', event.target.value)}
            />
            <TextField
              type="date"
              name="end-date"
              label="Delivered to"
              value={query.endDate ?? ''}
              onChange={(event) => updateParam('endDate', event.target.value)}
            />
          </div>
          <SelectField
            name="delivery-staff"
            label="Delivery staff"
            value={query.staffId ?? ''}
            onChange={(event) => updateParam('staffId', event.target.value)}
          >
            <option value="">All staff</option>
            {staff.data?.map((member) => (
              <option key={member.id} value={member.id}>
                {personName(member)}
              </option>
            ))}
          </SelectField>
          <SelectField
            name="currency"
            label="Currency"
            value={query.currency ?? ''}
            onChange={(event) => updateParam('currency', event.target.value)}
          >
            <option value="">All currencies</option>
            {totalsByCurrency.map((total) => (
              <option key={total.currency} value={total.currency}>
                {total.currency}
              </option>
            ))}
          </SelectField>
          <div className="flex items-end gap-2">
            <SelectField
              name="page-size"
              label="Rows per page"
              value={String(limit)}
              onChange={(event) => updateParam('limit', event.target.value)}
              className="min-w-0"
            >
              {PAGE_SIZES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
            {hasFilters && (
              <Action variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                Clear
              </Action>
            )}
          </div>
        </div>
      </section>

      {records.error !== undefined && records.data === undefined && (
        <ErrorState message={toUserMessage(records.error)} onRetry={records.refetch} />
      )}

      {!records.isLoading && records.error === undefined && items.length === 0 && (
        <EmptyState
          align="left"
          eyebrow={hasFilters ? 'No matching orders' : 'No COD orders'}
          title={hasFilters ? 'No orders match these filters' : 'No delivered COD orders'}
          description={
            hasFilters
              ? 'Broaden the filters or clear them to see all delivered COD orders.'
              : 'Delivered COD orders appear here once a collection window has been processed.'
          }
          action=          {hasFilters ? (
            <Action variant="outline" size="sm" onClick={clearFilters}>Clear filters</Action>
          ) : undefined}
        />
      )}

      {!records.isLoading && records.error === undefined && items.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-4 text-[12px] text-graphite">
            <p aria-live="polite">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} orders
            </p>
            {records.isRefreshing && <span role="status">Refreshing…</span>}
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-canvas/40">
                    <Column>Order</Column>
                    <Column>Status</Column>
                    <Column>Collected at</Column>
                    <Column>Collector</Column>
                    <Column className="text-right">Expected</Column>
                    <Column className="text-right">Collected</Column>
                    <Column>Currency</Column>
                    <Column>Collection</Column>
                    <Column className="text-right">Discrepancy</Column>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {items.map((item) => (
                    <OrderRow key={item.orderId} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line-soft lg:hidden">
              {items.map((item) => (
                <li key={item.orderId} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      to={`/admin/orders/${item.orderId}`}
                      className="font-mono text-[11px] text-ink underline-offset-4 hover:underline"
                      title={item.orderNumber ?? item.orderId}
                    >
                      {item.orderNumber ?? item.orderId}
                    </Link>
                    <span className="text-[11px] text-graphite">{item.orderStatus ?? '—'}</span>
                  </div>
                  <DefinitionLine label="Expected" value={<Money amount={item.expectedAmount} currency={item.currency} />} />
                  <DefinitionLine label="Collected" value={item.collectedAmount ? <Money amount={item.collectedAmount} currency={item.currency} /> : '—'} />
                  <DefinitionLine label="Currency" value={item.currency} />
                  <DefinitionLine label="Collection" value={<CodCollectionStatusBadge status={collectionStatus(item.collectedAmount)} />} />
                  <DefinitionLine label="Discrepancy" value={item.discrepancy ? 'Discrepancy' : 'Matched'} />
                  <DefinitionLine label="Collected at" value={formatDateTime(item.collectedAt)} />
                  <DefinitionLine label="Collector" value={personName(item.collectedBy)} />
                  <div className="border-t border-line-soft pt-3">
                    <Link
                      to={`/admin/orders/${item.orderId}`}
                      className="inline-flex min-h-10 items-center gap-1 text-[12px] font-medium text-ink underline-offset-4 hover:underline"
                    >
                      Open order <span aria-hidden>→</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Pagination
            page={records.data?.pagination.page ?? page}
            totalPages={totalPages}
            limit={limit}
            onPage={(value) => updateParam('page', String(value), false)}
          />
        </>
      )}

      <section aria-label="Related COD tools">
        <Link
          to="/admin/cod-reconciliation"
          className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-ink transition-colors hover:text-graphite"
        >
          <FileClock size={16} strokeWidth={1.6} aria-hidden />
          <span>Open reconciliation history</span>
        </Link>
      </section>
    </div>
  )
}

function CurrencyCard({
  total,
}: {
  total: AdminCodReconciliationCurrencyTotal
}) {
  return (
    <div className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-all hover:border-graphite/30 sm:p-6">
      <dt className="text-[12px] font-medium text-graphite">{total.currency}</dt>
      <dl className="mt-2 space-y-1">
        <DefinitionRow label="Expected COD"><Money amount={total.expectedAmount} currency={total.currency} emphasis="total" /></DefinitionRow>
        <DefinitionRow label="Collected COD"><Money amount={total.collectedAmount} currency={total.currency} emphasis="total" /></DefinitionRow>
        <DefinitionRow label="Uncollected COD"><Money amount={total.outstandingAmount} currency={total.currency} emphasis="total" /></DefinitionRow>
        <DefinitionRow label="Orders">{String(total.count)}</DefinitionRow>
      </dl>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  limit,
  onPage,
}: {
  page: number
  totalPages: number
  limit: number
  onPage: (value: number) => void
}) {
  return (
    <nav aria-label="COD order pages" className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-[12px] text-graphite">
        Page {page} of {totalPages} · {limit} per page
      </span>
      <div className="flex gap-2">
        <Action
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} aria-hidden /> Previous
        </Action>
        <Action
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next <ChevronRight size={14} aria-hidden />
        </Action>
      </div>
    </nav>
  )
}

function Column({ children, className = '' }: { children: string; className?: string }) {
  return (
    <th scope="col" className={`px-4 py-3 text-[12px] font-medium text-graphite first:pl-5 last:pr-5 ${className}`}>
      {children}
    </th>
  )
}

function OrderRow({ item }: { item: AdminCodReconciliationListRow }) {
  return (
    <tr className="transition-colors hover:bg-canvas/30">
      <td className="px-5 py-4">
        <Link
          to={`/admin/orders/${item.orderId}`}
          className="block max-w-36 truncate font-mono text-[11px] text-graphite"
          title={item.orderNumber ?? item.orderId}
        >
          {item.orderNumber ?? item.orderId}
        </Link>
      </td>
      <td className="px-4 py-4 text-[12px] text-graphite">{item.orderStatus ?? '—'}</td>
      <td className="px-4 py-4 text-[12px] text-graphite">{formatDateTime(item.collectedAt)}</td>
      <td className="px-4 py-4 text-[12px] text-graphite">—</td>
      <td className="px-4 py-4 text-[12px] text-graphite">{personName(item.collectedBy)}</td>
      <td className="px-4 py-4 text-right text-[12px] tabular-nums text-ink">
        <Money amount={item.expectedAmount} currency={item.currency} />
      </td>
      <td className="px-4 py-4 text-right text-[12px] tabular-nums text-ink">
        {item.collectedAmount ? <Money amount={item.collectedAmount} currency={item.currency} /> : '—'}
      </td>
      <td className="px-4 py-4 text-[12px] font-mono text-graphite">{item.currency}</td>
      <td className="px-4 py-4">
        <CodCollectionStatusBadge status={collectionStatus(item.collectedAmount)} />
      </td>
      <td className="px-4 py-4 text-right text-[12px] font-medium">
        {item.discrepancy ? (
          <span className="text-signal">Discrepancy</span>
        ) : (
          <span className="text-success">Matched</span>
        )}
      </td>
    </tr>
  )
}

function DefinitionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line-soft py-3 last:border-b-0">
      <dt className="text-[12px] text-graphite">{label}</dt>
      <dd className="text-right text-[13px] text-ink">{children}</dd>
    </div>
  )
}

function DefinitionLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line-soft py-2.5 last:border-b-0">
      <dt className="text-[11px] text-ash">{label}</dt>
      <dd className="text-right text-[12px] text-ink">{value}</dd>
    </div>
  )
}
