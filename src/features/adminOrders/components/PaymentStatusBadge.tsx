import { PAYMENT_STATUS, type PaymentStatus } from '@/types/api'
import { paymentStatusLabel } from '@/features/adminOrders/rules'

/**
 * The payment state as a badge.
 *
 * `null` is meaningful and distinct from every server status: no attempt has
 * been recorded. Colour is used only to separate a collected payment from a
 * failed or outstanding one.
 */
const tone: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.UNPAID]: 'border-line bg-bone text-ink',
  [PAYMENT_STATUS.PENDING]: 'border-amber-200/80 bg-amber-50 text-amber-700',
  [PAYMENT_STATUS.PAID]: 'border-emerald-200/80 bg-emerald-50 text-emerald-700',
  [PAYMENT_STATUS.FAILED]: 'border-rose-200/80 bg-rose-50 text-rose-700',
  [PAYMENT_STATUS.EXPIRED]: 'border-line bg-bone text-graphite',
}

const dot: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.UNPAID]: 'bg-ash',
  [PAYMENT_STATUS.PENDING]: 'bg-amber-500',
  [PAYMENT_STATUS.PAID]: 'bg-emerald-500',
  [PAYMENT_STATUS.FAILED]: 'bg-rose-500',
  [PAYMENT_STATUS.EXPIRED]: 'bg-ash',
}

export function PaymentStatusBadge({
  status,
  className = '',
}: {
  status: PaymentStatus | null
  className?: string
}) {
  if (status === null) {
    return (
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-bone px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-graphite shadow-2xs ${className}`}
      >
        <span className="size-1.5 rounded-full bg-ash" aria-hidden />
        No payment
      </span>
    )
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-2xs ${tone[status]} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dot[status]}`} aria-hidden />
      {paymentStatusLabel(status)}
    </span>
  )
}
