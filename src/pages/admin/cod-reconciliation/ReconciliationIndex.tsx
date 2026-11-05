import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCw,
} from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextField } from '@/components/account/Field'
import { Skeleton, SkeletonCard } from '@/components/account/Skeleton'
import { RunStatusBadge } from '@/features/adminCodReconciliation/components/RunStatusBadge'
import {
  fetchAdminCodReconciliationRuns,
  triggerAdminCodReconciliation,
} from '@/features/adminCodReconciliation/api'
import { useFeedback } from '@/context/feedbackContext'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMutation } from '@/hooks/useMutation'
import { toUserMessage } from '@/lib/api/errors'
import type {
  AdminCodReconciliationExecution,
  AdminCodReconciliationRun,
  AdminCodReconciliationRunQuery,
  ReconciliationRunStatus,
  ReconciliationTriggerType,
} from '@/types/api'

const PAGE_SIZES = [10, 20, 50, 100] as const
const RUN_STATUSES: ReconciliationRunStatus[] = ['running', 'completed', 'failed']
const TRIGGER_TYPES: ReconciliationTriggerType[] = ['cron', 'manual']

type TriggerMode = 'date' | 'window'

const isDate = (value: string | null): value is string =>
  value !== null &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value

const pageNumber = (value: string | null): number => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

const pageSize = (value: string | null): number => {
  const parsed = Number(value)
  return PAGE_SIZES.includes(parsed as (typeof PAGE_SIZES)[number]) ? parsed : 20
}

const previousUtcDate = (): string => {
  const today = new Date()
  const yesterday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1),
  )
  return yesterday.toISOString().slice(0, 10)
}

const utcDateTime = (date: string): string => `${date}T00:00:00.000Z`

const formatUtcDateTime = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date) + ' UTC'
}

