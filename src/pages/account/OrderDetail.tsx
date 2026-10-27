import { useLocation, useParams, Link } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { BackLink, PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, StatusBadge } from '@/components/account/Bits'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonCard, Skeleton } from '@/components/account/Skeleton'
import { useOrder } from '@/features/orders/useOrders'
import { formatOrderAddressLines } from '@/types/api'
import { toUserMessage } from '@/lib/api/errors'

/**
 * One order in full.
 *
 * Everything here comes from the stored snapshot — the product name, the price
 * paid, the variant options, the delivery address — so editing an address later
 * cannot change this screen.
 *
 * `justPlaced` and `justPaid` are hints set by the screens that sent the customer
 * here, so the page can greet them. Both are read-only as far as this page is
 * concerned: what it shows is what the API says.
 */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const order = useOrder(id)
  const location = useLocation()
  const justPlaced = (location.state as { justPlaced?: boolean } | null)?.justPlaced === true
  const justPaid = (location.state as { justPaid?: boolean } | null)?.justPaid === true

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
        action={<StatusBadge status={data.status} />}
      />

      {justPaid ? (
        <div role="status" className="border border-ink bg-ink px-6 py-5 text-sm leading-relaxed text-paper">
          <p className="font-medium">Payment received.</p>
          <p className="mt-2 opacity-80">
            PayWay confirmed the payment and the studio has accepted this order. Everything below is
            the record it now holds.
          </p>
        </div>
      ) : justPlaced ? (
        <div
          role="status"
          className="border border-ink bg-bone px-6 py-5 text-sm leading-relaxed text-ink"
        >
          <p className="font-medium">Your order is placed.</p>
          <p className="mt-2 text-graphite">
            Nothing has been charged yet — it stays pending until it is paid for. The address below
            is the copy stored with the order.
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
                          className="label-micro border border-line px-2 py-1 text-graphite"
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

          {data.status === 'PENDING' && (
            <Panel className="p-6">
              <p className="label-micro text-ink">Awaiting payment</p>
              <p className="mt-3 text-sm leading-relaxed text-graphite">
                This order has not been paid yet. The payment screen issues an ABA PayWay QR for it —
                the code expires, so a new one is needed after a while.
              </p>
              <Action to={`/dashboard/checkout/${data.id}`} size="sm" className="mt-6" withArrow>
                Pay this order
              </Action>
            </Panel>
          )}

          <Link
            to="/dashboard/orders"
            className="label-micro link-wipe inline-flex text-graphite transition-colors hover:text-ink"
          >
            All orders
          </Link>
        </div>
      </div>
    </div>
  )
}
