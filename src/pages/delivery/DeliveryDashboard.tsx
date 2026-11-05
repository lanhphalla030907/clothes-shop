import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, PackageCheck, Wallet } from 'lucide-react'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextAreaField, TextField } from '@/components/account/Field'
import { Action } from '@/components/ui/Action'
import { displayName, useAuth } from '@/features/auth/useAuth'
import {
  collectMyCod,
  fetchMyAssignment,
  fetchMyAssignments,
  fetchMyCodCollections,
  fetchMyCodCollectionsSummary,
  updateMyAssignmentStatus,
} from '@/features/deliveryStaff/api'
import { isApiError, toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import { formatOrderAddressLines } from '@/types/api/orders'
import type {
  CodCollection,
  CodCollectionPage,
  CodCollectionsSummary,
  DeliveryAssignmentStatus,
  DeliveryStaffAssignment,
  DeliveryStaffAssignmentDetail,
} from '@/types/api'

const ASSIGNMENT_STATUSES: DeliveryAssignmentStatus[] = [
  'PENDING_ASSIGNMENT',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'RETURNED',
]

const STATUS_TRANSITIONS: Record<DeliveryAssignmentStatus, DeliveryAssignmentStatus[]> = {
  PENDING_ASSIGNMENT: ['ASSIGNED'],
  ASSIGNED: ['OUT_FOR_DELIVERY', 'FAILED_DELIVERY', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY', 'RETURNED'],
  DELIVERED: [],
  FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'RETURNED'],
  RETURNED: [],
}

const ASSIGNMENT_LIMIT = 10
const COLLECTION_LIMIT = 10

const statusLabel = (status: DeliveryAssignmentStatus): string =>
  status.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())

const formatDate = (value: string | null): string =>
  value === null
    ? '—'
    : new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))

const getApiError = (error: unknown): string => {
  if (isApiError(error) && error.kind === 'validation' && error.details.length > 0) {
    return error.details.join(' ')
  }
  return toUserMessage(error)
}