export default function ReconciliationIndex() {
  const [params, setParams] = useSearchParams()
  const { showFeedback } = useFeedback()
  const page = pageNumber(params.get('page'))
  const limit = pageSize(params.get('limit'))
  const statusValue = params.get('status')
  const status = RUN_STATUSES.find((item) => item === statusValue)
  const triggerValue = params.get('triggerType')
  const triggerType = TRIGGER_TYPES.find((item) => item === triggerValue)
  const startValue = params.get('startDate')
  const endValue = params.get('endDate')
  const startDate = isDate(startValue) ? startValue : undefined
  const endDate = isDate(endValue) ? endValue : undefined

  const query = useMemo<AdminCodReconciliationRunQuery>(
    () => ({
      page,
      limit,
      status,
      triggerType,
      startDate,
      endDate,
    }),
    [page, limit, status, triggerType, startDate, endDate],
  )
  const history = useAsyncResource(
    (signal) => fetchAdminCodReconciliationRuns(query, signal),
    [query],
  )
  const [triggerMode, setTriggerMode] = useState<TriggerMode>('date')
  const [date, setDate] = useState(previousUtcDate)
  const [windowStart, setWindowStart] = useState(previousUtcDate)
  const [windowEnd, setWindowEnd] = useState(() => {
    const tomorrow = new Date(`${previousUtcDate()}T00:00:00.000Z`)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    return tomorrow.toISOString().slice(0, 10)
  })
  const [windowError, setWindowError] = useState<string>()

  const triggerMutation = useMutation(
    (body: { date: string } | { windowStart: string; windowEnd: string }) =>
      triggerAdminCodReconciliation(body),
    {
      onSuccess: (result: AdminCodReconciliationExecution) => {
        history.refetch()
        showFeedback({
          type: 'success',
          title: 'Reconciliation completed',
          message: `Run ${result.run.id} completed. Processed ${result.counters.processedCount} orders.`,
        })
      },
    },
  )

  const runs = history.data?.items ?? []
  const total = history.data?.total ?? 0
  const totalPages = history.data?.totalPages ?? 0
  const completedOnPage = runs.filter((run) => run.status === 'completed').length
  const failedOnPage = runs.filter((run) => run.status === 'failed').length
  const hasFilters =
    status !== undefined ||
    triggerType !== undefined ||
    startDate !== undefined ||
    endDate !== undefined

  const updateParam = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (resetPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const clearFilters = () => setParams({}, { replace: true })

  const submitTrigger = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWindowError(undefined)
    triggerMutation.reset()

    if (triggerMode === 'date') {
      if (!isDate(date)) {
        setWindowError('Choose a valid UTC calendar date.')
        return
      }
      await triggerMutation.run({ date })
      return
    }

    if (!isDate(windowStart) || !isDate(windowEnd) || windowStart >= windowEnd) {
      setWindowError('Choose valid dates with the exclusive end after the start.')
      return
    }

    await triggerMutation.run({
      windowStart: utcDateTime(windowStart),
      windowEnd: utcDateTime(windowEnd),
    })
  }

  const triggerError = triggerMutation.error

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Cash on delivery"
        title="Reconciliation"
        description="Review reconciliation runs and manually reconcile delivered COD orders for a UTC date or half-open window."
        action={
          <Action
            variant="outline"
            size="sm"
            onClick={history.refetch}
            disabled={history.isRefreshing}
          >
            <RefreshCw size={14} aria-hidden />
            Refresh
          </Action>
        }
      />

      <section aria-label="Reconciliation run statistics">
        {history.isLoading ? (
          <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="space-y-3 bg-paper p-5 sm:p-6">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-36" />
              </div>
            ))}
          </div>
        ) : history.data ? (
          <dl className="grid gap-px border border-line bg-line sm:grid-cols-3">
            <Stat label="Runs matching filters" value={total} hint="Server-reported total" />
            <Stat label="Completed on this page" value={completedOnPage} hint="Current page only" />
            <Stat label="Failed on this page" value={failedOnPage} hint="Current page only" />
          </dl>
        ) : null}
      </section>

      <section className="border border-line bg-paper">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <p className="eyebrow text-graphite">Manual run</p>
          <h2 className="mt-1 text-[16px] font-semibold text-ink">Trigger reconciliation</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-graphite">
            Manual runs use the same duplicate protection as scheduled runs.
          </p>
        </div>
        <form onSubmit={submitTrigger} className="space-y-5 p-5 sm:p-6">
          <fieldset className="flex flex-wrap gap-x-6 gap-y-3">
            <legend className="mb-2 text-[13px] font-medium text-ink">Window type</legend>
            <label className="inline-flex min-h-11 items-center gap-2 text-[13.5px] text-ink">
              <input
                type="radio"
                name="trigger-mode"
                value="date"
                checked={triggerMode === 'date'}
                onChange={() => setTriggerMode('date')}
                className="accent-ink"
              />
              One UTC calendar day
            </label>
            <label className="inline-flex min-h-11 items-center gap-2 text-[13.5px] text-ink">
              <input
                type="radio"
                name="trigger-mode"
                value="window"
                checked={triggerMode === 'window'}
                onChange={() => setTriggerMode('window')}
                className="accent-ink"
              />
              Custom UTC window
            </label>
          </fieldset>

          {triggerMode === 'date' ? (
            <div className="max-w-xs">
              <TextField
                type="date"
                name="reconciliation-date"
                label="UTC date"
                hint="The selected calendar day is reconciled from 00:00 UTC to the next 00:00 UTC."
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                type="date"
                name="window-start"
                label="Window start (UTC)"
                hint="Inclusive boundary at 00:00 UTC."
                value={windowStart}
                onChange={(event) => setWindowStart(event.target.value)}
                required
              />
              <TextField
                type="date"
                name="window-end"
                label="Window end (UTC, exclusive)"
                hint="Exclusive boundary at 00:00 UTC."
                value={windowEnd}
                onChange={(event) => setWindowEnd(event.target.value)}
                required
              />
            </div>
          )}

          {(windowError || triggerError !== undefined) && (
            <InlineNotice
              message={windowError ?? toUserMessage(triggerError)}
              tone="error"
              onDismiss={() => {
                setWindowError(undefined)
                triggerMutation.reset()
              }}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Action type="submit" size="sm" disabled={triggerMutation.isPending}>
              {triggerMutation.isPending ? (
                <>
                  <RotateCw size={14} className="animate-spin" aria-hidden />
                  Running…
                </>
              ) : (
                'Run reconciliation'
              )}
            </Action>
            <span className="text-[12px] text-graphite">All dates and times are UTC.</span>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">Run history</h2>
          <p className="mt-1 text-[13px] text-graphite">
            Filters apply to the run window start, inclusive, in UTC.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SelectField
            name="run-status"
            label="Status"
            value={status ?? ''}
            onChange={(event) => updateParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {RUN_STATUSES.map((value) => (
              <option key={value} value={value}>{capitalize(value)}</option>
            ))}
          </SelectField>
          <SelectField
            name="run-trigger"
            label="Trigger type"
            value={triggerType ?? ''}
            onChange={(event) => updateParam('triggerType', event.target.value)}
          >
            <option value="">All triggers</option>
            {TRIGGER_TYPES.map((value) => (
              <option key={value} value={value}>{capitalize(value)}</option>
            ))}
          </SelectField>
          <TextField
            type="date"
            name="history-start-date"
            label="Window start from"
            value={startDate ?? ''}
            onChange={(event) => updateParam('startDate', event.target.value)}
          />
          <TextField
            type="date"
            name="history-end-date"
            label="Window start to"
            value={endDate ?? ''}
            onChange={(event) => updateParam('endDate', event.target.value)}
          />
          <div className="flex items-end gap-2">
            <SelectField
              name="run-page-size"
              label="Rows per page"
              value={String(limit)}
              onChange={(event) => updateParam('limit', event.target.value)}
              className="min-w-0"
            >
              {PAGE_SIZES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </SelectField>
            {hasFilters && (
              <Action variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                Clear
              </Action>
            )}
          </div>
        </div>

        {history.error !== undefined && history.data !== undefined && (
          <InlineNotice message={toUserMessage(history.error)} tone="error" />
        )}
        {history.isLoading && <RunHistorySkeleton />}
        {!history.isLoading && history.error !== undefined && history.data === undefined && (
          <ErrorState message={toUserMessage(history.error)} onRetry={history.refetch} />
        )}
        {!history.isLoading && history.data && runs.length === 0 && (
          <EmptyState
            align="left"
            eyebrow={hasFilters ? 'No matching runs' : 'No run history'}
            title={hasFilters ? 'No runs match these filters' : 'No reconciliations have run yet'}
            description={
              hasFilters
                ? 'Broaden the filters or clear them to see all reconciliation runs.'
                : 'A manual or scheduled reconciliation run will appear here.'
            }
            action={hasFilters ? (
              <Action variant="outline" size="sm" onClick={clearFilters}>Clear filters</Action>
            ) : undefined}
          />
        )}
        {!history.isLoading && runs.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4 text-[12px] text-graphite">
              <p aria-live="polite">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} runs
              </p>
              {history.isRefreshing && <span role="status">Refreshing…</span>}
            </div>
            <div className="border border-line bg-paper">
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <Column>Run</Column>
                      <Column>Status</Column>
                      <Column>Trigger</Column>
                      <Column>UTC window</Column>
                      <Column>Counters</Column>
                      <Column>Started</Column>
                      <Column className="text-right">Details</Column>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {runs.map((run) => <RunRow key={run.id} run={run} />)}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-line-soft lg:hidden">
                {runs.map((run) => (
                  <li key={run.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <RunStatusBadge status={run.status} />
                      <span className="text-[12px] text-graphite">{capitalize(run.triggerType)}</span>
                    </div>
                    <RunWindow run={run} />
                    <Counters run={run} />
                    <div className="flex items-center justify-between border-t border-line-soft pt-3">
                      <span className="text-[12px] text-graphite">Started {formatUtcDateTime(run.startedAt)}</span>
                      <Link
                        to={`/admin/cod-reconciliation/runs/${run.id}`}
                        className="inline-flex min-h-10 items-center gap-1 text-[12px] font-medium text-ink underline-offset-4 hover:underline"
                      >
                        Details <ArrowRight size={13} aria-hidden />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <Pagination
              page={history.data?.page ?? page}
              totalPages={totalPages}
              limit={limit}
              onPage={(value) => updateParam('page', String(value), false)}
            />
          </>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="bg-paper p-5 sm:p-6">
      <dt className="text-[12px] font-medium text-graphite">{label}</dt>
      <dd className="mt-2 font-mono text-3xl font-semibold tabular-nums text-ink">{value}</dd>
      <p className="mt-1 text-[11px] text-ash">{hint}</p>
    </div>
  )
}

function Column({ children, className = '' }: { children: string; className?: string }) {
  return (
    <th scope="col" className={`px-4 py-3 text-[12px] font-medium text-graphite first:pl-5 last:pr-5 ${className}`}>
      {children}
    </th>
  )
}

function RunRow({ run }: { run: AdminCodReconciliationRun }) {
  return (
    <tr>
      <td className="px-5 py-4">
        <span className="block max-w-36 truncate font-mono text-[11px] text-graphite" title={run.id}>
          {run.id}
        </span>
      </td>
      <td className="px-4 py-4"><RunStatusBadge status={run.status} /></td>
      <td className="px-4 py-4 text-[13px] text-graphite">{capitalize(run.triggerType)}</td>
      <td className="px-4 py-4"><RunWindow run={run} /></td>
      <td className="px-4 py-4"><Counters run={run} /></td>
      <td className="px-4 py-4 text-[12px] text-graphite">{formatUtcDateTime(run.startedAt)}</td>
      <td className="px-5 py-4 text-right">
        <Link
          to={`/admin/cod-reconciliation/runs/${run.id}`}
          className="inline-flex min-h-9 items-center gap-1 text-[12px] font-medium text-ink underline-offset-4 hover:underline"
        >
          View <ArrowRight size={13} aria-hidden />
        </Link>
      </td>
    </tr>
  )
}

function RunWindow({ run }: { run: AdminCodReconciliationRun }) {
  return (
    <div className="space-y-1 text-[12px] text-graphite">
      <p>{formatUtcDateTime(run.windowStart)}</p>
      <p className="text-ash">to {formatUtcDateTime(run.windowEnd)} (exclusive)</p>
    </div>
  )
}

function Counters({ run }: { run: AdminCodReconciliationRun }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:grid-cols-4">
      <Counter label="Processed" value={run.processedCount} />
      <Counter label="Matched" value={run.matchedCount} />
      <Counter label="Discrepancies" value={run.discrepancyCount} />
      <Counter label="Uncollected" value={run.uncollectedCount} />
    </dl>
  )
}

function Counter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-ash">{label}</dt>
      <dd className="font-mono tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function RunHistorySkeleton() {
  return (
    <div aria-label="Loading reconciliation history" className="space-y-3">
      <SkeletonCard rows={4} />
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
    <nav aria-label="Run history pages" className="flex flex-wrap items-center justify-between gap-3">
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
