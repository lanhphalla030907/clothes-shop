import { Link } from 'react-router-dom'
import { ArrowUpRight, Heart, MapPin, ShoppingBag } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { Panel, PanelHeader } from '@/components/account/PageHeader'
import { StatusBadge, Money } from '@/components/account/Bits'
import { ErrorState, EmptyState } from '@/components/account/States'
import { SkeletonCard, Skeleton } from '@/components/account/Skeleton'
import { useCartActions } from '@/features/cart/useCartActions'
import type { CartActions } from '@/features/cart/cartActions'
import { useAddressActions } from '@/features/addresses/useAddressActions'
import { useOrders } from '@/features/orders/useOrders'
import { useWishlistActions } from '@/features/wishlist/useWishlistActions'
import type { WishlistActions } from '@/features/wishlist/wishlistActions'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { STORE_CURRENCY } from '@/lib/api/config'
import { toUserMessage } from '@/lib/api/errors'
import { formatAddressLines } from '@/types/api'

/**
 * The account landing screen.
 *
 * Four panels, each backed by its own endpoint, each with its own loading, empty
 * and error state. The temptation with a dashboard is to fire one "summary"
 * request and render a card of counts — but the API has no such endpoint, and
 * inventing one client-side means a page that reports "0 orders" because one of
 * four requests failed. Four honest panels beat one confident wrong number.
 *
 * Every figure here is a count or a server-sent amount. Nothing is derived from a
 * local estimate.
 */

const FIRST_PANEL = 'sm:col-span-2 lg:col-span-3'

