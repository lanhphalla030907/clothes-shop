import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { FormError, SelectField, TextAreaField, TextField } from '@/components/account/Field'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Money } from '@/components/account/Bits'
import { useFeedback } from '@/context/feedbackContext'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import { activatePromotion, archivePromotion, createPromotion, fetchAdminPromotions, fetchPromotionUsages, pausePromotion, updatePromotion } from '@/features/promotions/api'
import type { Promotion, PromotionDiscountType, PromotionInput, PromotionKind, UUID } from '@/types/api'
import {
  buildPromotionInput,
  emptyPromotionForm,
  promotionFormValues,
  validatePromotionForm,
  type PromotionFormValues as FormValues,
} from '@/features/promotions/form'

export default function PromotionsIndex() {
  const { confirmFeedback, showFeedback } = useFeedback()
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const [discountType, setDiscountType] = useState('')
  const [status, setStatus] = useState('')
  const [archived, setArchived] = useState('false')
  const [editing, setEditing] = useState<Promotion | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<unknown>()
  const query = useMemo(() => ({ page, limit: 20, kind: kind || undefined, discountType: discountType || undefined, isActive: status === '' ? undefined : status === 'active', archived: archived === '' ? undefined : archived === 'true' }), [page, kind, discountType, status, archived])
  const promotions = useAsyncResource((signal) => fetchAdminPromotions(query, signal), [query])
  const refresh = () => promotions.refetch()

  const mutate = async (work: () => Promise<unknown>, success: string) => {
    setSaving(true); setActionError(undefined)
    try { await work(); showFeedback({ type: 'success', title: 'Promotion updated', message: success }); refresh() }
    catch (error) { setActionError(error) }
    finally { setSaving(false) }
  }
  const archive = async (promotion: Promotion) => {
    const confirmed = await confirmFeedback({ type: 'warning', title: 'Archive promotion?', message: `${promotion.name} will be paused and retained with its usage history.`, confirmLabel: 'Archive', cancelLabel: 'Keep promotion' })
    if (confirmed) void mutate(() => archivePromotion(promotion.id), 'The promotion was archived and its history was retained.')
  }

  return <div className="space-y-8">
    <AdminPageHeader eyebrow="Sales" title="Promotions" description="Manage coupons and automatic discounts. Amounts shown to customers are always calculated by the server." action={<Action size="sm" onClick={() => setEditing(null)}><Plus size={15} aria-hidden />New promotion</Action>} />
    {actionError !== undefined && <FormError message={toUserMessage(actionError)} />}
    {editing !== undefined && <PromotionForm promotion={editing} saving={saving} onCancel={() => setEditing(undefined)} onSave={(input) => void mutate(() => editing ? updatePromotion(editing.id, input) : createPromotion(input), editing ? 'Changes were saved.' : 'The promotion was created.').then(() => setEditing(undefined))} />}
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField name="promotion-kind" label="Type" value={kind} onChange={e => { setKind(e.target.value); setPage(1) }}><option value="">All types</option><option value="COUPON">Coupon</option><option value="AUTOMATIC">Automatic</option></SelectField>
        <SelectField name="promotion-discount" label="Discount" value={discountType} onChange={e => { setDiscountType(e.target.value); setPage(1) }}><option value="">All discounts</option><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option><option value="FREE_SHIPPING">Free shipping</option></SelectField>
        <SelectField name="promotion-status" label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">Any status</option><option value="active">Active</option><option value="paused">Paused</option></SelectField>
        <SelectField name="promotion-archived" label="Archive" value={archived} onChange={e => { setArchived(e.target.value); setPage(1) }}><option value="false">Live only</option><option value="true">Archived only</option><option value="">All records</option></SelectField>
      </div>
      {promotions.isLoading && <p role="status" className="text-sm text-graphite">Loading promotions…</p>}
      {!promotions.isLoading && promotions.error !== undefined && <ErrorState message={toUserMessage(promotions.error)} onRetry={refresh} />}
      {!promotions.isLoading && promotions.data && promotions.data.items.length === 0 && <EmptyState align="left" eyebrow="No promotions" title="No matching promotions" description="Create a coupon or automatic promotion to offer a server-calculated discount." action={<Action size="sm" onClick={() => setEditing(null)}>New promotion</Action>} />}
      {promotions.data && promotions.data.items.length > 0 && <div className="border border-line bg-paper"><div className="divide-y divide-line-soft">{promotions.data.items.map(p => <PromotionRow key={p.id} promotion={p} busy={saving} onEdit={() => setEditing(p)} onToggle={() => void mutate(() => p.isActive ? pausePromotion(p.id) : activatePromotion(p.id), p.isActive ? 'The promotion was paused.' : 'The promotion is active.')} onArchive={() => void archive(p)} />)}</div><Pagination page={page} pages={promotions.data.pagination.totalPages} onPage={setPage} /></div>}
    </section>
  </div>
}

