import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader, Panel, PanelHeader } from '@/components/account/PageHeader'
import { DefinitionRow, Money, QuantityStepper } from '@/components/account/Bits'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { useCartActions } from '@/features/cart/useCartActions'
import { STORE_CURRENCY } from '@/lib/api/config'
import { toUserMessage } from '@/lib/api/errors'
import type { CartLine } from '@/types/api'

/**
 * The customer's bag: one cart, held in `CartActionsProvider`.
 *
 * Nothing on this page is calculated. `unitPrice`, `lineTotal`, `subtotal` and
 * `available` are read from the cart response, and every write is followed by a
 * re-read — so what is shown is what the server holds, including after a line
 * was refused.
 */
export default function Bag() {
  const cart = useCartActions()
  const [confirmingClear, setConfirmingClear] = useState(false)

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
          description="Anything you add from the collection or your wishlist is kept here against your account, on any device."
          action={
            <Action to="/shop" withArrow>
              Shop the collection
            </Action>
          }
        />
      </div>
    )
  }

  const currency = STORE_CURRENCY
  const blocking = cart.lines.filter(cannotBeOrdered)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Your bag"
        description="Held on the studio server against your account. Quantities and prices are the server's, checked again at checkout."
        action={
          confirmingClear ? (
            <span className="flex flex-wrap items-center gap-3">
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
                onClick={() => setConfirmingClear(false)}
                className="label-micro text-graphite transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="label-micro border border-line px-3 py-1.5 text-graphite transition-colors hover:border-ink hover:text-ink"
            >
              Empty bag
            </button>
          )
        }
      />

      {cart.actionError !== undefined && (
        <InlineNotice
          message={toUserMessage(cart.actionError)}
          onDismiss={cart.dismissActionError}
        />
      )}

      {blocking.length > 0 && (
        <InlineNotice
          tone="info"
          message={
            blocking.length === 1
              ? 'One line cannot be fulfilled as it stands. Reduce its quantity or remove it to continue.'
              : `${blocking.length} lines cannot be fulfilled as they stand. Reduce their quantities or remove them to continue.`
          }
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title={`${cart.itemCount} ${cart.itemCount === 1 ? 'piece' : 'pieces'} across ${cart.lines.length} ${cart.lines.length === 1 ? 'line' : 'lines'}`}
            hint={cart.isRefreshing ? 'Checking current prices and stock…' : undefined}
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
              <DefinitionRow label="Shipping">
                <span className="text-xs text-graphite">Priced at checkout</span>
              </DefinitionRow>
            </dl>

            <div className="border-t border-line px-6 py-5">
              <Action
                to="/dashboard/checkout"
                className="w-full"
                disabled={blocking.length > 0}
              >
                Checkout
              </Action>
              {blocking.length > 0 && (
                <p className="mt-3 text-xs leading-relaxed text-signal">
                  Reduce the highlighted quantities to continue.
                </p>
              )}
            </div>
          </Panel>

          <Panel className="p-6">
            <p className="label-micro text-ink">Stock is checked again at checkout</p>
            <p className="mt-3 text-sm leading-relaxed text-graphite">
              A bag records what you want; it does not hold anything. If a line sells out before
              you order, checkout refuses it rather than charging you for something unavailable.
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
  const { product, variant } = line
  const label = `${product.name}, ${variant.sku}`
  const withdrawn = !variant.isActive || !product.isActive

  return (
    <div
      aria-busy={isPending}
      className={`flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between ${
        isPending ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0">
        <Link
          to={`/product/${product.id}`}
          className="text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          {product.name}
        </Link>
        <p className="mt-1 font-mono text-xs text-graphite">{variant.sku}</p>

        {variant.options.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {variant.options.map((option) => (
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
          {stockLabel(line)}
          {line.exceedsAvailable && (
            <span className="ml-2 text-signal">— not fulfillable at this quantity</span>
          )}
          {withdrawn && !line.exceedsAvailable && (
            <span className="ml-2 text-signal">— withdrawn from sale</span>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <QuantityStepper
            value={line.quantity}
            max={line.available}
            disabled={isPending}
            label={label}
            editable
            onChange={onQuantity}
          />

          <p className="font-mono text-xs text-graphite tabular-nums">
            × <Money amount={line.unitPrice} currency={currency} />
          </p>

          <button
            type="button"
            onClick={onRemove}
            disabled={isPending}
            aria-label={`Remove ${label} from your bag`}
            className="ml-auto grid size-11 place-items-center border border-line text-graphite transition-colors duration-200 hover:border-signal hover:text-signal disabled:opacity-40 sm:ml-0"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="shrink-0 text-left sm:text-right">
        <p className="label-micro text-ash">Line total</p>
        <Money
          amount={line.lineTotal}
          currency={currency}
          className="mt-2 block font-mono text-sm"
        />
      </div>
    </div>
  )
}

/** `null` and `0` are different facts, so they are not written the same way. */
const stockLabel = (line: CartLine): string => {
  if (line.available === null) return 'No stock recorded for this variant'
  if (line.available === 0) return 'Sold out'
  return `${line.available} in stock`
}

/**
 * What keeps checkout from being offered: the server's own stock verdict, or a
 * variant or product that has since been withdrawn from sale.
 */
const cannotBeOrdered = (line: CartLine): boolean =>
  line.exceedsAvailable || !line.variant.isActive || !line.product.isActive