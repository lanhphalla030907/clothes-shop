import { useEffect } from 'react'
import { useLocation, useParams, Link } from 'react-router-dom'
import { XCircle } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { BackLink, PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, StatusBadge } from '@/components/account/Bits'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard, Skeleton } from '@/components/account/Skeleton'
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
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced === true
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
        <BackLink to="/dashboard/orders">All orders</BackLink>
        {/* A 404 here is deliberately ambiguous — the API cannot tell a shopper
            whether an order is absent or simply not theirs — so the copy does not
            claim it was deleted. */}
        <ErrorState message={toUserMessage(order.error)} onRetry={order.refetch} />
      </div>
    )
  }

  if (!order.data) {
    return (
      <div className="space-y-6">
        <BackLink to="/dashboard/orders">All orders</BackLink>
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

  return (
    <div className="space-y-8">
      <BackLink to="/dashboard/orders">All orders</BackLink>

      <PageHeader
        eyebrow="Order"
        title={data.orderNumber}
        description={`Placed ${new Date(data.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}`}
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

      {data.status === ORDER_STATUS.CONFIRMED ? (
        <div role="status" className="border border-success/25 bg-success-soft px-6 py-5 text-sm leading-relaxed text-ink">
          <p className="font-medium text-success">
            {data.paymentMethod === 'ABA_PAYWAY' || data.paymentMethod === null
              ? 'Payment received.'
              : 'Order confirmed.'}
          </p>
          <p className="mt-2 text-graphite">
            {data.paymentMethod === 'COD'
              ? 'This order uses Cash on Delivery. Payment collection has not been recorded here. Everything below is the order record.'
              : data.paymentMethod !== 'ABA_PAYWAY' && data.paymentMethod !== null
                ? 'The studio has accepted this order, but this page cannot confirm payment for its unsupported payment method.'
                : 'PayWay confirmed the payment and the studio has accepted this order. Everything below is the record it now holds.'}
          </p>
        </div>
      ) : justPlaced ? (
        <div
          role="status"
          className="border border-info/25 bg-info-soft px-6 py-5 text-sm leading-relaxed text-ink"
        >
          <p className="font-medium">Your order is placed.</p>
          <p className="mt-2 text-graphite">
            {data.paymentMethod === 'COD'
              ? 'This order was created with Cash on Delivery. Payment has not yet been collected. The address below is the copy stored with the order.'
              : data.paymentMethod !== 'ABA_PAYWAY' && data.paymentMethod !== null
                ? 'The order was created, but its payment method is not supported on this page. No payment has been started. The address below is the copy stored with the order.'
                : 'Nothing has been charged yet — it stays pending until it is paid for. The address below is the copy stored with the order.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title={`${data.items.length} ${data.items.length === 1 ? 'line' : 'lines'}`} />

          <ul className="divide-y divide-line-soft">
            {data.items.map((line) => (
              <li key={line.id} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{line.productName}</p>
                  <p className="mt-1 font-mono text-xs text-graphite">{line.sku}</p>

                  {line.variantOptionsSnapshot.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {line.variantOptionsSnapshot.map((option) => (
                        <li
                          key={`${option.optionName}-${option.optionValue}`}
                          className="border border-line bg-bone px-2 py-1 text-[12px] text-graphite"
                        >
                          {option.optionName}: {option.optionValue}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-3 text-xs text-graphite">
                    {line.quantity} × <Money amount={line.unitPrice} currency={data.currency} />
                  </p>
                </div>

                <Money
                  amount={line.lineTotal}
                  currency={data.currency}
                  className="shrink-0 font-mono text-sm"
                />
              </li>
            ))}
          </ul>

          {/* Every figure read from the order. The client does not add them up. */}
          <dl className="border-t border-line px-6 py-5">
            <DefinitionRow label="Subtotal">
              <Money amount={data.subtotal} currency={data.currency} className="font-mono" />
            </DefinitionRow>
            <DefinitionRow label="Shipping">
              {data.shippingFee === '0.00' ? (
                <span className="text-graphite">Free</span>
              ) : (
                <Money amount={data.shippingFee} currency={data.currency} className="font-mono" />
              )}
            </DefinitionRow>
            {data.discountAmount !== '0.00' && (
              <DefinitionRow label="Discount">
                <Money amount={data.discountAmount} currency={data.currency} className="font-mono" />
              </DefinitionRow>
            )}
            <DefinitionRow label="Total">
              <Money amount={data.totalAmount} currency={data.currency} emphasis="total" />
            </DefinitionRow>
          </dl>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Delivering to" hint="As it was when this order was placed." />
            <address className="space-y-1 px-6 py-5 text-sm not-italic leading-relaxed text-graphite">
              <span className="block text-ink">{data.shippingRecipientName}</span>
              <span className="block">{data.shippingPhone}</span>
              {formatOrderAddressLines(data).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </Panel>

          {cancelAllowed && (
            <Panel className="p-6">
              <p className="eyebrow text-ink">Need to cancel?</p>
              <p className="mt-3 text-sm leading-relaxed text-graphite">
                You can cancel while the order is pending and unpaid. Its reserved stock will be
                released. The studio checks the order and payment again before cancelling.
              </p>
              <Action
                variant="outline"
                size="sm"
                className="mt-6 w-full"
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

          {data.status === 'PENDING' && (
            <Panel className="p-6">
              {data.paymentMethod === 'COD' ? (
                <>
                  <p className="eyebrow text-ink">Cash on Delivery</p>
                  <p className="mt-3 text-sm leading-relaxed text-graphite">
                    This order was created with Cash on Delivery. Payment has not yet been collected.
                  </p>
                </>
              ) : data.paymentMethod !== 'ABA_PAYWAY' && data.paymentMethod !== null ? (
                <>
                  <p className="eyebrow text-ink">Payment method unavailable</p>
                  <p className="mt-3 text-sm leading-relaxed text-graphite">
                    This order uses a payment method this page cannot process. No PayWay payment was
                    started. Please contact the studio for help.
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow text-ink">Awaiting payment</p>
                  <p className="mt-3 text-sm leading-relaxed text-graphite">
                    This order has not been paid yet. The payment screen issues an ABA PayWay QR for
                    it — the code expires, so a new one is needed after a while.
                  </p>
                  <Action to={`/dashboard/checkout/${data.id}`} size="sm" className="mt-6" withArrow>
                    Pay this order
                  </Action>
                </>
              )}
            </Panel>
          )}

          <Link
            to="/dashboard/orders"
            className="link-wipe inline-flex text-[13px] font-medium text-graphite transition-colors hover:text-ink"
          >
            All orders
          </Link>
        </div>
      </div>
    </div>
  )
}
