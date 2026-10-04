import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Copy, ExternalLink, QrCode } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, StatusBadge } from '@/components/account/Bits'
import { FormError } from '@/components/account/Field'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { useAccountCart } from '@/features/cart/useAccountCart'
import { useAddresses } from '@/features/addresses/useAddresses'
import { preferredAddressId, useCheckout } from '@/features/checkout/useCheckout'
import { isProviderUnavailable } from '@/features/payments/api'
import { formatCountdown, usePayment } from '@/features/payments/usePayment'
import { useOrder } from '@/features/orders/useOrders'
import { STORE_CURRENCY } from '@/lib/api/config'
import { toUserMessage } from '@/lib/api/errors'
import { formatMoney } from '@/lib/money'
import { formatAddressLines, formatOrderAddressLines, PAYABLE_ORDER_STATUS, type Order } from '@/types/api'

/**
 * Real checkout, in two acts.
 *
 * **Before an order exists** it is a review: the server-priced lines, the address
 * it will ship to, and one button. The body sent to `POST /checkout` is an address
 * id and nothing else — the cart says what, the catalogue says what for, and the
 * server says what comes to. Nothing here can change the total.
 *
 * **After an order exists** it is a payment screen for that order, reached at
 * `/dashboard/checkout/:orderId`.
 *
 * ## There is no card form
 *
 * The storefront's public checkout collects a card number, which is the honest
 * thing not to ship: there is no payment endpoint that takes one. ABA PayWay is a
 * QR flow — the shopper scans with a banking app, and no card number ever reaches
 * this app or the server.
 *
 * ## PayWay being unconfigured is a real state, not an error to hide
 *
 * With no credentials the server answers 503. That is an operator problem, not a
 * shopper's, and it is stated as such rather than dressed up as a declined card.
 */
export default function AccountCheckout() {
  const { orderId } = useParams<{ orderId: string }>()

  return orderId ? <PayForOrder orderId={orderId} /> : <ReviewAndPlace />
}

/* ------------------------------ act one: review ----------------------------- */

