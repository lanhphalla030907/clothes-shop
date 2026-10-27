import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, ExternalLink, QrCode, RefreshCw } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { BackLink, PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, StatusBadge } from '@/components/account/Bits'
import { FormError } from '@/components/account/Field'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { Skeleton, SkeletonCard } from '@/components/account/Skeleton'
import { useOrder } from '@/features/orders/useOrders'
import { isProviderUnavailable } from './api'
import { formatCountdown, usePayment } from './usePayment'
import { toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import {
  ORDER_STATUS,
  PAYABLE_ORDER_STATUS,
  PAYMENT_STATUS,
  formatOrderAddressLines,
  type Order,
  type OrderStatus,
  type Payment,
  type UUID,
} from '@/types/api'

/**
 * The ABA PayWay screen for one order, at `/dashboard/checkout/:orderId`.
 *
 * There is no payment-status endpoint, and an order carries no payment list. What
 * PayWay's verified callback moves is `orders.status`, out of `PENDING` into
 * `CONFIRMED` — so this page creates the QR, re-reads the order, and renders
 * whatever the server says. Nothing concludes money moved because a QR was shown.
 */

/** Conservative: PayWay callbacks arrive well inside this. */
const POLL_INTERVAL_MS = 10_000
/** Long enough to read "payment received" before the receipt takes over. */
const SUCCESS_PAUSE_MS = 1_600

const PROVIDER_DOWN_COPY =
  'Payments are unavailable right now. The studio has not got its PayWay account answering, so no payment can be taken. Your order is saved — try again shortly.'

export const PaymentForOrder = ({ orderId }: { orderId: UUID }) => {
  const navigate = useNavigate()
  const order = useOrder(orderId)
  const data = order.data
  const { refetch: refetchOrder, isRefreshing } = order

  // Auto-adopt once the order is known payable: the endpoint replays the pending
  // attempt, so a refresh recovers the payment instead of losing it.
  const isPayable = data?.status === PAYABLE_ORDER_STATUS
  const flow = usePayment(orderId, isPayable === true)

const previousStatus = useRef<OrderStatus | undefined>(undefined)
  useEffect(() => {
    if (!data) return undefined

    const before = previousStatus.current
    previousStatus.current = data.status
    if (before !== PAYABLE_ORDER_STATUS || data.status === PAYABLE_ORDER_STATUS) return undefined

    // Only a move to a real order state is a payment being confirmed. A cancelled
    // order is not money received, and must never be announced as one.
    if (data.status === ORDER_STATUS.CANCELLED) return undefined

    const timer = window.setTimeout(() => {
      navigate(`/dashboard/orders/${data.id}`, { replace: true, state: { justPaid: true } })
    }, SUCCESS_PAUSE_MS)
    return () => window.clearInterval(timer)
  }, [data, navigate])

  // Poll the order, and only while there is a live QR that could still be paid.
  // Cleanup covers a terminal status, an expiry, and unmount. `refetchOrder` rather
  // than `order`: the countdown ticks once a second, and depending on the resource
  // object would rebuild this interval every tick and it would never fire.
  useEffect(() => {
    if (!isPayable || !flow.isScannable) return undefined

    const timer = window.setInterval(() => refetchOrder(), POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [isPayable, flow.isScannable, refetchOrder])

  if (order.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Order" title="Payment" />
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (order.error) {
    return (
      <div className="space-y-8">
        <BackLink to="/dashboard/orders">All orders</BackLink>
        <PageHeader eyebrow="Order" title="Payment" />
        <ErrorState message={toUserMessage(order.error)} onRetry={order.refetch} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <BackLink to="/dashboard/orders">All orders</BackLink>
        <PageHeader eyebrow="Order" title="Payment" />
        <EmptyState
          eyebrow="Not found"
          title="We could not open that order"
          description="It may belong to another account, or the link may be wrong."
          action={
            <Action to="/dashboard/orders" size="sm">
              Back to orders
            </Action>
          }
        />
      </div>
    )
  }

  const isCancelled = data.status === ORDER_STATUS.CANCELLED

  return (
    <div className="space-y-8">
      <BackLink to="/dashboard/orders">All orders</BackLink>

      <PageHeader
        eyebrow="Order"
        title={isPayable ? `Pay ${data.orderNumber}` : data.orderNumber}
        description={
          isPayable
            ? `${formatOrderAddressLines(data)[0] ?? ''} — a total of ${formatMoney(
                data.totalAmount,
                data.currency,
              )}.`
            : undefined
        }
        action={<StatusBadge status={data.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={isPayable ? 'Pay with ABA PayWay' : 'Payment'}
            hint={
              isPayable
                ? 'Scan the code with a Cambodian banking app. Nothing is charged until you confirm in the app.'
                : undefined
            }
          />

          <div className="p-6">
            {!isPayable ? (
              <SettledPanel order={data} isCancelled={isCancelled} />
            ) : (
              <PaywayPanel
                order={data}
                flow={flow}
                isRefreshingOrder={isRefreshing}
                onRefreshOrder={refetchOrder}
              />
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Order total" />
          <dl className="px-6 py-5">
            <DefinitionRow label="Items">
              {data.itemCount} across {data.items.length}{' '}
              {data.items.length === 1 ? 'line' : 'lines'}
            </DefinitionRow>
            <DefinitionRow label="Shipping">{formatMoney(data.shippingFee, data.currency)}</DefinitionRow>
            <DefinitionRow label="Total">
              <Money amount={data.totalAmount} currency={data.currency} emphasis="total" />
            </DefinitionRow>
          </dl>
          <div className="border-t border-line px-6 py-5">
            <Action to={`/dashboard/orders/${data.id}`} variant="outline" size="sm" className="w-full">
              View order
            </Action>
          </div>
        </Panel>
      </div>
    </div>
  )
}

/** The order is out of `PENDING`, so the API is no longer willing to take a payment. */
const SettledPanel = ({ order, isCancelled }: { order: Order; isCancelled: boolean }) => (
  <div>
    <p className="label-micro text-ink">{isCancelled ? 'Order closed' : 'Payment received'}</p>
    <p className="mt-4 text-sm leading-relaxed text-graphite">
      {isCancelled
        ? `Order ${order.orderNumber} was cancelled, so it is no longer waiting for a payment.`
        : `Order ${order.orderNumber} is ${order.status.toLowerCase()} and is no longer waiting for a payment. PayWay confirmed it — the studio now holds the money.`}
    </p>
    <Action to={`/dashboard/orders/${order.id}`} className="mt-6" withArrow>
      View order {order.orderNumber}
    </Action>
  </div>
)

type PaywayPanelProps = {
  order: Order
  flow: ReturnType<typeof usePayment>
  isRefreshingOrder: boolean
  onRefreshOrder: () => void
}

const PaywayPanel = ({ order, flow, isRefreshingOrder, onRefreshOrder }: PaywayPanelProps) => {
  const [copied, setCopied] = useState(false)

  if (flow.error !== undefined) {
    return (
      <div>
        <FormError
          message={isProviderUnavailable(flow.error) ? PROVIDER_DOWN_COPY : toUserMessage(flow.error)}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Action size="sm" disabled={flow.isStarting} onClick={() => void flow.start()}>
            {flow.isStarting ? 'Asking for a QR' : 'Try again'}
          </Action>
          <Action size="sm" variant="outline" onClick={onRefreshOrder}>
            Check the order
          </Action>
        </div>
      </div>
    )
  }

  if (!flow.payment) {
    return flow.isStarting ? (
      <QrPending />
    ) : (
      <div className="py-8 text-center">
        <QrCode size={26} strokeWidth={1.2} aria-hidden className="mx-auto text-ash" />
        <p className="mt-5 text-sm leading-relaxed text-graphite">
          Asking for a QR creates a payment attempt against this order. The amount is the order's
          own total — it cannot be changed from here.
        </p>
        <Action className="mt-6" disabled={flow.isStarting} onClick={() => void flow.start()}>
          Show the QR code
        </Action>
      </div>
    )
  }

  const { payment } = flow

  if (payment.status === PAYMENT_STATUS.PAID) {
    return (
      <div>
        <PaymentBadge status={payment.status} />
        <p className="mt-4 text-sm leading-relaxed text-graphite">
          PayWay confirms this payment was collected for order {order.orderNumber}. Nothing further
          is needed here.
        </p>
        <Action to={`/dashboard/orders/${order.id}`} className="mt-6" withArrow>
          View order {order.orderNumber}
        </Action>
      </div>
    )
  }

  if (payment.status === PAYMENT_STATUS.FAILED) {
    return (
      <div>
        <PaymentBadge status={payment.status} />
        <p className="mt-4 text-sm leading-relaxed text-graphite">
          This attempt was refused, so no money was taken. Asking again opens a new attempt for the
          same order.
        </p>
        <Action
          className="mt-6"
          disabled={flow.isStarting}
          onClick={() => void flow.start()}
          withArrow
        >
          {flow.isStarting ? 'Asking for a new code' : 'Try paying again'}
        </Action>
      </div>
    )
  }

  if (flow.isExpired) {
    return (
      <div>
        <PaymentBadge status={PAYMENT_STATUS.EXPIRED} />
        <p className="mt-4 text-sm leading-relaxed text-graphite">
          This code has expired. PayWay stops accepting it when its own time runs out, so it cannot
          be scanned any more.
        </p>

        {flow.replayedExpired && (
          <InlineNotice
            tone="info"
            className="mt-4"
            message="The provider returned that same expired code for this order. Your order is still waiting to be paid — try again in a few minutes, or contact the studio."
          />
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Action disabled={flow.isStarting} onClick={() => void flow.start()}>
            {flow.isStarting ? 'Asking for a new code' : 'Get a new code'}
          </Action>
          <Action variant="outline" onClick={onRefreshOrder}>
            Check the order
          </Action>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-8 sm:grid-cols-[auto_1fr]">
      <PaywayQr payment={payment} onCopy={() => setCopied(true)} copied={copied} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <PaymentBadge status={payment.status} />
          <span className="label-micro text-graphite" role="status">
            Waiting for payment
          </span>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="label-micro text-ash">Amount</dt>
            <dd className="font-mono text-ink">{formatMoney(payment.amount, order.currency)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="label-micro text-ash">Reference</dt>
            <dd className="font-mono text-xs text-ink">{payment.transactionId}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="label-micro text-ash">Expires in</dt>
            <dd className="font-mono tabular-nums text-ink">
              {formatCountdown(flow.secondsRemaining)}
            </dd>
          </div>
        </dl>

        <ol className="mt-6 space-y-2 border border-line bg-bone px-4 py-4 text-sm leading-relaxed text-graphite">
          <li>1. Open your ABA app, or any Cambodian banking app.</li>
          <li>2. Choose Scan to Pay, then scan this code.</li>
          <li>3. Check the amount matches {formatMoney(payment.amount, order.currency)}, and confirm.</li>
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {payment.abapayDeeplink && (
            <a
              href={payment.abapayDeeplink}
              className="label-micro inline-flex items-center gap-2 border border-line px-4 py-3 text-ink transition-colors duration-200 hover:border-ink"
            >
              <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
              Open ABA Mobile
            </a>
          )}
          <Action
            size="sm"
            variant="outline"
            onClick={onRefreshOrder}
            disabled={isRefreshingOrder}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw size={12} strokeWidth={1.5} aria-hidden />
            {isRefreshingOrder ? 'Checking' : 'Check status'}
          </Action>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-graphite">
          This API has no payment-status endpoint, so the page watches the order instead: PayWay's
          callback is what moves it, and that is the only signal worth trusting.
        </p>
      </div>
    </div>
  )
}

/** Waiting on PayWay itself — the provider call is the slow part. */
const QrPending = () => (
  <div className="py-8 text-center">
    <QrCode size={26} strokeWidth={1.2} aria-hidden className="mx-auto text-ash" />
    <p className="mt-5 text-sm leading-relaxed text-graphite">Asking PayWay for a QR code…</p>
    <Skeleton className="mx-auto mt-6 h-64 w-64" />
  </div>
)

const PaywayQr = ({
  payment,
  copied,
  onCopy,
}: {
  payment: Payment
  copied: boolean
  onCopy: () => void
}) => {
  const [imageBroken, setImageBroken] = useState(false)
  const showImage = Boolean(payment.qrImage) && !imageBroken

  return (
    <div className="mx-auto w-full max-w-64">
      <div className="border border-line bg-paper-pure p-4">
        {showImage ? (
          <img
            src={payment.qrImage}
            alt="ABA PayWay QR code for this payment"
            width={256}
            height={256}
            className="size-full"
            onError={() => setImageBroken(true)}
          />
        ) : (
          // No usable image means the payload string is all there is. Rendering it as
          // text is honest; drawing our own QR would mean reimplementing the
          // payload spec, which is not something to guess at in a payment screen.
          <div className="grid aspect-square place-items-center bg-bone p-4 text-center">
            <p className="text-xs leading-relaxed text-graphite">
              PayWay did not return a usable QR image. Use the payload below instead.
            </p>
          </div>
        )}
      </div>

      {payment.qrString && (
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(payment.qrString)
              .then(onCopy)
              .catch(() => setImageBroken(true))
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 border border-line py-2.5 text-xs text-graphite transition-colors duration-200 hover:border-ink hover:text-ink"
        >
          {copied ? (
            <Check size={12} strokeWidth={2} aria-hidden />
          ) : (
            <Copy size={12} strokeWidth={1.5} aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy the payload'}
        </button>
      )}
    </div>
  )
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  [PAYMENT_STATUS.PENDING]: 'Waiting',
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.EXPIRED]: 'Expired',
}

const PaymentBadge = ({ status }: { status: Payment['status'] }) => (
  <span
    className={`label-micro inline-flex h-7 items-center border px-3 ${
      status === PAYMENT_STATUS.PAID
        ? 'border-ink/20 bg-ink text-paper'
        : 'border-ink/20 bg-bone text-ink'
    }`}
  >
    {PAYMENT_STATUS_LABEL[status] ?? status}
  </span>
)