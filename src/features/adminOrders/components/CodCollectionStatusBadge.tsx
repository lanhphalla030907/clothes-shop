import type { CodCollectionStatus } from '@/types/api'
import { codCollectionStatusLabel } from '@/features/adminOrders/rules'

/**
 * The COD collection state as a badge.
 *
 * `null` means the order is unrelated to COD, so rendering nothing is safer than
 * implying cash was or was not collected. `NOT_COLLECTED` is only used for a COD
 * order that has no `cod_collections` row.
 */
const tone: Record<CodCollectionStatus, string> = {
  COLLECTED: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  NOT_COLLECTED: 'border-line bg-bone text-graphite',
}

const dot: Record<CodCollectionStatus, string> = {
  COLLECTED: 'bg-emerald-500',
  NOT_COLLECTED: 'bg-ash',
}

export function CodCollectionStatusBadge({
  status,
  className = '',
}: {
  status: CodCollectionStatus | null
  className?: string
}) {
  if (status === null) return null

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-2xs ${tone[status]} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dot[status]}`} aria-hidden />
      {codCollectionStatusLabel(status)}
    </span>
  )
}