const ReviewAndPlace = () => {
  const navigate = useNavigate()
  const cart = useAccountCart()
  const addresses = useAddresses()
  const checkout = useCheckout()
  const [addressId, setAddressId] = useState<string | undefined>(undefined)

  // The order was created, so move to paying it rather than showing a receipt the
  // shopper would then have to navigate away from.
  if (checkout.placedOrder) {
    navigate(`/dashboard/checkout/${checkout.placedOrder.id}`, { replace: true })
    return null
  }

  if (cart.isLoading || addresses.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (cart.error) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <ErrorState message={toUserMessage(cart.error)} onRetry={cart.refetch} />
      </div>
    )
  }

  if (addresses.error) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <ErrorState message={toUserMessage(addresses.error)} onRetry={addresses.refetch} />
      </div>
    )
  }

  if (cart.lines.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Checkout" />
        <EmptyState
          eyebrow="Nothing to buy"
          title="Your bag is empty"
          description="There is nothing to check out. Add something from your wishlist, or review what is already in your bag."
          action={
            <Action to="/dashboard/bag" withArrow>
              Go to your bag
            </Action>
          }
        />
      </div>
    )
  }

  const chosen = addressId ?? preferredAddressId(addresses.addresses)
  const hasAddresses = addresses.addresses.length > 0
  // The cart response carries no currency; see STORE_CURRENCY.
  const currency = STORE_CURRENCY

  const overStocked = cart.lines.filter((line) => line.exceedsAvailable)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Checkout"
        description="Confirm where this is going. The amount is priced by the server when the order is created."
      />

      {checkout.error !== undefined && <FormError message={toUserMessage(checkout.error)} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={`${cart.cart?.itemCount ?? 0} ${cart.cart?.itemCount === 1 ? 'piece' : 'pieces'}`}
            action={
              <Action to="/dashboard/bag" variant="ghost" size="sm">
                Edit bag
              </Action>
            }
          />

          <ul className="divide-y divide-line-soft">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-6 px-6 py-5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{line.product.name}</p>
                  <p className="mt-1 font-mono text-xs text-graphite">{line.variant.sku}</p>
                  <p className="mt-2 text-xs text-graphite">
                    {line.quantity} × <Money amount={line.unitPrice} currency={currency} />
                  </p>
                  {line.exceedsAvailable && (
                    <p className="mt-2 text-xs text-signal">
                      More than the {line.available ?? 0} in stock.
                    </p>
                  )}
                </div>

                <Money amount={line.lineTotal} currency={currency} className="shrink-0 font-mono text-sm" />
              </li>
            ))}
          </ul>

          <dl className="border-t border-line px-6 py-5">
            <DefinitionRow label="Subtotal">
              <Money amount={cart.cart?.subtotal ?? '0.00'} currency={currency} />
            </DefinitionRow>
          </dl>

          <p className="border-t border-line px-6 py-5 text-xs leading-relaxed text-graphite">
            Shipping is calculated by the server when the order is placed, so the final total is
            confirmed on the next screen rather than estimated here.
          </p>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Delivering to" />
            <div className="p-6">
              {!hasAddresses ? (
                <>
                  <p className="text-sm leading-relaxed text-graphite">
                    Checkout needs an address. Add one and it will be selected for you.
                  </p>
                  <Action to="/dashboard/addresses" size="sm" className="mt-6" withArrow>
                    Add an address
                  </Action>
                </>
              ) : (
                <fieldset className="space-y-3">
                  <legend className="sr-only">Choose a delivery address</legend>

                  {addresses.addresses.map((address) => {
                    const isChosen = address.id === chosen
                    return (
                      <label
                        key={address.id}
                        className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors duration-200 ${
                          isChosen ? 'border-ink bg-bone' : 'border-line hover:border-graphite'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={address.id}
                          checked={isChosen}
                          onChange={() => setAddressId(address.id)}
                          className="mt-1 size-4 shrink-0 accent-ink"
                        />
                        <span className="min-w-0">
                          <span className="label-micro block text-ink">
                            {address.label}
                            {address.isDefault && (
                              <span className="ml-2 font-normal text-graphite">Default</span>
                            )}
                          </span>
                          <address className="mt-2 space-y-0.5 text-xs not-italic leading-relaxed text-graphite">
                            <span className="block text-ink">{address.recipientName}</span>
                            {formatAddressLines(address).map((line) => (
                              <span key={line} className="block">
                                {line}
                              </span>
                            ))}
                          </address>
                        </span>
                      </label>
                    )
                  })}
                </fieldset>
              )}
            </div>

            {hasAddresses && (
              <div className="border-t border-line p-6">
                <Action
                  className="w-full"
                  disabled={!chosen || overStocked.length > 0 || checkout.isPlacing}
                  onClick={() => chosen && void checkout.placeOrder({ addressId: chosen })}
                >
                  {checkout.isPlacing ? 'Placing your order' : 'Place order'}
                </Action>
                {overStocked.length > 0 && (
                  <p className="mt-3 text-xs leading-relaxed text-signal">
                    Reduce the quantities flagged above before ordering.
                  </p>
                )}
              </div>
            )}
          </Panel>

          <Panel className="p-6">
            <p className="label-micro text-ink">How you will pay</p>
            <p className="mt-3 text-sm leading-relaxed text-graphite">
              With an ABA PayWay QR on the next screen. No card details are collected or sent by
              this site.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ act two: pay -------------------------------- */

const PayForOrder = ({ orderId }: { orderId: string }) => {
  const order = useOrder(orderId)
  const payment = usePayment(orderId)
  const [copied, setCopied] = useState(false)

  if (order.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Payment" />
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (order.error) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Payment" />
        <ErrorState message={toUserMessage(order.error)} onRetry={order.refetch} />
      </div>
    )
  }

  if (!order.data) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Payment" />
        <EmptyState
          eyebrow="Not found"
          title="We could not open that order"
          action={
            <Action to="/dashboard/orders" size="sm">
              Back to orders
            </Action>
          }
        />
      </div>
    )
  }

  const data = order.data
  const isPayable = data.status === PAYABLE_ORDER_STATUS
  const providerIsDown = isProviderUnavailable(payment.error)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Order"
        title={`Pay ${data.orderNumber}`}
        description={`${formatOrderAddressLines(data)[0] ?? ''} — a total of ${formatMoney(data.totalAmount, data.currency)}.`}
        action={<StatusBadge status={data.status} />}
      />

      {!isPayable && (
        <InlineNotice
          tone="info"
          message={`This order is ${data.status.toLowerCase()} and is no longer awaiting payment.`}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Pay with ABA PayWay" hint="Scan the code with a Cambodian banking app." />

          <div className="p-6">
            {payment.error !== undefined && (
              <div className="mb-6">
                {providerIsDown ? (
                  <FormError message="Payments are unavailable right now. The studio has not configured its PayWay account, so no payment can be taken. Your order is saved — try again shortly." />
                ) : (
                  <FormError message={toUserMessage(payment.error)} />
                )}
              </div>
            )}

            {!payment.payment && (
              <div className="py-8 text-center">
                <QrCode size={26} strokeWidth={1.2} aria-hidden className="mx-auto text-ash" />
                <p className="mt-5 text-sm leading-relaxed text-graphite">
                  Asking for a QR creates a payment attempt against this order. The amount is the
                  order's own total — it cannot be changed from here.
                </p>
                <Action
                  className="mt-6"
                  disabled={!isPayable || payment.isStarting}
                  onClick={() => void payment.start()}
                >
                  {payment.isStarting ? 'Asking for a QR' : 'Show the QR code'}
                </Action>
                {!isPayable && (
                  <p className="mt-4 text-xs text-graphite">
                    This order is {data.status.toLowerCase()}, so no new payment can be started.
                  </p>
                )}
              </div>
            )}

            {payment.payment && (
              <QrPanel
                payment={payment.payment}
                currency={data.currency}
                isScannable={payment.isScannable}
                isExpired={payment.isExpired}
                countdown={formatCountdown(payment.secondsRemaining)}
                copied={copied}
                onCopy={() => {
                  void navigator.clipboard
                    .writeText(payment.payment?.qrString ?? '')
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false))
                }}
                onRestart={() => void payment.start()}
                isRestarting={payment.isStarting}
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

type QrPanelProps = {
  payment: NonNullable<ReturnType<typeof usePayment>['payment']>
  currency: string
  isScannable: boolean
  isExpired: boolean
  countdown: string
  copied: boolean
  onCopy: () => void
  onRestart: () => void
  isRestarting: boolean
}

const QrPanel = ({
  payment,
  currency,
  isScannable,
  isExpired,
  countdown,
  copied,
  onCopy,
  onRestart,
  isRestarting,
}: QrPanelProps) => (
  <div className="grid gap-8 sm:grid-cols-[auto_1fr]">
    <div className="mx-auto w-full max-w-64">
      <div className="border border-line bg-paper-pure p-4">
        {payment.qrImage ? (
          <img
            src={payment.qrImage}
            alt="ABA PayWay QR code for this payment"
            width={256}
            height={256}
            className={`size-full ${isScannable ? '' : 'opacity-30 grayscale'}`}
          />
        ) : (
          // No `qrImage` means PayWay returned only the payload string. Showing the
          // string is honest and still scannable by some apps; inventing a QR from
          // it would be a reimplementation of the payload spec, which is not
          // something to guess at in a checkout screen.
          <div className="grid aspect-square place-items-center bg-bone p-4 text-center">
            <p className="text-xs leading-relaxed text-graphite">
              PayWay did not return a QR image. Use the code below instead.
            </p>
          </div>
        )}
      </div>

      {payment.qrString && (
        <button
          type="button"
          onClick={onCopy}
          className="mt-3 flex w-full items-center justify-center gap-2 border border-line py-2.5 text-xs text-graphite transition-colors duration-200 hover:border-ink hover:text-ink"
        >
          {copied ? <Check size={12} strokeWidth={2} aria-hidden /> : <Copy size={12} strokeWidth={1.5} aria-hidden />}
          {copied ? 'Copied' : 'Copy the payload'}
        </button>
      )}
    </div>

    <div className="min-w-0">
      <dl className="space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-micro text-ash">Amount</dt>
          <dd className="font-mono text-ink">{formatMoney(payment.amount, currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-micro text-ash">Reference</dt>
          <dd className="font-mono text-xs text-ink">{payment.transactionId}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="label-micro text-ash">State</dt>
          <dd className="text-ink">{payment.status}</dd>
        </div>
      </dl>

      <div className="mt-6 border border-line bg-bone px-4 py-4">
        {isExpired ? (
          <p className="text-sm leading-relaxed text-ink">
            This code has expired. A new one is needed — the old one will not be accepted.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-ink">
            Expires in <span className="font-mono tabular-nums">{countdown}</span>.
          </p>
        )}
        {(isExpired || !isScannable) && (
          <Action size="sm" className="mt-4" onClick={onRestart} disabled={isRestarting}>
            {isRestarting ? 'Asking for a new code' : 'Get a new code'}
          </Action>
        )}
      </div>

      {payment.abapayDeeplink && isScannable && (
        <a
          href={payment.abapayDeeplink}
          className="label-micro mt-6 inline-flex items-center gap-2 border border-line px-4 py-3 text-ink transition-colors duration-200 hover:border-ink"
        >
          <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
          Open ABA Mobile
        </a>
      )}

      <p className="mt-6 text-xs leading-relaxed text-graphite">
        There is no payment-status endpoint in this API, so this page cannot watch for your
        payment in real time. When PayWay confirms it, your order's status changes — open the
        order to see it.
      </p>
    </div>
  </div>
)

/** Referenced only to keep the order type in this module's vocabulary. */
export type { Order }
