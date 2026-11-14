import { useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import {
  BackLink,
  Panel,
  PanelHeader,
} from '@/components/account/PageHeader'
import { DefinitionRow, Money, StatusBadge } from '@/components/account/Bits'
import {
  EmptyState,
  ErrorState,
} from '@/components/account/States'
import { Skeleton, SkeletonCard } from '@/components/account/Skeleton'
import { SelectField } from '@/components/account/Field'
import { RunStatusBadge } from '@/features/adminCodReconciliation/components/RunStatusBadge'
import { fetchAdminCodReconciliationRun } from '@/features/adminCodReconciliation/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type {
  AdminCodReconciliationCurrencySummary,
  AdminCodReconciliationRunDetail,
  AdminCodReconciliationRunSnapshotItem,
  OrderStatus,
} from '@/types/api'

const HISTORY_PATH = '/admin/cod-reconciliation'
const PAGE_SIZES = [10, 20, 50, 100] as const

const formatUtcDateTime = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date) + ' UTC'
}

const formatUtcDate = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const pageNumber = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

const pageSize = (value: string | null): number => {
  const parsed = Number(value)
  return PAGE_SIZES.includes(parsed as (typeof PAGE_SIZES)[number])
    ? parsed
    : 20
}

const personName = (person: { firstName: string; lastName: string } | null): string =>
  person ? `${person.firstName} ${person.lastName}`.trim() : '—'

const discrepancyLabel = (item: AdminCodReconciliationRunSnapshotItem): string => {
  if (!item.discrepancy) return 'Matched'
  switch (item.discrepancyType) {
    case 'missing-collection':
      return 'Missing collection'
    case 'amount-mismatch':
      return 'Amount mismatch'
    case 'currency-mismatch':
      return 'Currency mismatch'
    default:
      return 'Discrepancy'
  }
}

