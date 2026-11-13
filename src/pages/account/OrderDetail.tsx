import { useEffect } from 'react'
import { useLocation, useParams, Link } from 'react-router-dom'
import { ArrowLeft, XCircle, CreditCard, ShieldCheck, Truck, Package, Clock } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { BackLink, PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, StatusBadge } from '@/components/account/Bits'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard, Skeleton } from '@/components/account/Skeleton'
import { OrderTimeline } from '@/components/account/OrderTimeline'
import { cancelOrder, downloadReceipt } from '@/features/orders/api'
import { canCancelCustomerOrder } from '@/features/orders/rules'
import { useOrder } from '@/features/orders/useOrders'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { formatOrderAddressLines, ORDER_STATUS, PAYABLE_ORDER_STATUS } from '@/types/api'
import { toUserMessage } from '@/lib/api/errors'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const order = useOrder(id)
  const location = useLocation()
  const { showFeedback, confirmFeedback } = useFeedback()
  const detailState = location.state as { justPlaced?: boolean; justPaid?: boolean } | null
  const justPlaced = detailState?.justPlaced === true
  const justPaid = detailState?.justPaid === true
  const { refetch: refetchOrder } = order

  const downloadMutation = useMutation((orderId: string) => downloadReceipt(orderId), {
    onError: (error) => {
      showFeedback({
        type: 'error',
        title: 'Receipt not downloaded',
        message: toUserMessage(error),
      })
    },
  })

  const cancelMutation = useMutation((orderId: string) => cancelOrder(orderId), {
    onSuccess: () => {
      refetchOrder()
      showFeedback({
        type: 'success',
        title: 'Order cancelled',
        message: 'The order is cancelled and its reserved stock has been released.',
      })
    },
    onError: (error) => {
      showFeedback({
        type: 'error',
        title: 'Order not cancelled',
        message: toUserMessage(error),
      })
    },
  })

  useEffect(() => {
    if (!order.data) return undefined

    if (order.data.status !== PAYABLE_ORDER_STATUS) return undefined

    const timer = window.setInterval(() => {
      void refetchOrder()
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [order.data, refetchOrder])

  if (order.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <SkeletonCard rows={4} />
        <SkeletonCard rows={2} />
      </div>
    )
  }

  if (order.error) {
    return (
      <div className="space-y-6">
        <BackLink to="/account/orders">All orders</BackLink>
        <ErrorState message={toUserMessage(order.error)} onRetry={order.refetch} />
      </div>
    )
  }

  if (!order.data) {
    return (
      <div className="space-y-6">
        <BackLink to="/account/orders">All orders</BackLink>
        <EmptyState
          eyebrow="Not found"
          title="We could not open that order"
          description="It may belong to another account, or the link may be wrong."
          action={
            <Action to="/account/orders" size="sm">
              Back to orders
            </Action>
          }
        />
      </div>
    )
  }

  const { data } = order
  const cancelAllowed = canCancelCustomerOrder(data)
  const cancelBusy = cancelMutation.isPending || order.isRefreshing

  const requestDownload = async () => {
    const blob = await downloadMutation.run(data.id)
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `receipt-${data.orderNumber}.pdf`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const requestCancel = async () => {
    if (!cancelAllowed || cancelBusy) return

    const confirmed = await confirmFeedback({
      type: 'warning',
      title: 'Cancel this order?',
      message: `Cancel ${data.orderNumber}? Its reserved stock will be released and the order cannot be resumed.`,
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
    })
    if (!confirmed) return

    await cancelMutation.run(data.id)
  }

  const formattedDate = new Date(data.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  // `justPaid` is a one-shot navigation state set by the PayWay screen. Only
  // honour it while the order is actually in a post-payment state, so a later
  // cancellation cannot leave a stale "Payment received" banner on the page.
  const showPaymentReceived =
    data.status === ORDER_STATUS.CONFIRMED ||
    (justPaid && data.status !== ORDER_STATUS.PENDING && data.status !== ORDER_STATUS.CANCELLED)

  return (
    <div className="space-y-8">
      {/* Top Navigation */}
      <BackLink to="/account/orders">All orders</BackLink>

      {/* Header section with actions */}
      <PageHeader
        eyebrow="Order"
        title={data.orderNumber}
        description={`Placed ${formattedDate}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            <Action
              variant="outline"
              size="sm"
              disabled={downloadMutation.isPending}
              onClick={() => void requestDownload()}
            >
              {downloadMutation.isPending ? 'Downloading receipt…' : 'Download receipt'}
            </Action>
          </div>
        }
      />

      {downloadMutation.error !== undefined && (
        <InlineNotice
          message={toUserMessage(downloadMutation.error)}
          onDismiss={downloadMutation.reset}
        />
      )}

      {/* Status Alert Banner */}
      {showPaymentReceived ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-5 text-sm leading-relaxed text-ink"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" />
            <div>
              <p className="font-semibold text-emerald-900">
                {data.paymentMethod === 'ABA_PAYWAY' || data.paymentMethod === null
                  ? 'Payment received.'
                  : 'Order confirmed.'}
              </p>
              <p className="mt-1 text-emerald-800">
                {data.paymentMethod === 'COD'
                  ? 'This order uses Cash on Delivery. Payment collection has not been recorded here. Everything below is the order record.'
                  : data.paymentMethod !== 'ABA_PAYWAY' && data.paymentMethod !== null
                    ? 'The studio has accepted this order, but this page cannot confirm payment for its unsupported payment method.'
                    : 'PayWay confirmed the payment and the studio has accepted this order. Everything below is the record it now holds.'}
              </p>
            </div>
          </div>
        </div>
      ) : justPlaced ? (
        <div
          role="status"
          className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-5 text-sm leading-relaxed text-ink"
        >
          <div className="flex items-start gap-3">
            <Clock size={18} className="mt-0.5 shrink-0 text-blue-700" />
            <div>
              <p className="font-semibold text-blue-900">Your order is placed.</p>
              <p className="mt-1 text-blue-800">
                {data.paymentMethod === 'COD'
                  ? 'This order was created with Cash on Delivery. Payment has not yet been collected. The address below is the copy stored with the order.'
                  : data.paymentMethod !== 'ABA_PAYWAY' && data.paymentMethod !== null
                    ? 'The order was created, but its payment method is not supported on this page. No payment has been started. The address below is the copy stored with the order.'
                    : 'Nothing has been charged yet — it stays pending until it is paid for. The address below is the copy stored with the order.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Visual Order Progress Timeline */}
      <OrderTimeline
        status={data.status}
        paymentMethod={data.paymentMethod}
        createdAt={data.createdAt}
        updatedAt={data.updatedAt}
        shippingProviderName={data.shippingProviderName}
      />

      {/* Two-column Layout: Left = Items & Summary, Right = Details & Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Items and Cost Summary */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items Card */}
          <Panel>
            <PanelHeader
              title={`${data.items.length} ${data.items.length === 1 ? 'item' : 'items'}`}
              hint={`${data.itemCount} total units`}
            />

            <ul className="divide-y divide-line-soft">
              {data.items.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-col gap-4 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    {/* Visual Placeholder / Garment Badge */}
                    <div className="grid size-14 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-graphite">
                      <Package size={22} strokeWidth={1.5} aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-ink">{line.productName}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-graphite">SKU: {line.sku}</p>

                      {line.variantOptionsSnapshot.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {line.variantOptionsSnapshot.map((option) => (
                            <span
                              key={`${option.optionName}-${option.optionValue}`}
                              className="rounded-md border border-line bg-bone/70 px-2 py-0.5 text-[11.5px] font-medium text-graphite"
                            >
                              {option.optionName}: {option.optionValue}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="mt-2 text-xs text-graphite">
                        Qty {line.quantity} × <Money amount={line.unitPrice} currency={data.currency} />
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <Money
                      amount={line.lineTotal}
                      currency={data.currency}
                      className="font-mono text-[15px] font-semibold"
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* Financial Summary Breakdown */}
            <dl className="border-t border-line bg-canvas/30 px-6 py-5">
              <DefinitionRow label="Subtotal">
                <Money amount={data.subtotal} currency={data.currency} className="font-mono" />
              </DefinitionRow>

              <DefinitionRow label="Shipping">
                {data.shippingFee === '0.00' ? (
                  <span className="font-medium text-emerald-700">Free</span>
                ) : (
                  <Money amount={data.shippingFee} currency={data.currency} className="font-mono" />
                )}
              </DefinitionRow>

              {data.discountAmount !== '0.00' && (
                <DefinitionRow label="Discount">
                  <div className="flex items-center justify-end gap-2">
                    {data.couponCode && (
                      <span className="rounded-md border border-line bg-bone px-1.5 py-0.5 font-mono text-[11px] font-semibold text-graphite">
                        {data.couponCode}
                      </span>
                    )}
                    <span className="font-mono text-emerald-700">
                      -<Money amount={data.discountAmount} currency={data.currency} />
                    </span>
                  </div>
                </DefinitionRow>
              )}

              <DefinitionRow label="Total">
                <Money amount={data.totalAmount} currency={data.currency} emphasis="total" />
              </DefinitionRow>
            </dl>
          </Panel>
        </div>

        {/* Right Column: Address, Payment, Carrier, Actions */}
        <div className="space-y-6">
          {/* Shipping Address Snapshot Card */}
          <Panel>
            <PanelHeader
              title="Delivering to"
              hint="Snapshot recorded when order was placed."
            />
            <div className="p-5 sm:p-6">
              <address className="space-y-1 text-[13.5px] not-italic leading-relaxed text-graphite">
                <p className="font-semibold text-ink">{data.shippingRecipientName}</p>
                <p className="font-mono text-xs">{data.shippingPhone}</p>
                <div className="pt-2 text-graphite">
                  {formatOrderAddressLines(data).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </div>
              </address>
            </div>
          </Panel>

          {/* Delivery & Carrier Info (when provided by API) */}
          {(data.shippingProviderName || data.codAreaName) && (
            <Panel>
              <PanelHeader title="Delivery Details" />
              <div className="space-y-3 p-5 sm:p-6 text-[13px]">
                {data.shippingProviderName && (
                  <div className="flex items-center gap-2.5">
                    <Truck size={16} className="text-graphite shrink-0" />
                    <div>
                      <p className="font-medium text-ink">Carrier</p>
                      <p className="text-graphite">{data.shippingProviderName}</p>
                    </div>
                  </div>
                )}
                {data.codAreaName && (
                  <div className="border-t border-line-soft pt-2">
                    <p className="font-medium text-ink">Delivery Area</p>
                    <p className="text-graphite">{data.codAreaName}</p>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Payment Method & Status Card */}
          <Panel className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-graphite" />
              <p className="eyebrow text-ink">Payment</p>
            </div>

            {data.status === 'PENDING' ? (
              <div className="mt-3">
                {data.paymentMethod === 'COD' ? (
                  <>
                    <p className="text-[13.5px] font-semibold text-ink">Cash on Delivery</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-graphite">
                      This order was created with Cash on Delivery. Payment has not yet been collected.
                    </p>
                  </>
                ) : data.paymentMethod !== 'ABA_PAYWAY' && data.paymentMethod !== null ? (
                  <>
                    <p className="text-[13.5px] font-semibold text-ink">Payment method unavailable</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-graphite">
                      This order uses a payment method this page cannot process. No PayWay payment was
                      started. Please contact the studio for help.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[13.5px] font-semibold text-ink">Awaiting payment</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-graphite">
                      This order has not been paid yet. The payment screen issues an ABA PayWay QR for
                      it — the code expires, so a new one is needed after a while.
                    </p>
                    <Action
                      to={`/account/checkout/${data.id}`}
                      size="sm"
                      className="mt-5 w-full"
                      withArrow
                    >
                      Pay this order
                    </Action>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-3 text-[13px] leading-relaxed text-graphite">
                <p className="font-medium text-ink">
                  {data.paymentMethod === 'COD'
                    ? 'Cash on Delivery (COD)'
                    : data.paymentMethod === 'ABA_PAYWAY'
                      ? 'ABA PayWay'
                      : data.paymentMethod ?? 'Standard Checkout'}
                </p>
                <p className="mt-1">
                  {data.paymentMethod === 'COD'
                    ? 'Cash is settled upon parcel delivery with the authorized courier.'
                    : 'Payment captured and verified by payment gateway.'}
                </p>
              </div>
            )}
          </Panel>

          {/* Cancellation Affordance Card */}
          {cancelAllowed && (
            <Panel className="p-5 sm:p-6">
              <p className="eyebrow text-ink">Need to cancel?</p>
              <p className="mt-2 text-[13px] leading-relaxed text-graphite">
                You can cancel while the order is pending and unpaid. Its reserved stock will be
                released. The studio checks the order and payment again before cancelling.
              </p>
              <Action
                variant="outline"
                size="sm"
                className="mt-5 w-full"
                disabled={cancelBusy}
                onClick={() => void requestCancel()}
              >
                <XCircle size={15} strokeWidth={1.7} aria-hidden />
                {cancelMutation.isPending ? 'Cancelling' : 'Cancel this order'}
              </Action>

              {cancelMutation.error !== undefined && (
                <InlineNotice
                  className="mt-4"
                  message={toUserMessage(cancelMutation.error)}
                  onDismiss={cancelMutation.reset}
                />
              )}
            </Panel>
          )}

          <div className="pt-2 text-center sm:text-left">
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
            >
              <ArrowLeft size={13} strokeWidth={1.8} aria-hidden />
              Back to all orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
