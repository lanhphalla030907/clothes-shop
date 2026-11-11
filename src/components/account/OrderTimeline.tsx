import { Check, Clock, Package, Truck, CheckCircle2, AlertCircle, MapPin } from 'lucide-react'
import { ORDER_STATUS, type OrderStatus } from '@/types/api'

type OrderTimelineProps = {
  status: OrderStatus
  paymentMethod: string | null
  createdAt: string
  updatedAt?: string
  shippingProviderName?: string | null
}

const formatTimelineDate = (isoString: string): string => {
  try {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function OrderTimeline({
  status,
  paymentMethod,
  createdAt,
  updatedAt,
  shippingProviderName,
}: OrderTimelineProps) {
  const isCancelled = status === ORDER_STATUS.CANCELLED

  if (isCancelled) {
    return (
      <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700">
            <AlertCircle size={18} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-rose-900">Order Cancelled</h3>
              {updatedAt && (
                <span className="font-mono text-xs text-rose-700/80">
                  {formatTimelineDate(updatedAt)}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-rose-800">
              This order was cancelled and its fulfillment was stopped. Any reserved stock has been
              released.
            </p>
          </div>
        </div>

        {/* Minimal 2-step cancelled audit */}
        <div className="mt-5 border-t border-rose-200/60 pt-4">
          <div className="flex items-center gap-6 text-xs text-graphite">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Placed: {formatTimelineDate(createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-rose-500" />
              <span>State: Order Terminated</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Lifecycle progression rank
  const rankMap: Record<OrderStatus, number> = {
    [ORDER_STATUS.PENDING]: 1,
    [ORDER_STATUS.CONFIRMED]: 2,
    [ORDER_STATUS.PROCESSING]: 3,
    [ORDER_STATUS.SHIPPED]: 4,
    [ORDER_STATUS.DELIVERED]: 6,
    [ORDER_STATUS.CANCELLED]: 0,
  }

  const currentRank = rankMap[status] ?? 1

  // 6 Milestones defined in requirements:
  // Using distinctive labels so as not to collide with single-word StatusBadge elements.
  const steps = [
    {
      id: 'placed',
      rank: 1,
      title: 'Order Placed',
      description: 'Order received and recorded',
      timestamp: formatTimelineDate(createdAt),
      icon: Clock,
      isCompleted: currentRank > 1,
      isCurrent: currentRank === 1,
    },
    {
      id: 'confirmed',
      rank: 2,
      title: 'Order Confirmed',
      description:
        paymentMethod === 'COD'
          ? 'Confirmed by studio (COD)'
          : paymentMethod === 'ABA_PAYWAY' || paymentMethod === null
            ? 'Payment verified'
            : 'Order confirmed',
      timestamp: null, // Strictly no fabricated timestamps
      icon: Check,
      isCompleted: currentRank > 2,
      isCurrent: currentRank === 2,
    },
    {
      id: 'processing',
      rank: 3,
      title: 'Processing',
      description: 'Picking & packaging items',
      timestamp: null,
      icon: Package,
      isCompleted: currentRank > 3,
      isCurrent: currentRank === 3,
    },
    {
      id: 'shipped',
      rank: 4,
      title: 'Shipped / In Transit',
      description: shippingProviderName
        ? `Carrier: ${shippingProviderName}`
        : 'Dispatched in transit',
      timestamp: null,
      icon: Truck,
      isCompleted: currentRank > 4,
      isCurrent: currentRank === 4,
    },
    {
      id: 'out_for_delivery',
      rank: 5,
      title: 'Out for Delivery',
      description: currentRank >= 6 ? 'Delivered with courier' : 'Local courier dispatch',
      timestamp: null,
      icon: MapPin,
      // Strictly: SHIPPED does NOT automatically mean out for delivery
      isCompleted: currentRank >= 6,
      isCurrent: false,
    },
    {
      id: 'delivered',
      rank: 6,
      title: 'Order Delivered',
      description: currentRank === 6 ? 'Package received' : 'Final delivery',
      timestamp: null,
      icon: CheckCircle2,
      isCompleted: currentRank === 6,
      isCurrent: currentRank === 6,
    },
  ]

  return (
    <div className="rounded-xl border border-line bg-paper-pure p-5 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Order Progress</h2>
          <p className="mt-0.5 text-[12px] text-graphite">
            Current stage:{' '}
            <span className="font-medium text-ink">
              {status === ORDER_STATUS.PENDING
                ? 'Order Placed (Awaiting confirmation)'
                : status === ORDER_STATUS.CONFIRMED
                  ? 'Order Confirmed'
                  : status === ORDER_STATUS.PROCESSING
                    ? 'Processing'
                    : status === ORDER_STATUS.SHIPPED
                      ? 'Shipped / In Transit'
                      : status === ORDER_STATUS.DELIVERED
                        ? 'Order Delivered'
                        : status}
            </span>
          </p>
        </div>
        <span className="font-mono text-[11px] text-graphite">
          Placed: {formatTimelineDate(createdAt)}
        </span>
      </div>

      {/* Desktop / Tablet Timeline (horizontal) */}
      <div className="hidden pt-6 pb-2 md:block">
        <ol role="list" aria-label="Order progress" className="grid grid-cols-6 gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = step.isCompleted
            const isCurrent = step.isCurrent

            return (
              <li
                key={step.id}
                aria-current={isCurrent ? 'step' : undefined}
                className="relative flex flex-col items-center text-center"
              >
                {/* Horizontal connector line */}
                {index < steps.length - 1 && (
                  <div
                    aria-hidden
                    className={`absolute top-4 left-1/2 -z-0 h-0.5 w-full ${
                      isCompleted ? 'bg-ink' : 'border-t border-dashed border-line'
                    }`}
                  />
                )}

                {/* Node icon */}
                <div
                  className={`relative z-10 grid size-8 place-items-center rounded-full text-xs font-semibold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-ink text-paper shadow-2xs'
                      : isCurrent
                        ? 'border-2 border-ink bg-paper-pure text-ink ring-4 ring-ink/10'
                        : 'border border-line bg-canvas text-ash'
                  }`}
                >
                  <Icon size={14} strokeWidth={isCompleted ? 2.2 : 1.8} aria-hidden />
                </div>

                {/* Content */}
                <div className="mt-3 px-1">
                  <p
                    className={`text-[12.5px] leading-tight font-medium ${
                      isCurrent
                        ? 'font-semibold text-ink'
                        : isCompleted
                          ? 'text-ink'
                          : 'text-graphite/70'
                    }`}
                  >
                    {step.title}
                  </p>
                  {step.timestamp && (
                    <p className="mt-1 font-mono text-[10.5px] text-graphite">{step.timestamp}</p>
                  )}
                  <p className="mt-1 text-[11px] leading-tight text-graphite/80 line-clamp-2">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Mobile Timeline (vertical) */}
      <div className="pt-5 md:hidden">
        <ol role="list" aria-label="Order progress" className="relative space-y-5">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isCompleted = step.isCompleted
            const isCurrent = step.isCurrent

            return (
              <li
                key={step.id}
                aria-current={isCurrent ? 'step' : undefined}
                className="relative flex items-start gap-3.5"
              >
                {/* Vertical connector line */}
                {index < steps.length - 1 && (
                  <div
                    aria-hidden
                    className={`absolute top-8 left-4 -z-0 h-full w-0.5 -translate-x-1/2 ${
                      isCompleted ? 'bg-ink' : 'border-l border-dashed border-line'
                    }`}
                  />
                )}

                {/* Node icon */}
                <div
                  className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    isCompleted
                      ? 'bg-ink text-paper'
                      : isCurrent
                        ? 'border-2 border-ink bg-paper-pure text-ink ring-4 ring-ink/10'
                        : 'border border-line bg-canvas text-ash'
                  }`}
                >
                  <Icon size={14} strokeWidth={isCompleted ? 2.2 : 1.8} aria-hidden />
                </div>

                {/* Step details */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <p
                      className={`text-[13px] font-medium ${
                        isCurrent
                          ? 'font-semibold text-ink'
                          : isCompleted
                            ? 'text-ink'
                            : 'text-graphite/70'
                      }`}
                    >
                      {step.title}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-bone px-2 py-0.5 text-[10.5px] font-medium text-ink">
                        Current
                      </span>
                    )}
                  </div>
                  {step.timestamp && (
                    <p className="font-mono text-[11px] text-graphite">{step.timestamp}</p>
                  )}
                  <p className="mt-0.5 text-[12px] leading-relaxed text-graphite">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