const PageControls = ({
  page,
  totalPages,
  onChange,
  label,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  label: string
}) => (
  <nav aria-label={label} className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
    <p className="text-xs text-graphite">
      Page <span className="font-semibold text-ink">{page}</span> of{' '}
      <span className="font-semibold text-ink">{Math.max(totalPages, 1)}</span>
    </p>
    <div className="flex gap-2">
      <button
        type="button"
        aria-label="Previous page"
        className="grid size-10 place-items-center border border-line text-ink transition-colors hover:bg-bone disabled:cursor-not-allowed disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={17} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Next page"
        className="grid size-10 place-items-center border border-line text-ink transition-colors hover:bg-bone disabled:cursor-not-allowed disabled:opacity-40"
        disabled={totalPages === 0 || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={17} aria-hidden />
      </button>
    </div>
  </nav>
)

export default function DeliveryDashboard() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<DeliveryAssignmentStatus | ''>('')
  const [assignmentPage, setAssignmentPage] = useState(1)
  const [assignmentReload, setAssignmentReload] = useState(0)
  const [assignments, setAssignments] = useState<DeliveryStaffAssignment[]>([])
  const [assignmentTotal, setAssignmentTotal] = useState(0)
  const [assignmentTotalPages, setAssignmentTotalPages] = useState(0)
  const [assignmentsLoading, setAssignmentsLoading] = useState(true)
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)

  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryStaffAssignment | null>(null)
  const [assignmentDetail, setAssignmentDetail] = useState<DeliveryStaffAssignmentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailReload, setDetailReload] = useState(0)

  const [statusChoice, setStatusChoice] = useState<DeliveryAssignmentStatus | ''>('')
  const [statusNotes, setStatusNotes] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)

  const [codAmount, setCodAmount] = useState('')
  const [codNotes, setCodNotes] = useState('')
  const [receiptProof, setReceiptProof] = useState<File | null>(null)
  const [codSaving, setCodSaving] = useState(false)
  const [codError, setCodError] = useState<string | null>(null)
  const [codSuccess, setCodSuccess] = useState<string | null>(null)

  const [collectionPage, setCollectionPage] = useState(1)
  const [collectionReload, setCollectionReload] = useState(0)
  const [collections, setCollections] = useState<CodCollection[]>([])
  const [collectionTotalPages, setCollectionTotalPages] = useState(0)
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CodCollectionsSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const currentStatus = assignmentDetail?.status ?? selectedAssignment?.status
  const selectedAssignmentId = selectedAssignment?.id
  const availableTransitions = useMemo(
    () => (currentStatus ? STATUS_TRANSITIONS[currentStatus] : []),
    [currentStatus],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchMyAssignments(
      { status: statusFilter || undefined, page: assignmentPage, limit: ASSIGNMENT_LIMIT },
      controller.signal,
    ).then(
      (result) => {
        setAssignments(result.items)
        setAssignmentTotal(result.pagination.total)
        setAssignmentTotalPages(result.pagination.totalPages)
        setAssignmentsLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setAssignmentsError(getApiError(error))
        setAssignmentsLoading(false)
      },
    )
    return () => controller.abort()
  }, [statusFilter, assignmentPage, assignmentReload])

  useEffect(() => {
    const controller = new AbortController()
    fetchMyCodCollections(collectionPage, COLLECTION_LIMIT, controller.signal).then(
      (result: CodCollectionPage) => {
        setCollections(result.items)
        setCollectionTotalPages(result.pagination.totalPages)
        setCollectionsLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setCollectionsError(getApiError(error))
        setCollectionsLoading(false)
      },
    )
    return () => controller.abort()
  }, [collectionPage, collectionReload])

  useEffect(() => {
    const controller = new AbortController()
    fetchMyCodCollectionsSummary(controller.signal).then(
      (result) => {
        setSummary(result)
        setSummaryLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSummaryError(getApiError(error))
        setSummaryLoading(false)
      },
    )
    return () => controller.abort()
  }, [collectionReload])

  useEffect(() => {
    if (selectedAssignmentId === undefined) return

    const controller = new AbortController()
    fetchMyAssignment(selectedAssignmentId, controller.signal).then(
      (detail) => {
        setAssignmentDetail(detail)
        setStatusChoice(STATUS_TRANSITIONS[detail.status][0] ?? '')
        setDetailLoading(false)
      },
      (error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setDetailError(getApiError(error))
        setDetailLoading(false)
      },
    )
    return () => controller.abort()
  }, [selectedAssignmentId, detailReload])

  const refreshAssignments = () => {
    setAssignmentsLoading(true)
    setAssignmentsError(null)
    setAssignmentReload((value) => value + 1)
  }

  const submitStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedAssignment || !statusChoice) return

    setStatusSaving(true)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      await updateMyAssignmentStatus(
        selectedAssignment.id,
        statusChoice,
        statusNotes.trim() || undefined,
      )
      setSelectedAssignment((current) =>
        current ? { ...current, status: statusChoice } : current,
      )
      setStatusNotes('')
      setStatusSuccess(`Assignment updated to ${statusLabel(statusChoice)}.`)
      setAssignmentsLoading(true)
      setDetailLoading(true)
      setAssignmentReload((value) => value + 1)
      setDetailReload((value) => value + 1)
    } catch (error) {
      setStatusError(getApiError(error))
    } finally {
      setStatusSaving(false)
    }
  }

  const submitCodCollection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedAssignment) return
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(codAmount) || Number(codAmount) <= 0) {
      setCodError('Enter a positive amount with no more than two decimal places.')
      return
    }

    setCodSaving(true)
    setCodError(null)
    setCodSuccess(null)
    try {
      await collectMyCod(selectedAssignment.id, {
        amount: codAmount,
        currency: selectedAssignment.order.currency,
        notes: codNotes.trim() || undefined,
        receiptProof: receiptProof ?? undefined,
      })
      setCodSuccess('COD collection recorded successfully.')
      setCodAmount(selectedAssignment.order.totalAmount)
      setCodNotes('')
      setReceiptProof(null)
      setCollectionPage(1)
      setCollectionsLoading(true)
      setSummaryLoading(true)
      setAssignmentsLoading(true)
      setDetailLoading(true)
      setCollectionReload((value) => value + 1)
      setAssignmentReload((value) => value + 1)
      setDetailReload((value) => value + 1)
    } catch (error) {
      setCodError(getApiError(error))
    } finally {
      setCodSaving(false)
    }
  }

  const retryAssignments = () => refreshAssignments()
  const canCollectCod =
    selectedAssignment?.order.paymentMethod === 'COD' &&
    (currentStatus === 'DELIVERED' ||
      (currentStatus !== 'RETURNED' && selectedAssignment?.endedAt === null))

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
      <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-graphite">Delivery workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Welcome, {displayName(user) || 'delivery staff'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-graphite">
            Review your assigned deliveries, update their progress, and record COD collections.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start border border-line bg-paper px-4 py-3 text-sm text-graphite sm:self-auto">
          <ClipboardList size={17} aria-hidden className="text-ink" />
          <span><strong className="text-ink">{assignmentTotal}</strong> assigned orders</span>
        </div>
      </header>

      <section aria-label="COD collection summary" className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet size={18} aria-hidden className="text-graphite" />
          <h2 className="text-lg font-semibold text-ink">COD collections</h2>
        </div>
        {summaryError ? (
          <ErrorState message={summaryError} onRetry={() => {
            setSummaryLoading(true)
            setSummaryError(null)
            setCollectionReload((value) => value + 1)
          }} />
        ) : summaryLoading ? (
          <div aria-label="Loading COD summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse border border-line bg-paper" />
            ))}
          </div>
        ) : (
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total collections" value={String(summary?.totalCollections ?? 0)} />
            {(summary?.totalsByCurrency ?? []).length === 0 ? (
              <SummaryCard label="Collected totals" value="No collections yet" />
            ) : (
              summary?.totalsByCurrency.map((total) => (
                <SummaryCard
                  key={total.currency}
                  label={`${total.currency} collected · ${total.count}`}
                  value={formatMoney(total.totalAmount, total.currency)}
                />
              ))
            )}
            <SummaryCard label="First collection" value={formatDate(summary?.firstCollectionAt ?? null)} />
            <SummaryCard label="Last collection" value={formatDate(summary?.lastCollectionAt ?? null)} />
          </div>
        )}
      </section>

      <section aria-label="Assigned orders" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-graphite">Your deliveries</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Assigned orders</h2>
          </div>
          <div className="w-full sm:max-w-xs">
            <SelectField
              label="Filter by delivery status"
              name="assignment-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setAssignmentsLoading(true)
                setAssignmentsError(null)
                setStatusFilter(event.target.value as DeliveryAssignmentStatus | '')
                setAssignmentPage(1)
              }}
            >
              <option value="">All statuses</option>
              {ASSIGNMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </SelectField>
          </div>
        </div>

        {assignmentsError ? (
          <ErrorState message={assignmentsError} onRetry={retryAssignments} />
        ) : assignmentsLoading ? (
          <div aria-label="Loading assignments" className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse border border-line bg-paper" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <EmptyState
            align="left"
            eyebrow="No assignments"
            title={statusFilter ? `No ${statusLabel(statusFilter).toLowerCase()} orders` : 'Nothing assigned yet'}
            description="New delivery assignments will appear here."
          />
        ) : (
          <div className="overflow-hidden border border-line bg-paper">
            <ul className="divide-y divide-line">
              {assignments.map((assignment) => (
                <li key={assignment.id}>
                  <button
                    type="button"
                    aria-current={selectedAssignment?.id === assignment.id ? 'true' : undefined}
                    onClick={() => {
                      setDetailLoading(true)
                      setDetailError(null)
                      setAssignmentDetail(null)
                      setStatusChoice(STATUS_TRANSITIONS[assignment.status][0] ?? '')
                      setCodAmount(assignment.order.totalAmount)
                      setCodNotes('')
                      setReceiptProof(null)
                      setSelectedAssignment(assignment)
                      setStatusError(null)
                      setStatusSuccess(null)
                      setCodError(null)
                      setCodSuccess(null)
                    }}
                    className={`flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-bone/70 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                      selectedAssignment?.id === assignment.id ? 'bg-bone' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {assignment.order.orderNumber}
                      </span>
                      <span className="mt-1 block truncate text-xs text-graphite">
                        {assignment.order.shippingRecipientName} · {assignment.order.shippingCity ?? assignment.order.shippingCountryCode}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className={`inline-flex border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(assignment.status)}`}>
                        {statusLabel(assignment.status)}
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        {formatMoney(assignment.order.totalAmount, assignment.order.currency)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <PageControls
              label="Assigned order pages"
              page={assignmentPage}
              totalPages={assignmentTotalPages}
              onChange={(page) => {
                setAssignmentsLoading(true)
                setAssignmentPage(page)
              }}
            />
          </div>
        )}
      </section>

      {selectedAssignment && (
        <section aria-label="Assignment details" className="space-y-4">
          <div className="flex items-center gap-2">
            <PackageCheck size={18} aria-hidden className="text-graphite" />
            <h2 className="text-xl font-semibold text-ink">Delivery details</h2>
          </div>
          {detailError && (
            <ErrorState
              message={detailError}
              onRetry={() => {
                setDetailLoading(true)
                setDetailError(null)
                setDetailReload((value) => value + 1)
              }}
            />
          )}
          {detailLoading && (
            <div role="status" className="border border-line bg-paper px-5 py-4 text-sm text-graphite">
              Loading assignment details…
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
            <article className="space-y-5 border border-line bg-paper p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                <div>
                  <p className="eyebrow text-graphite">Order</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink">{selectedAssignment.order.orderNumber}</h3>
                </div>
                <span className={`inline-flex border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(currentStatus ?? selectedAssignment.status)}`}>
                  {statusLabel(currentStatus ?? selectedAssignment.status)}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <DetailBlock title="Customer">
                  <p className="font-medium text-ink">
                    {selectedAssignment.order.user.firstName} {selectedAssignment.order.user.lastName}
                  </p>
                  <p>{selectedAssignment.order.user.email}</p>
                  <p>{selectedAssignment.order.user.phone ?? selectedAssignment.order.shippingPhone}</p>
                </DetailBlock>
                <DetailBlock title="Deliver to">
                  <p className="font-medium text-ink">{selectedAssignment.order.shippingRecipientName}</p>
                  <p>{selectedAssignment.order.shippingPhone}</p>
                  {formatOrderAddressLines(selectedAssignment.order).map((line) => <p key={line}>{line}</p>)}
                </DetailBlock>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite">Order items</h4>
                <ul className="divide-y divide-line border-y border-line">
                  {selectedAssignment.order.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{item.productName}</span>
                        <span className="mt-1 block text-xs text-graphite">
                          {item.sku}{item.variantOptionsSnapshot.length > 0
                            ? ` · ${item.variantOptionsSnapshot.map((option) => `${option.optionName}: ${option.optionValue}`).join(', ')}`
                            : ''} · Qty {item.quantity}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium text-ink">
                        {formatMoney(item.lineTotal, selectedAssignment.order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <DetailValue label="Payment method" value={selectedAssignment.order.paymentMethod ?? 'Not specified'} />
                <DetailValue label="Currency" value={selectedAssignment.order.currency} />
                <DetailValue
                  label="Order total"
                  value={formatMoney(selectedAssignment.order.totalAmount, selectedAssignment.order.currency)}
                />
                <DetailValue label="Assigned" value={formatDate(selectedAssignment.assignedAt)} />
                {currentStatus === 'DELIVERED' && assignmentDetail?.deliveredAt && (
                  <DetailValue
                    label="Delivered at"
                    value={formatDate(assignmentDetail.deliveredAt)}
                  />
                )}
              </dl>
            </article>

            <div className="space-y-5">
              <article className="border border-line bg-paper p-5 sm:p-6">
                <h3 className="text-base font-semibold text-ink">Update delivery status</h3>
                {statusError && <InlineNotice className="mt-4" message={statusError} />}
                {statusSuccess && <InlineNotice className="mt-4" message={statusSuccess} tone="success" />}
                {availableTransitions.length === 0 ? (
                  <p className="mt-3 text-sm leading-6 text-graphite">
                    No further status changes are available for this assignment.
                  </p>
                ) : (
                  <form className="mt-4 space-y-4" onSubmit={submitStatus}>
                    <SelectField
                      label="Next status"
                      name="next-delivery-status"
                      required
                      value={statusChoice}
                      onChange={(event) => setStatusChoice(event.target.value as DeliveryAssignmentStatus)}
                    >
                      {availableTransitions.map((status) => (
                        <option key={status} value={status}>{statusLabel(status)}</option>
                      ))}
                    </SelectField>
                    <TextAreaField
                      label="Notes (optional)"
                      name="delivery-status-notes"
                      value={statusNotes}
                      onChange={(event) => setStatusNotes(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      placeholder="Add a delivery update"
                    />
                    <Action type="submit" size="sm" disabled={statusSaving || !statusChoice}>
                      {statusSaving ? 'Updating…' : 'Update status'}
                    </Action>
                  </form>
                )}
              </article>

              {canCollectCod && (
                <article className="border border-line bg-paper p-5 sm:p-6">
                  <h3 className="text-base font-semibold text-ink">Record COD collection</h3>
                  <p className="mt-1 text-sm leading-5 text-graphite">
                    Enter the cash received. The server verifies it against the order total.
                  </p>
                  {codError && <InlineNotice className="mt-4" message={codError} />}
                  {codSuccess && <InlineNotice className="mt-4" message={codSuccess} tone="success" />}
                  <form className="mt-4 space-y-4" onSubmit={submitCodCollection}>
                    <TextField
                      label="Currency"
                      name="cod-currency"
                      value={selectedAssignment.order.currency}
                      readOnly
                      hint="Currency is fixed by the order."
                    />
                    <TextField
                      label={`Amount (${selectedAssignment.order.currency})`}
                      name="cod-amount"
                      inputMode="decimal"
                      value={codAmount}
                      onChange={(event) => setCodAmount(event.target.value)}
                      required
                      hint={`Order total: ${formatMoney(selectedAssignment.order.totalAmount, selectedAssignment.order.currency)}`}
                    />
                    <div className="space-y-1.5">
                      <label htmlFor="receipt-proof" className="block text-[13px] font-medium text-ink">
                        Receipt proof (optional)
                      </label>
                      <input
                        id="receipt-proof"
                        type="file"
                        accept="image/*"
                        onChange={(event) => setReceiptProof(event.target.files?.[0] ?? null)}
                        className="block min-h-11 w-full border border-line bg-paper-pure px-3 py-2 text-sm text-graphite file:mr-3 file:border-0 file:bg-bone file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink"
                      />
                      {receiptProof && (
                        <p className="text-xs text-graphite">Selected: {receiptProof.name}</p>
                      )}
                    </div>
                    <TextAreaField
                      label="Collection notes (optional)"
                      name="cod-notes"
                      value={codNotes}
                      onChange={(event) => setCodNotes(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      placeholder="Add a collection note"
                    />
                    <Action type="submit" size="sm" disabled={codSaving}>
                      {codSaving ? 'Recording…' : 'Record collection'}
                    </Action>
                  </form>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

      <section aria-label="COD collection history" className="space-y-4">
        <div>
          <p className="eyebrow text-graphite">Your records</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Collection history</h2>
        </div>
        {collectionsError ? (
          <ErrorState message={collectionsError} onRetry={() => {
            setCollectionsLoading(true)
            setCollectionsError(null)
            setCollectionReload((value) => value + 1)
          }} />
        ) : collectionsLoading ? (
          <div aria-label="Loading COD collections" className="h-40 animate-pulse border border-line bg-paper" />
        ) : collections.length === 0 ? (
          <EmptyState
            align="left"
            eyebrow="No collections"
            title="No COD collections recorded"
            description="Collections you record for your assigned COD orders will appear here."
          />
        ) : (
          <div className="overflow-hidden border border-line bg-paper">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead className="bg-bone text-xs uppercase tracking-wide text-graphite">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Collected</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {collections.map((collection) => (
                    <tr key={collection.collectionId}>
                      <td className="px-4 py-3 font-medium text-ink">{collection.orderNumber ?? collection.orderId}</td>
                      <td className="px-4 py-3 text-graphite">{formatDate(collection.collectedAt)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        {formatMoney(collection.amount, collection.currency)}
                      </td>
                      <td className="max-w-56 truncate px-4 py-3 text-graphite">{collection.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PageControls
              label="COD collection pages"
              page={collectionPage}
              totalPages={collectionTotalPages}
              onChange={(page) => {
                setCollectionsLoading(true)
                setCollectionPage(page)
              }}
            />
          </div>
        )}
      </section>
    </main>
  )
}

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <div className="min-h-24 bg-paper px-4 py-4">
    <p className="text-xs font-medium text-graphite">{label}</p>
    <p className="mt-2 break-words text-base font-semibold text-ink">{value}</p>
  </div>
)

const DetailBlock = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-1 text-sm leading-5 text-graphite">
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite">{title}</h4>
    {children}
  </div>
)

const DetailValue = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-graphite">{label}</dt>
    <dd className="mt-1 font-medium text-ink">{value}</dd>
  </div>
)

const statusClasses = (status: DeliveryAssignmentStatus): string => {
  switch (status) {
    case 'DELIVERED':
      return 'border-success/30 bg-success-soft text-ink'
    case 'FAILED_DELIVERY':
    case 'RETURNED':
      return 'border-signal/30 bg-signal-soft text-ink'
    case 'OUT_FOR_DELIVERY':
      return 'border-info/30 bg-info-soft text-ink'
    default:
      return 'border-line bg-bone text-graphite'
  }
}
