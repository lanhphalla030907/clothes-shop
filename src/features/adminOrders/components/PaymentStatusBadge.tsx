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
  [PAYMENT_STATUS.PENDING]: 'border-line bg-bone text-ink',
  [PAYMENT_STATUS.PAID]: 'border-success/25 bg-success-soft text-success',
  [PAYMENT_STATUS.FAILED]: 'border-signal/25 bg-signal-soft text-signal',
  [PAYMENT_STATUS.EXPIRED]: 'border-line bg-bone text-graphite',
}

const dot: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.UNPAID]: 'bg-ash',
  [PAYMENT_STATUS.PENDING]: 'bg-graphite',
  [PAYMENT_STATUS.PAID]: 'bg-success',
  [PAYMENT_STATUS.FAILED]: 'bg-signal',
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
        className={`inline-flex w-fit items-center gap-1.5 border border-line bg-bone px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-graphite ${className}`}
      >
        <span className="size-1.5 rounded-full bg-ash" aria-hidden />
        No payment
      </span>
    )
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${tone[status]} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dot[status]}`} aria-hidden />
      {paymentStatusLabel(status)}
    </span>
  )
}