function PromotionRow({ promotion, busy, onEdit, onToggle, onArchive }: { promotion: Promotion; busy: boolean; onEdit: () => void; onToggle: () => void; onArchive: () => void }) {
  const [showUsage, setShowUsage] = useState(false)
  return <article className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-ink">{promotion.name}</h2><span className="border border-line px-2 py-0.5 text-[11px] text-graphite">{promotion.kind === 'COUPON' ? promotion.code : 'Automatic'}</span>{promotion.archivedAt ? <span className="text-[11px] text-signal">Archived</span> : <span className="text-[11px] text-graphite">{promotion.isActive ? 'Active' : 'Paused'}</span>}</div><p className="mt-1 text-[13px] text-graphite">{promotion.discountType === 'PERCENTAGE' ? `${promotion.percentOff}% off` : promotion.discountType === 'FIXED_AMOUNT' ? `${formatMoney(promotion.amountOff ?? '0.00')} off` : 'Free shipping'} · Min. {formatMoney(promotion.minSubtotal)} · {promotion.usageLimitTotal === null ? 'No usage cap' : `${promotion.usageLimitTotal} total uses`}</p></div><div className="flex flex-wrap gap-2"><Action variant="ghost" size="sm" onClick={onEdit} disabled={busy}><Pencil size={14} aria-hidden />Edit</Action><Action variant="outline" size="sm" onClick={() => setShowUsage(v => !v)}>{showUsage ? 'Hide usage' : 'Usage'}</Action>{!promotion.archivedAt && <><Action variant="outline" size="sm" disabled={busy} onClick={onToggle}>{promotion.isActive ? 'Pause' : 'Activate'}</Action><Action variant="ghost" size="sm" disabled={busy} onClick={onArchive}>Archive</Action></>}</div></div>{promotion.description && <p className="mt-3 text-[13px] text-graphite">{promotion.description}</p>}{showUsage && <UsageHistory id={promotion.id} />}</article>
}

function UsageHistory({ id }: { id: UUID }) { const [page, setPage] = useState(1); const usages = useAsyncResource(signal => fetchPromotionUsages(id, page, signal), [id, page]); if (usages.isLoading) return <p className="mt-4 text-sm text-graphite">Loading usage history…</p>; if (usages.error) return <FormError message={toUserMessage(usages.error)} />; return <div className="mt-4 border-t border-line pt-4"><h3 className="text-[13px] font-semibold text-ink">Usage history</h3>{usages.data?.items.length ? <ul className="mt-2 divide-y divide-line-soft text-[13px]">{usages.data.items.map(item => <li key={item.id} className="flex justify-between gap-4 py-2"><span>{item.orderNumber} · {item.user.email}</span><Money amount={item.discountAmount} currency="USD" /></li>)}</ul> : <p className="mt-2 text-sm text-graphite">No orders have used this promotion.</p>}{usages.data && <Pagination page={page} pages={usages.data.pagination.totalPages} onPage={setPage} />}</div> }

