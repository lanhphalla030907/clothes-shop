import type { ProductStatus } from '@/types/api'

/**
 * The two lifecycle facts a product carries, kept visibly separate so no one
 * reads "ACTIVE" as "on sale". `status` is the lifecycle position; `isActive`
 * is whether the record is enabled at all — independent columns on the server,
 * independent badges here.
 */

const statusTone: Record<ProductStatus, { pill: string; dot: string }> = {
  DRAFT: {
    pill: 'border-amber-200/80 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  ACTIVE: {
    pill: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  ARCHIVED: {
    pill: 'border-rose-200/80 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
  },
}

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => {
  const tone = statusTone[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase shadow-2xs ${tone.pill}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${tone.dot}`} />
      {status}
    </span>
  )
}

export const ProductActiveBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase shadow-2xs ${
      isActive
        ? 'border-emerald-200/70 bg-emerald-50/60 text-emerald-700'
        : 'border-line bg-bone text-graphite'
    }`}
  >
    <span
      aria-hidden
      className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-ash'}`}
    />
    {isActive ? 'Active' : 'Inactive'}
  </span>
)