export default function ReconciliationRunDetail() {
  const [params, setParams] = useSearchParams()
  const { id } = useParams<{ id: string }>()
  const page = pageNumber(params.get('page'))
  const limit = pageSize(params.get('limit'))

  const resource = useAsyncResource(
    (signal) =>
      id
        ? fetchAdminCodReconciliationRun(id, {
            signal,
            query: { page, limit },
          })
        : Promise.resolve(undefined),
    [id, page, limit],
  )

  const updateParam = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  if (!id) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <BackLink to={HISTORY_PATH}>Run history</BackLink>
        <EmptyState eyebrow="No run selected" title="Choose a reconciliation run from history" />
      </div>
    )
  }

  if (resource.isLoading) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8" aria-label="Loading reconciliation run details">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64" />
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (resource.error !== undefined && resource.data === undefined) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <BackLink to={HISTORY_PATH}>Run history</BackLink>
        <ErrorState
          message={toUserMessage(resource.error)}
          onRetry={resource.refetch}
        />
      </div>
    )
  }

  if (!resource.data) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <BackLink to={HISTORY_PATH}>Run history</BackLink>
        <EmptyState
          eyebrow="Run unavailable"
          title="This reconciliation run could not be found"
          description="It may have been removed, or the link may be incorrect."
          action={<Action to={HISTORY_PATH} size="sm">Back to run history</Action>}
        />
      </div>
    )
  }

  const run = resource.data

  if (!run.hasSnapshot) {
    return (
      <div className="space-y-8 px-4 sm:px-6 lg:px-8">
        <BackLink to={HISTORY_PATH}>Run history</BackLink>
        <RunOverview run={run} isRefreshing={resource.isRefreshing} error={resource.error} />
        <EmptyState
          eyebrow="Legacy run"
          title="Historical snapshot details are unavailable"
          description={
            'This run completed before order snapshots were persisted. ' +
            'Order records, currency summaries and the audit table cannot be shown ' +
            'for it, and this screen never reconstructs them from live data.'
          }
          action={<Action to={HISTORY_PATH} size="sm">Back to run history</Action>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <BackLink to={HISTORY_PATH}>Run history</BackLink>
      <RunOverview
        run={run}
        isRefreshing={resource.isRefreshing}
        error={resource.error}
      />
      <CurrencySummary summaryByCurrency={run.summaryByCurrency} />
      <RunAuditTable
        items={run.items}
        total={run.pagination.total}
        page={page}
        limit={limit}
        totalPages={run.pagination.totalPages}
        onPage={(value) => updateParam('page', String(value), false)}
        onLimitChange={(value) => {
          updateParam('limit', String(value), true)
          updateParam('page', '1', false)
        }}
      />
    </div>
  )
}

function RunOverview({
  run,
  isRefreshing,
  error,
}: {
  run: AdminCodReconciliationRunDetail
  isRefreshing: boolean
  error: unknown
}) {
  return (
    <>
      <AdminPageHeader
        eyebrow="COD reconciliation run"
        title="Run details"
        description={`Run ID ${run.id}`}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <RunStatusBadge status={run.status} />
            {run.hasSnapshot ? null : (
              <span className="text-[12px] font-medium text-graphite">
                Legacy run
              </span>
            )}
          </div>
        }
      />

      {error !== undefined && (
        <p role="status" className="text-[13px] text-graphite">
          Could not refresh this run: {toUserMessage(error)}
        </p>
      )}
      {isRefreshing && (
        <p role="status" className="text-[12px] text-graphite">Refreshing run…</p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Reconciliation window"
            hint="The reconciliation uses a half-open UTC window."
          />
          <div className="px-5 py-2 sm:px-6">
            <dl>
              <DefinitionRow label="Trigger type">
                {run.triggerType.charAt(0).toUpperCase() + run.triggerType.slice(1)}
              </DefinitionRow>
              <DefinitionRow label="Window start (inclusive)">
                {formatUtcDateTime(run.windowStart)}
              </DefinitionRow>
              <DefinitionRow label="Window end (exclusive)">
                {formatUtcDateTime(run.windowEnd)}
              </DefinitionRow>
              <DefinitionRow label="Started">{formatUtcDateTime(run.startedAt)}</DefinitionRow>
              <DefinitionRow label="Completed">{formatUtcDateTime(run.completedAt)}</DefinitionRow>
              <DefinitionRow label="Created">{formatUtcDateTime(run.createdAt)}</DefinitionRow>
            </dl>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Reconciliation counters"
            hint="Counts recorded on this run."
          />
          <div className="px-5 py-2 sm:px-6">
            <dl>
              <DefinitionRow label="Processed orders">{run.processedCount}</DefinitionRow>
              <DefinitionRow label="Matched orders">{run.matchedCount}</DefinitionRow>
              <DefinitionRow label="Discrepancies">{run.discrepancyCount}</DefinitionRow>
              <DefinitionRow label="Uncollected COD">{run.uncollectedCount}</DefinitionRow>
              <DefinitionRow label="Snapshot availability">
                {run.hasSnapshot ? 'Persisted' : 'Not persisted'}
              </DefinitionRow>
            </dl>
          </div>
        </Panel>
      </div>

      {run.status === 'failed' && (
        <section className="border border-signal/25 bg-signal-soft p-5 sm:p-6" aria-label="Run failure">
          <p className="text-[14px] font-semibold text-ink">Run failed</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/80">
            {run.errorMessage ?? 'Reconciliation failed. No additional error details were provided.'}
          </p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Action to={HISTORY_PATH} variant="outline" size="sm">
          <ArrowLeft size={14} aria-hidden /> Back to run history
        </Action>
      </div>
    </>
  )
}

function CurrencySummary({
  summaryByCurrency,
}: {
  summaryByCurrency: AdminCodReconciliationRunDetail['summaryByCurrency']
}) {
  return (
    <section>
      <Panel>
        <PanelHeader
          title="Currency financial summary"
          hint="Expected and collected amounts stay in their own currency and are never combined."
        />
        {summaryByCurrency.length === 0 ? (
          <p className="px-6 py-6 text-sm leading-relaxed text-graphite">
            No currency rows to summarise.
          </p>
        ) : (
          <div className="p-5 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaryByCurrency.map((summary) => (
              <CurrencyCard key={summary.currency} summary={summary} />
            ))}
          </div>
        )}
      </Panel>
    </section>
  )
}

function CurrencyCard({
  summary,
}: {
  summary: AdminCodReconciliationCurrencySummary
}) {
  return (
    <div className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-all hover:border-graphite/30 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[13px] font-semibold text-ink uppercase tracking-wider">
          {summary.currency}
        </h3>
        <span className="text-[11px] font-medium text-ash uppercase tracking-wider">
          Snapshot
        </span>
      </div>
      <dl className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2 border-b border-line-soft pb-2">
          <dt className="text-[12px] text-graphite">Expected orders</dt>
          <dd className="font-mono tabular-nums text-ink">{summary.expectedCount}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-b border-line-soft pb-2">
          <dt className="text-[12px] text-graphite">Expected amount</dt>
          <dd className="font-mono tabular-nums text-ink">
            <Money amount={summary.expectedAmount} currency={summary.currency} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-b border-line-soft pb-2">
          <dt className="text-[12px] text-graphite">Matched orders</dt>
          <dd className="font-mono tabular-nums text-success">{summary.matchedCount}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-b border-line-soft pb-2">
          <dt className="text-[12px] text-graphite">Discrepancies</dt>
          <dd className="font-mono tabular-nums text-signal">{summary.discrepancyCount}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-b border-line-soft pb-2">
          <dt className="text-[12px] text-graphite">Collected orders</dt>
          <dd className="font-mono tabular-nums text-ink">{summary.collectedCount}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-[12px] text-graphite">Collected amount</dt>
          <dd className="font-mono tabular-nums text-ink">
            <Money amount={summary.collectedAmount} currency={summary.currency} />
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-[11px] leading-relaxed text-ash">
        Expected and matched counts group orders by order currency. Collected
        amounts group collections by collection currency. Figures are never added
        across currencies.
      </p>
    </div>
  )
}

function RunAuditTable({
  items,
  total,
  page,
  limit,
  totalPages,
  onPage,
  onLimitChange,
}: {
  items: AdminCodReconciliationRunSnapshotItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  onPage: (value: number) => void
  onLimitChange: (value: number) => void
}) {
  return (
    <section>
      <Panel>
        <PanelHeader
          title="Order-level audit trail"
          action={
            <div className="flex items-end gap-2">
              <SelectField
                name="audit-page-size"
                label="Rows per page"
                value={String(limit)}
                onChange={(event) => onLimitChange(Number(event.target.value))}
                className="min-w-0"
              >
                {PAGE_SIZES.map((value) => (
                  <option key={value} value={String(value)}>{value}</option>
                ))}
              </SelectField>
            </div>
          }
          hint={items.length === 0 ? 'No snapshot records for this run.' : undefined}
        />
        {items.length === 0 && (
          <div className="px-5 py-4 sm:px-6">
            <EmptyState
              align="left"
              eyebrow="No orders"
              title="This snapshot has no order records"
              description={
                total === 0
                  ? 'The reconciliation run processed no delivered COD orders.'
                  : 'Move to another page to see records.'
              }
              className="mt-0"
            />
          </div>
        )}
        {items.length > 0 && (
          <div className="px-5 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-4 text-[12px] text-graphite mb-3">
              <p aria-live="polite">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}{' '}
                snapshot records
              </p>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line bg-canvas/40">
                    <Column>Order</Column>
                    <Column>Status</Column>
                    <Column>Payment</Column>
                    <Column>Order cur.</Column>
                    <Column className="text-right">Expected</Column>
                    <Column className="text-right">Collected</Column>
                    <Column>Collect. cur.</Column>
                    <Column>Discrepancy</Column>
                    <Column>Explanation</Column>
                    <Column>Delivered</Column>
                    <Column>Delivery staff</Column>
                    <Column>Collector</Column>
                    <Column className="text-right">Collected at</Column>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {items.map((item) => (
                    <AuditRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <ul className="divide-y divide-line-soft lg:hidden">
              {items.map((item) => (
                <AuditCard key={item.id} item={item} />
              ))}
            </ul>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              limit={limit}
              total={total}
              onPage={onPage}
            />
          </div>
        )}
      </Panel>
    </section>
  )
}

function Column({ children, className = '' }: { children: string; className?: string }) {
  return (
    <th scope="col" className={`px-4 py-3 text-[11px] font-medium text-graphite first:pl-5 last:pr-5 ${className}`}>
      {children}
    </th>
  )
}

function AuditRow({ item }: { item: AdminCodReconciliationRunSnapshotItem }) {
  const collectionCurrency = item.collectionCurrency ?? item.currency
  return (
    <tr className="transition-colors hover:bg-canvas/30">
      <td className="px-5 py-4">
        <span className="block font-mono text-[11px] text-graphite" title={item.orderId}>
          {item.orderNumber ?? item.orderId}
        </span>
      </td>
      <td className="px-4 py-4">
        {item.orderStatus ? (
          <StatusBadge status={item.orderStatus as OrderStatus} />
        ) : (
          <span className="text-[11px] text-ash">—</span>
        )}
      </td>
      <td className="px-4 py-4 text-[11px] text-graphite">
        {item.paymentMethod ?? '—'}
      </td>
      <td className="px-4 py-4 text-[11px] font-mono text-graphite">
        {item.currency}
      </td>
      <td className="px-4 py-4 text-right font-mono text-[11px] text-ink">
        <Money amount={item.expectedAmount} currency={item.currency} />
      </td>
      <td className="px-4 py-4 text-right font-mono text-[11px] text-ink">
        {item.collectedAmount === null ? (
          <span className="text-ash">Not collected</span>
        ) : (
          <Money amount={item.collectedAmount} currency={collectionCurrency} />
        )}
      </td>
      <td className="px-4 py-4 text-[11px] font-mono text-graphite">
        {collectionCurrency}
      </td>
      <td className="px-4 py-4">
        <DiscrepancyBadge item={item} />
      </td>
      <td className="px-4 py-4 text-[11px] text-graphite max-w-32 truncate" title={item.discrepancyExplanation ?? ''}>
        {item.discrepancyExplanation ?? '—'}
      </td>
      <td className="px-4 py-4 text-[11px] text-graphite">
        {formatUtcDate(item.deliveredAt)}
      </td>
      <td className="px-4 py-4 text-[11px] text-graphite">
        {personName(item.deliveryStaff)}
      </td>
      <td className="px-4 py-4 text-[11px] text-graphite">
        {personName(item.collectedBy)}
      </td>
      <td className="px-4 py-4 text-right text-[11px] text-graphite">
        {formatUtcDateTime(item.collectedAt)}
      </td>
    </tr>
  )
}

function AuditCard({ item }: { item: AdminCodReconciliationRunSnapshotItem }) {
  const collectionCurrency = item.collectionCurrency ?? item.currency
  return (
    <li className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-mono text-graphite" title={item.orderId}>
            {item.orderNumber ?? item.orderId}
          </p>
          <p className="mt-1 text-[11.5px] text-graphite">
            {item.orderStatus ?? 'No status'}
          </p>
        </div>
        <DiscrepancyBadge item={item} />
      </div>

      <dl className="grid gap-x-4 gap-y-2 text-[11.5px] sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ash">Expected</dt>
          <dd className="font-mono text-ink">
            <Money amount={item.expectedAmount} currency={item.currency} />
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ash">Collected</dt>
          <dd className="font-mono text-ink">
            {item.collectedAmount === null ? (
              <span className="text-ash">Not collected</span>
            ) : (
              <Money amount={item.collectedAmount} currency={collectionCurrency} />
            )}
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ash">Collection currency</dt>
          <dd className="font-mono text-graphite">{collectionCurrency}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ash">Delivered</dt>
          <dd className="font-mono text-graphite">{formatUtcDate(item.deliveredAt)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ash">Delivery staff</dt>
          <dd className="text-graphite">{personName(item.deliveryStaff)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ash">Collector</dt>
          <dd className="text-graphite">{personName(item.collectedBy)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ash">Collected at</dt>
          <dd className="font-mono text-graphite">{formatUtcDateTime(item.collectedAt)}</dd>
        </div>
      </dl>

      {item.discrepancyExplanation && (
        <p className="px-5 py-3 border border-line/50 bg-bone text-[12.5px] text-ink">
          {item.discrepancyExplanation}
        </p>
      )}
    </li>
  )
}

function DiscrepancyBadge({ item }: { item: AdminCodReconciliationRunSnapshotItem }) {
  const matched = !item.discrepancy
  const tone = matched
    ? 'border-success/25 bg-success-soft text-success'
    : 'border-signal/25 bg-signal-soft text-signal'
  const dot = matched ? 'bg-success' : 'bg-signal'
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${tone}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      {discrepancyLabel(item)}
    </span>
  )
}

function PaginationBar({
  page,
  totalPages,
  limit,
  total,
  onPage,
}: {
  page: number
  totalPages: number
  limit: number
  total: number
  onPage: (value: number) => void
}) {
  return (
    <nav aria-label="Audit table pages" className="flex flex-wrap items-center justify-between gap-3 mt-6 border-t border-line pt-4">
      <span className="text-[12px] text-graphite">
        Page {page} of {totalPages} · {limit} per page · {total} records
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
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => onPage(page + 1)}
        >
          Next <ChevronRight size={14} aria-hidden />
        </Action>
      </div>
    </nav>
  )
}
