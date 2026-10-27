import type { ProductStatus } from '@/types/api'

/**
 * The two lifecycle facts a product carries, kept visibly separate so no one
 * reads "ACTIVE" as "on sale". `status` is the lifecycle position; `isActive`
 * is whether the record is enabled at all — independent columns on the server,
 * independent badges here.
 */

const statusTone: Record<ProductStatus, string> = {
  DRAFT: 'border-ink/20 bg-bone text-ink',
  ACTIVE: 'border-line bg-ink text-paper',
  ARCHIVED: 'border-signal/30 bg-signal-soft text-signal',
}

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => (
  <span className={`label-micro inline-flex h-7 items-center border px-3 ${statusTone[status]}`}>
    {status}
  </span>
)

export const ProductActiveBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`label-micro inline-flex h-7 items-center border px-3 ${
      isActive ? 'border-line bg-bone text-ink' : 'border-line bg-bone/60 text-ash'
    }`}
  >
    {isActive ? 'Active' : 'Inactive'}
  </span>
)