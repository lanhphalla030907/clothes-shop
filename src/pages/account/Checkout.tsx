import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money } from '@/components/account/Bits'
import { FormError } from '@/components/account/Field'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { useCartActions } from '@/features/cart/useCartActions'
import { useAddressActions } from '@/features/addresses/useAddressActions'
import { preferredAddressId, useCheckout } from '@/features/checkout/useCheckout'
import { PaymentForOrder } from '@/features/payments/PaymentForOrder'
import { STORE_CURRENCY } from '@/lib/api/config'
import { toUserMessage } from '@/lib/api/errors'
import { formatAddressLines, type UUID } from '@/types/api'

/**
 * Real checkout: the review that places an order.
 *
 * The body sent to `POST /checkout` is an address id and nothing else — the cart
 * says what, the catalogue says what for, and the server says what comes to. A
 * successful submit goes to the payment screen for the order just created.
 *
 * `/dashboard/checkout/:orderId` is the ABA PayWay screen, which lives with the
 * rest of the payment code in `features/payments`.
 */
export default function AccountCheckout() {
  const { orderId } = useParams<{ orderId: string }>()

  return orderId ? <PaymentForOrder orderId={orderId as UUID} /> : <ReviewAndPlace />
}

/* ------------------------------ act one: review ----------------------------- */

const ReviewAndPlace = () => {
  const navigate = useNavigate()
  const cart = useCartActions()
  const addresses = useAddressActions()
  const checkout = useCheckout()
  const [addressId, setAddressId] = useState<string | undefined>(undefined)
  const { placedOrder } = checkout
  const { refetch: refetchCart } = cart

  // Checkout empties the cart server-side, so the shared cart is re-read once per
  // order. The order then goes straight to its payment screen, which re-reads the
  // order from the API rather than trusting what checkout returned.
  useEffect(() => {
    if (!placedOrder) return

    refetchCart()
    navigate(`/dashboard/checkout/${placedOrder.id}`, {
      replace: true,
      state: { justPlaced: true },
    })
  }, [placedOrder, refetchCart, navigate])

  if (placedOrder) return null

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

  // An explicit choice sticks, unless that address is gone — then the server's
  // default takes over rather than leaving a dead id on the button.
  const chosen = addresses.addresses.some((address) => address.id === addressId)
    ? addressId
    : preferredAddressId(addresses.addresses)
  const hasAddresses = addresses.addresses.length > 0
  // The cart response carries no currency; see STORE_CURRENCY.
  const currency = STORE_CURRENCY

  const overStocked = cart.lines.filter((line) => line.exceedsAvailable)

  const place = async () => {
    if (!chosen) return

    const order = await checkout.placeOrder({ addressId: chosen })

    // A refused checkout is usually stale stock, so the bag is re-read and the
    // server's current verdict decides whether the button comes back.
    if (!order) refetchCart()
  }

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

                  {line.variant.options.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {line.variant.options.map((option) => (
                        <li
                          key={`${option.optionName}-${option.optionValue}`}
                          className="label-micro border border-line px-2 py-1 text-graphite"
                        >
                          {option.optionName}: {option.optionValue}
                        </li>
                      ))}
                    </ul>
                  )}

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
                  onClick={() => void place()}
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
            <p className="label-micro text-ink">What happens next</p>
            <p className="mt-3 text-sm leading-relaxed text-graphite">
              Placing the order creates it as <span className="text-ink">pending</span>. Nothing is
              charged here — the order stays unpaid until it is paid for.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