function PromotionForm({ promotion, saving, onCancel, onSave }: { promotion: Promotion | null; saving: boolean; onCancel: () => void; onSave: (input: PromotionInput) => void }) {
  const [values, setValues] = useState(() => promotion ? promotionFormValues(promotion) : emptyPromotionForm()); const [error, setError] = useState<string>(); const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues(v => ({ ...v, [key]: value }))
  const submit = (event: FormEvent) => { event.preventDefault(); const validationError = validatePromotionForm(values); if (validationError) { setError(validationError); return }; setError(undefined); onSave(buildPromotionInput(values)) }
  return <form onSubmit={submit} className="space-y-4 border border-line bg-paper p-5"><div className="flex justify-between gap-4"><h2 className="text-base font-semibold text-ink">{promotion ? 'Edit promotion' : 'New promotion'}</h2><Action type="button" variant="ghost" size="sm" onClick={onCancel}>Close</Action></div>{error && <FormError message={error} />}<div className="grid gap-4 md:grid-cols-2"><TextField name="promotion-name" label="Name" required value={values.name} onChange={e => set('name', e.target.value)} /><SelectField name="promotion-kind-form" label="Promotion type" value={values.kind} onChange={e => set('kind', e.target.value as PromotionKind)}><option value="COUPON">Coupon</option><option value="AUTOMATIC">Automatic</option></SelectField>{values.kind === 'COUPON' && <TextField name="promotion-code" label="Coupon code" required value={values.code} onChange={e => set('code', e.target.value)} />}{values.kind === 'AUTOMATIC' && <TextField name="promotion-priority" type="number" label="Priority" value={values.priority} onChange={e => set('priority', e.target.value)} />}<SelectField name="promotion-discount-form" label="Discount type" value={values.discountType} onChange={e => set('discountType', e.target.value as PromotionDiscountType)}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option><option value="FREE_SHIPPING">Free shipping</option></SelectField>{values.discountType === 'PERCENTAGE' && <TextField name="promotion-percent" type="number" step="0.01" label="Percent off" required value={values.percentOff} onChange={e => set('percentOff', e.target.value)} />}{values.discountType === 'FIXED_AMOUNT' && <TextField name="promotion-amount" type="number" step="0.01" label="Amount off" required value={values.amountOff} onChange={e => set('amountOff', e.target.value)} />}<TextField name="promotion-minimum" type="number" step="0.01" label="Minimum subtotal" value={values.minSubtotal} onChange={e => set('minSubtotal', e.target.value)} /><TextField name="promotion-max" type="number" step="0.01" label="Maximum discount" value={values.maxDiscount} onChange={e => set('maxDiscount', e.target.value)} /><TextField name="promotion-start" type="datetime-local" label="Start date" value={values.startsAt} onChange={e => set('startsAt', e.target.value)} /><TextField name="promotion-end" type="datetime-local" label="End date" value={values.endsAt} onChange={e => set('endsAt', e.target.value)} /><TextField name="promotion-total-limit" type="number" min="0" label="Global usage limit" value={values.usageLimitTotal} onChange={e => set('usageLimitTotal', e.target.value)} /><TextField name="promotion-user-limit" type="number" min="0" label="Per-user usage limit" value={values.usageLimitPerUser} onChange={e => set('usageLimitPerUser', e.target.value)} /></div><TextAreaField name="promotion-description" label="Description" value={values.description} onChange={e => set('description', e.target.value)} /><label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={values.isActive} onChange={e => set('isActive', e.target.checked)} />Active when saved</label><div className="flex gap-2"><Action type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save promotion'}</Action><Action type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Action></div></form>
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) { const last = Math.max(1, pages); return <nav aria-label="Promotion pagination" className="mt-4 flex items-center justify-end gap-3"><Action variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} />Previous</Action><span className="text-xs text-graphite">Page {page} of {last}</span><Action variant="outline" size="sm" disabled={page >= last} onClick={() => onPage(page + 1)}>Next<ChevronRight size={14} /></Action></nav> }
