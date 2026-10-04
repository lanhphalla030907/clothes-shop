import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, QuantityStepper } from '@/components/account/Bits'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { useAccountCart } from '@/features/cart/useAccountCart'
import { STORE_CURRENCY } from '@/lib/api/config'
import { toUserMessage } from '@/lib/api/errors'
import type { CartLine } from '@/types/api'

/**
 * The server cart.
 *
 * ## Why this is not the storefront bag
 *
 * The storefront bag is a local prototype over static products, so its lines have
 * no variant id and nothing to send to the API. This cart is the account's real
 * one. They are separate bags, and this page says so rather than pretending to be
 * a view of the same thing.
 *
 * ## Nothing here is calculated
 *
 * `unitPrice`, `lineTotal` and `subtotal` are read from the response. The stepper
 * sends an absolute quantity and the server answers with the recomputed line, so
 * the figure on screen is always the one the server holds — including after the
 * subtotal changes underneath.
 */
export default function Bag() {
  const cart = useAccountCart()
  const [confirmedClear, setConfirmedClear] = useState(false)

  if (cart.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Your bag" />
        <SkeletonCard rows={3} />
      </div>
    )
  }

  if (cart.error) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Your bag" />
        <ErrorState message={toUserMessage(cart.error)} onRetry={cart.refetch} />
      </div>
    )
  }

  if (cart.lines.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Account" title="Your bag" />
        <EmptyState
          eyebrow="Nothing here"
          title="Your bag is empty"
          description="Save a piece to your wishlist and it can be moved straight in here. Your wishlist is attached to this account, not to this browser."
          action={
            <Action to="/dashboard/wishlist" withArrow>
              Open your wishlist
            </Action>
          }
        />
      </div>
    )
  }

  // The cart response carries no currency; see STORE_CURRENCY.
  const currency = STORE_CURRENCY
  const overStocked = cart.lines.filter((line) => line.exceedsAvailable)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Your bag"
        description="This bag is stored on the studio server against your account. The storefront bag is a separate local prototype and does not carry over."
      />

      {cart.actionError !== undefined && (
        <InlineNotice message={toUserMessage(cart.actionError)} onDismiss={cart.dismissActionError} />
      )}

      {overStocked.length > 0 && (
        <InlineNotice
          tone="info"
          message={`${overStocked.length === 1 ? 'One line asks for' : `${overStocked.length} lines ask for`} more than is currently in stock. Checkout will refuse the order until the quantities are reduced.`}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={`${cart.cart?.itemCount ?? 0} ${cart.cart?.itemCount === 1 ? 'piece' : 'pieces'}`}
            action={
              confirmedClear ? (
                <span className="flex items-center gap-3">
                  <span className="text-xs text-graphite">Empty the whole bag?</span>
                  <button
                    type="button"
                    disabled={cart.isClearing}
                    onClick={() => void cart.clear()}
                    className="label-micro border border-signal px-3 py-1.5 text-signal transition-colors hover:bg-signal hover:text-paper disabled:opacity-40"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedClear(false)}
                    className="label-micro text-graphite transition-colors hover:text-ink"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmedClear(true)}
                  className="label-micro text-graphite transition-colors hover:text-ink"
                >
                  Empty bag
                </button>
              )
            }
          />

          <ul className="divide-y divide-line-soft">
            {cart.lines.map((line) => (
              <li key={line.id} className="px-6 py-6">
                <CartRow
                  line={line}
                  currency={currency}
                  isPending={cart.isPendingLine(line.id)}
                  onQuantity={(quantity) => void cart.setQuantity(line.id, quantity)}
                  onRemove={() => void cart.removeLine(line.id)}
                />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHeader title="Summary" />
            <dl className="px-6 py-5">
              <DefinitionRow label="Subtotal">
                <Money amount={cart.cart?.subtotal ?? '0.00'} currency={currency} />
              </DefinitionRow>
            </dl>

            <div className="border-t border-line px-6 py-5">
              <p className="text-xs leading-relaxed text-graphite">
                Shipping is priced by the server when you place the order, so there is no
                shipping figure to show yet.
              </p>
              <Action
                to="/dashboard/checkout"
                className="mt-6 w-full"
                disabled={overStocked.length > 0}
              >
                Checkout
              </Action>
              {overStocked.length > 0 && (
                <p className="mt-3 text-xs leading-relaxed text-signal">
                  Reduce the highlighted quantities to continue.
                </p>
              )}
            </div>
          </Panel>

          <Panel className="p-6">
            <p className="label-micro text-ink">Stock is checked again at checkout</p>
            <p className="mt-3 text-sm leading-relaxed text-graphite">
              A line can sell out between now and then. If it does, checkout refuses the order
              rather than charging you for something unavailable — nothing is reserved until you
              confirm.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}

type CartRowProps = {
  line: CartLine
  currency: string
  isPending: boolean
  onQuantity: (quantity: number) => void
  onRemove: () => void
}

const CartRow = ({ line, currency, isPending, onQuantity, onRemove }: CartRowProps) => {
  const label = `${line.product.name}, ${line.variant.sku}`
  const options = line.variant.options

  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${isPending ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{line.product.name}</p>
        <p className="mt-1 font-mono text-xs text-graphite">{line.variant.sku}</p>

        {options.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {options.map((option) => (
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
          {line.available === null
            ? 'No stock recorded for this variant'
            : `${line.available} in stock`}
          {line.exceedsAvailable && (
            <span className="ml-2 text-signal">— more than you asked for</span>
          )}
        </p>

        <div className="mt-4 flex items-center gap-4">
          <QuantityStepper
            value={line.quantity}
            max={line.available}
            disabled={isPending}
            label={label}
            onChange={onQuantity}
          />
          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            aria-label={`Remove ${label} from your bag`}
            className="grid size-11 place-items-center border border-line text-graphite transition-colors duration-200 hover:border-signal hover:text-signal disabled:opacity-40"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <Money amount={line.lineTotal} currency={currency} className="font-mono text-sm" />
        {line.quantity > 1 && (
          <p className="mt-2 text-xs text-graphite">
            {line.quantity} × <Money amount={line.unitPrice} currency={currency} />
          </p>
        )}
      </div>
    </div>
  )
}
