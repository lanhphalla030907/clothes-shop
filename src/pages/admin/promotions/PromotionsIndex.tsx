import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Archive,
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePause,
  Pencil,
  Play,
  Pause,
  Plus,
  ReceiptText,
  TicketPercent,
} from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { FormError, SelectField, TextAreaField, TextField } from '@/components/account/Field'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Modal } from '@/components/account/Modal'

import { Money } from '@/components/account/Bits'
import { useFeedback } from '@/context/feedbackContext'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import {
  activatePromotion,
  archivePromotion,
  createPromotion,
  fetchAdminPromotions,
  fetchPromotionUsages,
  pausePromotion,
  updatePromotion,
} from '@/features/promotions/api'
import type {
  Promotion,
  PromotionDiscountType,
  PromotionInput,
  PromotionKind,
} from '@/types/api'
import {
  buildPromotionInput,
  emptyPromotionForm,
  promotionFormValues,
  validatePromotionForm,
  type PromotionFormValues as FormValues,
} from '@/features/promotions/form'

const PAGE_SIZE = 20

const KIND_LABEL: Record<PromotionKind, string> = {
  COUPON: 'Coupon',
  AUTOMATIC: 'Automatic',
}

const discountLabel = (promotion: Promotion): string => {
  if (promotion.discountType === 'PERCENTAGE') {
    return `${Number(promotion.percentOff ?? 0)}% off`
  }
  if (promotion.discountType === 'FIXED_AMOUNT') {
    return `${formatMoney(promotion.amountOff ?? '0.00')} off`
  }
  return 'Free shipping'
}

const formatPromotionDate = (value: string | null): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const scheduleLabel = (promotion: Promotion): string => {
  const start = formatPromotionDate(promotion.startsAt)
  const end = formatPromotionDate(promotion.endsAt)
  if (start === null && end === null) return 'Always on'
  if (start !== null && end !== null) return `${start} – ${end}`
  if (start !== null) return `From ${start}`
  return `Until ${end}`
}

const usageLabel = (promotion: Promotion): string => {
  const total =
    promotion.usageLimitTotal === null
      ? 'No total cap'
      : `${promotion.usageLimitTotal} total uses`
  const perUser =
    promotion.usageLimitPerUser === null
      ? null
      : `${promotion.usageLimitPerUser} per customer`
  return perUser === null ? total : `${total} · ${perUser}`
}