export default function Overview() {
  const { user } = useAuth()
  const orders = useOrders()
  const cart = useCartActions()
  const wishlist = useWishlistActions()
  const addresses = useAddressActions()

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-micro text-ash">Account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {displayName(user) || 'Your account'}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-graphite">
            Everything here is stored against your account on the studio server — orders,
            saved pieces, your bag and your addresses.
          </p>
        </div>
        <Action to="/dashboard/orders" variant="outline" size="sm" withArrow>
          All orders
        </Action>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className={FIRST_PANEL}>
          <PanelHeader
            title="Recent orders"
            hint="The last five, newest first."
            action={
              <Link
                to="/dashboard/orders"
                className="label-micro link-wipe text-graphite transition-colors hover:text-ink"
              >
                View all
              </Link>
            }
          />

          {orders.isLoading ? (
            <div className="p-6">
              <SkeletonCard rows={3} className="border-0 p-0" />
            </div>
          ) : orders.error ? (
            <div className="p-6">
              <ErrorState message={toUserMessage(orders.error)} onRetry={orders.refetch} />
            </div>
          ) : orders.data && orders.data.length > 0 ? (
            <ul className="divide-y divide-line-soft">
              {orders.data.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/dashboard/orders/${order.id}`}
                    className="group flex items-center justify-between gap-6 px-6 py-4 transition-colors duration-200 hover:bg-bone/60"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-ink">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-graphite">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' · '}
                        {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <StatusBadge status={order.status} />
                      <Money amount={order.totalAmount} currency={order.currency} />
                      <ArrowUpRight
                        size={14}
                        strokeWidth={1.5}
                        aria-hidden
                        className="text-ash transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6">
              <EmptyState
                align="left"
                eyebrow="No orders yet"
                title="Nothing ordered so far"
                description="When you place an order it will appear here, with its status and a link to its detail."
                action={
                  <Action to="/dashboard/bag" size="sm" withArrow>
                    Review your bag
                  </Action>
                }
              />
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Your bag" />
          <div className="p-6">
            <BagSummary cart={cart} />
          </div>
        </Panel>

        <Panel>          <PanelHeader
            title="Saved pieces"
            action={
              <Link
                to="/dashboard/wishlist"
                className="label-micro link-wipe text-graphite transition-colors hover:text-ink"
              >
                View all
              </Link>
            }
          />
          <div className="p-6">
            <WishlistSummary wishlist={wishlist} />
          </div>
        </Panel>

        <Panel className={FIRST_PANEL}>
          <PanelHeader
            title="Delivery addresses"
            hint={
              addresses.defaultAddress
                ? `Default: ${addresses.defaultAddress.label}`
                : undefined
            }
            action={
              <Link
                to="/dashboard/addresses"
                className="label-micro link-wipe text-graphite transition-colors hover:text-ink"
              >
                Manage
              </Link>
            }
          />

          {addresses.isLoading ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : addresses.error ? (
            <div className="p-6">
              <ErrorState message={toUserMessage(addresses.error)} onRetry={addresses.refetch} />
            </div>
          ) : addresses.addresses.length === 0 ? (
            <div className="p-6">
              <EmptyState
                align="left"
                eyebrow="No addresses"
                title="Add somewhere to deliver to"
                description="Checkout needs an address. Adding one now means the step is already done when you are ready."
                action={
                  <Action to="/dashboard/addresses" size="sm" withArrow>
                    Add an address
                  </Action>
                }
              />
            </div>
          ) : (
            <ul className="grid gap-px bg-line-soft sm:grid-cols-2">
              {addresses.addresses.slice(0, 2).map((address) => (
                <li key={address.id} className="bg-paper p-6">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} strokeWidth={1.5} aria-hidden className="text-ash" />
                    <span className="label-micro text-ink">{address.label}</span>
                    {address.isDefault && (
                      <span className="label-micro border border-line px-2 py-0.5 text-graphite">
                        Default
                      </span>
                    )}
                  </div>
                  <address className="mt-4 space-y-0.5 text-sm not-italic leading-relaxed text-graphite">
                    {formatAddressLines(address).map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}

/** Bag summary — the count is the server's, never a localStorage figure. */
const BagSummary = ({ cart }: { cart: CartActions }) => {
  if (cart.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-12" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    )
  }

  if (cart.error) {
    return <ErrorState message={toUserMessage(cart.error)} onRetry={cart.refetch} />
  }

  const lineCount = cart.lines.length

  if (lineCount === 0) {
    return (
      <>
        <ShoppingBag size={18} strokeWidth={1.4} aria-hidden className="text-ash" />
        <p className="mt-4 text-sm leading-relaxed text-graphite">
          Your bag is empty. Pieces you save to your wishlist can be moved straight into it.
        </p>
        <Action to="/dashboard/wishlist" variant="outline" size="sm" className="mt-6" withArrow>
          Browse wishlist
        </Action>
      </>
    )
  }

  return (
    <>
      <p className="font-mono text-3xl tabular-nums text-ink">
        {String(cart.cart?.itemCount ?? 0).padStart(2, '0')}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        {cart.cart?.itemCount} {cart.cart?.itemCount === 1 ? 'piece' : 'pieces'} across{' '}
        {lineCount} {lineCount === 1 ? 'line' : 'lines'}.
      </p>
      <p className="mt-4 font-mono text-sm text-ink">
        <Money amount={cart.cart?.subtotal ?? '0.00'} currency={STORE_CURRENCY} />
      </p>
      <p className="mt-1 text-xs leading-relaxed text-graphite">
        Subtotal. Shipping is priced at checkout.
      </p>
      <Action to="/dashboard/checkout" size="sm" className="mt-6" withArrow>
        Checkout
      </Action>
    </>
  )
}

/** Wishlist summary — a real count from the server, never a localStorage tally. */
const WishlistSummary = ({ wishlist }: { wishlist: WishlistActions }) => {
  if (wishlist.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-12" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    )
  }

  if (wishlist.error) {
    return (
      <ErrorState message={toUserMessage(wishlist.error)} onRetry={wishlist.refetch} />
    )
  }

  const saved = wishlist.items.length

  return (
    <>
      <Heart size={18} strokeWidth={1.4} aria-hidden className="text-ash" />
      <p className="mt-4 font-mono text-3xl tabular-nums text-ink">
        {String(saved).padStart(2, '0')}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-graphite">
        {saved === 0
          ? 'Nothing saved yet.'
          : `${saved === 1 ? 'One piece' : `${saved} pieces`} saved to this account, not to this browser.`}
      </p>
      <Action to="/dashboard/wishlist" variant="outline" size="sm" className="mt-6" withArrow>
        Open wishlist
      </Action>
    </>
  )
}