export default function PromotionsIndex() {
  const { confirmFeedback, showFeedback } = useFeedback()
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const [discountType, setDiscountType] = useState('')
  const [status, setStatus] = useState('')
  const [archived, setArchived] = useState('false')
  const [editing, setEditing] = useState<Promotion | null | undefined>(undefined)
  const [usageOf, setUsageOf] = useState<Promotion | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<unknown>()

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      kind: kind || undefined,
      discountType: discountType || undefined,
      isActive: status === '' ? undefined : status === 'active',
      archived: archived === '' ? undefined : archived === 'true',
    }),
    [page, kind, discountType, status, archived],
  )

  const promotions = useAsyncResource(
    (signal) => fetchAdminPromotions(query, signal),
    [query],
  )

  const countsQuery = useMemo(
    () => ({ kind: kind || undefined, discountType: discountType || undefined }),
    [kind, discountType],
  )

  const counts = useAsyncResource(
    async (signal) => {
      const [active, paused, archivedOnly] = await Promise.all([
        fetchAdminPromotions(
          { ...countsQuery, page: 1, limit: 1, isActive: true, archived: false },
          signal,
        ),
        fetchAdminPromotions(
          { ...countsQuery, page: 1, limit: 1, isActive: false, archived: false },
          signal,
        ),
        fetchAdminPromotions(
          { ...countsQuery, page: 1, limit: 1, archived: true },
          signal,
        ),
      ])

      return {
        active: active.pagination.total,
        paused: paused.pagination.total,
        archived: archivedOnly.pagination.total,
      }
    },
    [countsQuery],
  )

  const refresh = () => promotions.refetch()
  const hasFilters =
    kind !== '' || discountType !== '' || status !== '' || archived !== 'false'

  const openEditor = (promotion: Promotion | null | undefined) => {
    setActionError(undefined)
    setSaving(false)
    setEditing(promotion)
  }

  const clearFilters = () => {
    setKind('')
    setDiscountType('')
    setStatus('')
    setArchived('false')
    setPage(1)
  }

  /**
   * Runs a promotion mutation and reports whether it succeeded.
   *
   * The boolean matters for the editor: a rejected save must keep the modal open
   * so the operator can correct the field the server objected to.
   */
  const mutate = async (
    work: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> => {
    setSaving(true)
    setActionError(undefined)
    try {
      await work()
      showFeedback({ type: 'success', title: 'Promotion updated', message: success })
      refresh()
      return true
    } catch (error) {
      setActionError(error)
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggle = (promotion: Promotion) =>
    void mutate(
      () =>
        promotion.isActive
          ? pausePromotion(promotion.id)
          : activatePromotion(promotion.id),
      promotion.isActive
        ? 'The promotion was paused.'
        : 'The promotion is active.',
    )

  const archive = async (promotion: Promotion) => {
    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Archive promotion?',
      message: `${promotion.name} will be paused and retained with its usage history.`,
      confirmLabel: 'Archive',
      cancelLabel: 'Keep promotion',
    })
    if (confirmed) {
      void mutate(
        () => archivePromotion(promotion.id),
        'The promotion was archived and its history was retained.',
      )
    }
  }

  const save = (promotion: Promotion | null, input: PromotionInput) => {
    void mutate(
      () =>
        promotion
          ? updatePromotion(promotion.id, input)
          : createPromotion(input),
      promotion ? 'Changes were saved.' : 'The promotion was created.',
    ).then((saved) => {
      if (saved) openEditor(undefined)
    })
  }

  const items = promotions.data?.items ?? []
  const pagination = promotions.data?.pagination
  const total = counts.data
    ? counts.data.active + counts.data.paused + counts.data.archived
    : undefined
  const firstRow =
    pagination === undefined || pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1
  const lastRow =
    pagination === undefined
      ? 0
      : Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sales"
        title="Promotions"
        description="Manage coupons and automatic discounts. Amounts shown to customers are always calculated by the server."
        action={
          <Action size="sm" onClick={() => openEditor(null)}>
            <Plus size={15} strokeWidth={1.8} aria-hidden />
            New promotion
          </Action>
        }
      />

      {actionError !== undefined && editing === undefined && (
        <FormError message={toUserMessage(actionError)} />
      )}

      <section aria-label="Promotion summary" className="space-y-4">
        {promotions.error === undefined && counts.error !== undefined && (
          <InlineNotice message={toUserMessage(counts.error)} />
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Total promotions"
            value={total ?? '—'}
            loading={counts.isLoading}
            hint="Live, paused and archived"
            icon={BadgePercent}
            emphasis
          />
          <AdminStatCard
            label="Active"
            value={counts.data?.active ?? '—'}
            loading={counts.isLoading}
            hint="Available to customers"
            icon={CircleCheck}
          />
          <AdminStatCard
            label="Paused"
            value={counts.data?.paused ?? '—'}
            loading={counts.isLoading}
            hint="Hidden until activated"
            icon={CirclePause}
          />
          <AdminStatCard
            label="Archived"
            value={counts.data?.archived ?? '—'}
            loading={counts.isLoading}
            hint="Retained for history"
            icon={Archive}
          />
        </div>
      </section>

      <section
        aria-label="Promotion filters"
        className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.09em] text-graphite/80 uppercase">
              Filters
            </p>
            <h2 className="mt-1 text-[15px] font-semibold text-ink">
              Refine promotions
            </h2>
          </div>
          {hasFilters && (
            <Action variant="ghost" size="sm" onClick={clearFilters}>
              Reset filters
            </Action>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField
            name="promotion-kind"
            label="Type"
            value={kind}
            onChange={(event) => {
              setKind(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All types</option>
            <option value="COUPON">Coupon</option>
            <option value="AUTOMATIC">Automatic</option>
          </SelectField>
          <SelectField
            name="promotion-discount"
            label="Discount"
            value={discountType}
            onChange={(event) => {
              setDiscountType(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All discounts</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed amount</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </SelectField>
          <SelectField
            name="promotion-status"
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </SelectField>
          <SelectField
            name="promotion-archived"
            label="Archive"
            value={archived}
            onChange={(event) => {
              setArchived(event.target.value)
              setPage(1)
            }}
          >
            <option value="false">Live only</option>
            <option value="true">Archived only</option>
            <option value="">All records</option>
          </SelectField>
        </div>
      </section>

      {promotions.isLoading && <PromotionsSkeleton />}

      {!promotions.isLoading && promotions.error !== undefined && (
        <ErrorState
          message={toUserMessage(promotions.error)}
          onRetry={refresh}
        />
      )}

      {!promotions.isLoading &&
        promotions.error === undefined &&
        items.length === 0 && (
          <EmptyState
            align="left"
            eyebrow="No promotions"
            title="No matching promotions"
            description="Create a coupon or automatic promotion to offer a server-calculated discount."
            action={
              <Action size="sm" onClick={() => openEditor(null)}>
                New promotion
              </Action>
            }
          />
        )}

      {!promotions.isLoading &&
        promotions.error === undefined &&
        items.length > 0 && (
          <section aria-label="Promotion list" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[12px] text-graphite" aria-live="polite">
                Showing {firstRow}–{lastRow} of {pagination?.total ?? items.length}
              </p>
              {promotions.isRefreshing && (
                <span className="text-[12px] text-graphite" role="status">
                  Refreshing…
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-line bg-paper-pure shadow-xs">
              <table className="w-full min-w-[1080px] text-left text-[13px]">
                <thead className="border-b border-line bg-canvas/40">
                  <tr>
                    <Column>Promotion</Column>
                    <Column>Type</Column>
                    <Column>Discount</Column>
                    <Column>Schedule</Column>
                    <Column>Usage</Column>
                    <Column>Status</Column>
                    <Column className="text-right">Actions</Column>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {items.map((promotion) => (
                    <PromotionRow
                      key={promotion.id}
                      promotion={promotion}
                      busy={saving}
                      onEdit={() => openEditor(promotion)}
                      onUsage={() => setUsageOf(promotion)}
                      onToggle={() => toggle(promotion)}
                      onArchive={() => void archive(promotion)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={pagination?.page ?? page}
              totalPages={pagination?.totalPages ?? 1}
              onPage={setPage}
            />
          </section>
        )}

      {editing !== undefined && (
        <PromotionFormModal
          key={editing === null ? 'new' : editing.id}
          promotion={editing}
          saving={saving}
          error={actionError}
          onCancel={() => openEditor(undefined)}
          onSave={(input) => save(editing, input)}
        />
      )}

      {usageOf !== null && (
        <PromotionUsageModal
          promotion={usageOf}
          onClose={() => setUsageOf(null)}
        />
      )}
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
      className={`px-4 py-3 text-[11.5px] font-semibold tracking-wider text-graphite uppercase first:pl-5 last:pr-5 ${className}`}
    >
      {children}
    </th>
  )
}

function RowAction({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-9 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'text-graphite hover:bg-signal-soft hover:text-signal'
          : 'text-graphite hover:bg-bone hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function PromotionStatus({ promotion }: { promotion: Promotion }) {
  if (promotion.archivedAt !== null) {
    return (
      <AdminBadge variant="neutral" size="sm">
        Archived
      </AdminBadge>
    )
  }
  if (promotion.isActive) {
    return (
      <AdminBadge variant="success" size="sm">
        Active
      </AdminBadge>
    )
  }
  return (
    <AdminBadge variant="warning" size="sm">
      Paused
    </AdminBadge>
  )
}

function PromotionRow({
  promotion,
  busy,
  onEdit,
  onUsage,
  onToggle,
  onArchive,
}: {
  promotion: Promotion
  busy: boolean
  onEdit: () => void
  onUsage: () => void
  onToggle: () => void
  onArchive: () => void
}) {
  return (
    <tr className="border-b border-line-soft transition-colors last:border-b-0 hover:bg-bone/40">
      <td className="px-4 py-4 first:pl-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13.5px] font-medium text-ink">{promotion.name}</p>
          {promotion.code !== null && (
            <span className="rounded-md border border-line bg-bone px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.04em] text-graphite">
              {promotion.code}
            </span>
          )}
        </div>
        {promotion.description !== null && (
          <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-graphite">
            {promotion.description}
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <AdminBadge
          variant={promotion.kind === 'COUPON' ? 'info' : 'neutral'}
          size="sm"
          dot={false}
        >
          {promotion.kind === 'COUPON' ? (
            <TicketPercent size={12} strokeWidth={1.8} aria-hidden />
          ) : (
            <BadgePercent size={12} strokeWidth={1.8} aria-hidden />
          )}
          {KIND_LABEL[promotion.kind]}
        </AdminBadge>
      </td>
      <td className="px-4 py-4">
        <p className="font-mono text-[12.5px] tabular-nums text-ink">
          {discountLabel(promotion)}
        </p>
        {promotion.minSubtotal !== '0.00' && (
          <p className="mt-0.5 text-[11px] text-graphite">
            Min. {formatMoney(promotion.minSubtotal)}
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <p className="text-[12.5px] text-ink">{scheduleLabel(promotion)}</p>
        {promotion.priority > 0 && (
          <p className="mt-0.5 text-[11px] text-graphite">
            Priority {promotion.priority}
          </p>
        )}
      </td>
      <td className="px-4 py-4 text-[12.5px] text-graphite">
        {usageLabel(promotion)}
      </td>
      <td className="px-4 py-4">
        <PromotionStatus promotion={promotion} />
      </td>
      <td className="px-4 py-4 last:pr-5">
        <div className="flex items-center justify-end gap-1">
          <RowAction label="Edit" onClick={onEdit}>
            <Pencil size={15} strokeWidth={1.8} aria-hidden />
          </RowAction>
          <RowAction label="Usage" onClick={onUsage}>
            <ReceiptText size={15} strokeWidth={1.8} aria-hidden />
          </RowAction>
          {promotion.archivedAt === null && (
            <>
              <RowAction label={promotion.isActive ? 'Pause' : 'Activate'} onClick={onToggle} disabled={busy}>
                {promotion.isActive ? (
                  <Pause size={15} strokeWidth={1.8} aria-hidden />
                ) : (
                  <Play size={15} strokeWidth={1.8} aria-hidden />
                )}
              </RowAction>
              <RowAction label="Archive" onClick={onArchive} disabled={busy} danger>
                <Archive size={15} strokeWidth={1.8} aria-hidden />
              </RowAction>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  const last = Math.max(1, totalPages)

  return (
    <nav
      aria-label="Promotion pagination"
      className="flex flex-col gap-4 rounded-xl border border-line bg-paper-pure px-5 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[12.5px] text-graphite" aria-live="polite">
        Page {page} of {last}
      </p>
      <div className="flex items-center gap-2">
        <Action
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
          Previous
        </Action>
        <Action
          variant="outline"
          size="sm"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
        </Action>
      </div>
    </nav>
  )
}

function PromotionsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs"
    >
      <span className="sr-only">Loading promotions…</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-line-soft px-5 py-4 last:border-b-0"
        >
          <div className="h-4 w-44 animate-pulse bg-line-soft" />
          <div className="h-4 w-20 animate-pulse bg-line-soft" />
          <div className="h-4 w-28 animate-pulse bg-line-soft" />
          <div className="ml-auto h-4 w-24 animate-pulse bg-line-soft" />
          <div className="h-4 w-16 animate-pulse bg-line-soft" />
        </div>
      ))}
    </div>
  )
}

function PromotionFormModal({
  promotion,
  saving,
  error,
  onCancel,
  onSave,
}: {
  promotion: Promotion | null
  saving: boolean
  error: unknown
  onCancel: () => void
  onSave: (input: PromotionInput) => void
}) {
  const [values, setValues] = useState<FormValues>(() =>
    promotion ? promotionFormValues(promotion) : emptyPromotionForm(),
  )
  const [formError, setFormError] = useState<string>()

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validatePromotionForm(values)
    if (validationError !== undefined) {
      setFormError(validationError)
      return
    }
    setFormError(undefined)
    onSave(buildPromotionInput(values))
  }

  return (
    <Modal
      title={promotion ? 'Edit promotion' : 'New promotion'}
      onClose={onCancel}
      className="w-[min(52rem,calc(100vw-1.5rem))]"
    >
      <form onSubmit={submit} className="space-y-5">
        {formError !== undefined && <FormError message={formError} />}
        {error !== undefined && <FormError message={toUserMessage(error)} />}

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name="promotion-name"
            label="Name"
            required
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
          />
          <SelectField
            name="promotion-kind-form"
            label="Promotion type"
            value={values.kind}
            onChange={(event) => set('kind', event.target.value as PromotionKind)}
          >
            <option value="COUPON">Coupon</option>
            <option value="AUTOMATIC">Automatic</option>
          </SelectField>

          {values.kind === 'COUPON' && (
            <TextField
              name="promotion-code"
              label="Coupon code"
              required
              value={values.code}
              onChange={(event) => set('code', event.target.value)}
            />
          )}
          {values.kind === 'AUTOMATIC' && (
            <TextField
              name="promotion-priority"
              type="number"
              label="Priority"
              value={values.priority}
              onChange={(event) => set('priority', event.target.value)}
            />
          )}

          <SelectField
            name="promotion-discount-form"
            label="Discount type"
            value={values.discountType}
            onChange={(event) =>
              set('discountType', event.target.value as PromotionDiscountType)
            }
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed amount</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </SelectField>

          {values.discountType === 'PERCENTAGE' && (
            <TextField
              name="promotion-percent"
              type="number"
              step="0.01"
              label="Percent off"
              required
              value={values.percentOff}
              onChange={(event) => set('percentOff', event.target.value)}
            />
          )}
          {values.discountType === 'FIXED_AMOUNT' && (
            <TextField
              name="promotion-amount"
              type="number"
              step="0.01"
              label="Amount off"
              required
              value={values.amountOff}
              onChange={(event) => set('amountOff', event.target.value)}
            />
          )}

          <TextField
            name="promotion-minimum"
            type="number"
            step="0.01"
            label="Minimum subtotal"
            value={values.minSubtotal}
            onChange={(event) => set('minSubtotal', event.target.value)}
          />
          <TextField
            name="promotion-max"
            type="number"
            step="0.01"
            label="Maximum discount"
            value={values.maxDiscount}
            onChange={(event) => set('maxDiscount', event.target.value)}
          />
          <TextField
            name="promotion-start"
            type="datetime-local"
            label="Start date"
            value={values.startsAt}
            onChange={(event) => set('startsAt', event.target.value)}
          />
          <TextField
            name="promotion-end"
            type="datetime-local"
            label="End date"
            value={values.endsAt}
            onChange={(event) => set('endsAt', event.target.value)}
          />
          <TextField
            name="promotion-total-limit"
            type="number"
            min="0"
            label="Global usage limit"
            value={values.usageLimitTotal}
            onChange={(event) => set('usageLimitTotal', event.target.value)}
          />
          <TextField
            name="promotion-user-limit"
            type="number"
            min="0"
            label="Per-user usage limit"
            value={values.usageLimitPerUser}
            onChange={(event) => set('usageLimitPerUser', event.target.value)}
          />
        </div>

        <TextAreaField
          name="promotion-description"
          label="Description"
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
        />

        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
          />
          Active when saved
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Action type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Action>
          <Action type="submit" size="sm" disabled={saving}>
            {saving ? 'Saving…' : 'Save promotion'}
          </Action>
        </div>
      </form>
    </Modal>
  )
}

function PromotionUsageModal({
  promotion,
  onClose,
}: {
  promotion: Promotion
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const usages = useAsyncResource(
    (signal) => fetchPromotionUsages(promotion.id, page, signal),
    [promotion.id, page],
  )

  return (
    <Modal
      title={`Usage · ${promotion.name}`}
      onClose={onClose}
      className="w-[min(46rem,calc(100vw-1.5rem))]"
    >
      {usages.isLoading && (
        <p className="text-[13px] text-graphite">Loading usage history…</p>
      )}

      {usages.error !== undefined && (
        <FormError message={toUserMessage(usages.error)} />
      )}

      {usages.data !== undefined && usages.data.items.length === 0 && (
        <p className="text-[13px] text-graphite">
          No orders have used this promotion.
        </p>
      )}

      {usages.data !== undefined && usages.data.items.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead className="border-b border-line">
                <tr>
                  <th scope="col" className="py-2.5 pr-4 text-[11.5px] font-semibold tracking-wider text-graphite uppercase">
                    Order
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-wider text-graphite uppercase">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-[11.5px] font-semibold tracking-wider text-graphite uppercase">
                    Date
                  </th>
                  <th scope="col" className="py-2.5 pl-4 text-right text-[11.5px] font-semibold tracking-wider text-graphite uppercase">
                    Discount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {usages.data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 font-mono text-[12px] text-ink">
                      {item.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-graphite">{item.user.email}</td>
                    <td className="px-4 py-3 text-graphite">
                      {formatPromotionDate(item.createdAt) ?? '—'}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Money amount={item.discountAmount} currency="USD" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={usages.data.pagination.totalPages}
            onPage={setPage}
          />
        </div>
      )}
    </Modal>
  )
}