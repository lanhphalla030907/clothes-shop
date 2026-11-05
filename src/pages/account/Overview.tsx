import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, ShoppingBag } from 'lucide-react'
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

const WIDE = 'lg:col-span-2'

export default function Overview() {
  const { user } = useAuth()
  const orders = useOrders()
  const cart = useCartActions()
  const wishlist = useWishlistActions()
  const addresses = useAddressActions()

  const firstName = user?.firstName?.trim()

  return (
    <div className="space-y-8">
      <header className="border-b border-line pb-7">
        <p className="eyebrow text-graphite">Account overview</p>
        <h1 className="mt-2.5 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[2.1rem]">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite">
          {displayName(user)
            ? 'Your orders, bag, saved pieces and delivery addresses are stored against your account.'
            : 'Your orders, bag, saved pieces and delivery addresses live here.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Action to="/shop" size="sm" withArrow>
            Continue shopping
          </Action>
          <Action to="/dashboard/orders" variant="outline" size="sm">
            View orders
          </Action>
          <Action to="/dashboard/addresses" variant="ghost" size="sm">
            Manage addresses
          </Action>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className={`${WIDE} flex flex-col`}>
          <PanelHeader
            title="Recent orders"
            hint="The last five, newest first."
            action={
              <Link
                to="/dashboard/orders"
                className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
              >
                View all
                <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden />
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
            <ul className="flex-1 divide-y divide-line-soft">
              {orders.data.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/dashboard/orders/${order.id}`}
                    className="group flex flex-col gap-3 px-5 py-4 transition-colors duration-200 hover:bg-bone/60 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-medium text-ink">{order.orderNumber}</p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-graphite">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' · '}
                        {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <StatusBadge status={order.status} />
                      <Money amount={order.totalAmount} currency={order.currency} />
                      <ArrowUpRight
                        size={14}
                        strokeWidth={1.6}
                        aria-hidden
                        className="hidden text-ash transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5 sm:p-6">
              <EmptyState
                align="left"
                eyebrow="No orders yet"
                title="Nothing ordered so far"
                description="When you place an order it will appear here, with its status and a link to its detail."
                action={
                  <Action to="/shop" size="sm" withArrow>
                    Start shopping
                  </Action>
                }
              />
            </div>
          )}
        </Panel>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Panel>
            <PanelHeader
              title="Your bag"
              action={
                <ShoppingBag size={16} strokeWidth={1.5} aria-hidden className="text-ash" />
              }
            />
            <div className="p-5 sm:p-6">
              <BagSummary cart={cart} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Saved pieces"
              action={
                <Link
                  to="/dashboard/wishlist"
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
                >
                  View all
                  <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden />
                </Link>
              }
            />
            <div className="p-5 sm:p-6">
              <WishlistSummary wishlist={wishlist} />
            </div>
          </Panel>
        </div>

        <Panel className={WIDE}>
          <PanelHeader
            title="Delivery addresses"
            hint={addresses.defaultAddress ? `Default: ${addresses.defaultAddress.label}` : undefined}
            action={
              <Link
                to="/dashboard/addresses"
                className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
              >
                Manage
                <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden />
              </Link>
            }
          />

          {addresses.isLoading ? (
            <div className="space-y-4 p-5 sm:p-6">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : addresses.error ? (
            <div className="p-5 sm:p-6">
              <ErrorState message={toUserMessage(addresses.error)} onRetry={addresses.refetch} />
            </div>
          ) : addresses.addresses.length === 0 ? (
            <div className="p-5 sm:p-6">
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
                <li key={address.id} className="bg-paper p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <MapPin size={14} strokeWidth={1.6} aria-hidden className="text-ash" />
                    <span className="text-[13px] font-semibold text-ink">{address.label}</span>
                    {address.isDefault && (
                      <span className="border border-line px-2 py-0.5 text-[11px] font-medium text-graphite">
                        Default
                      </span>
                    )}
                  </div>
                  <address className="mt-3 space-y-0.5 text-[13.5px] leading-relaxed text-graphite not-italic">
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

        <Panel className="flex flex-col justify-between">
          <PanelHeader title="Need a hand?" />
          <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
            <p className="text-[13.5px] leading-relaxed text-graphite">
              Check your delivery details before checkout, or review a past order for its current
              status.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Action to="/dashboard/addresses" variant="outline" size="sm">
                Delivery details
              </Action>
              <Action to="/about" variant="ghost" size="sm">
                About the studio
              </Action>
            </div>
          </div>
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
        <p className="text-[13.5px] leading-relaxed text-graphite">
          Your bag is empty. Pieces you save to your wishlist can be moved straight into it.
        </p>
        <Action to="/dashboard/wishlist" variant="outline" size="sm" className="mt-5" withArrow>
          Browse wishlist
        </Action>
      </>
    )
  }

  return (
    <>
      <p className="font-mono text-3xl leading-none tabular-nums text-ink">
        {String(cart.cart?.itemCount ?? 0).padStart(2, '0')}
      </p>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-graphite">
        {cart.cart?.itemCount} {cart.cart?.itemCount === 1 ? 'piece' : 'pieces'} across {lineCount}{' '}
        {lineCount === 1 ? 'line' : 'lines'}.
      </p>
      <div className="mt-4 border-t border-line-soft pt-3">
        <Money amount={cart.cart?.subtotal ?? '0.00'} currency={STORE_CURRENCY} />
        <p className="mt-1 text-[12px] leading-relaxed text-graphite">
          Subtotal. Shipping is priced at checkout.
        </p>
      </div>
      <Action to="/dashboard/checkout" size="sm" className="mt-5" withArrow>
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
    return <ErrorState message={toUserMessage(wishlist.error)} onRetry={wishlist.refetch} />
  }

  const saved = wishlist.items.length

  return (
    <>
      <p className="font-mono text-3xl leading-none tabular-nums text-ink">
        {String(saved).padStart(2, '0')}
      </p>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-graphite">
        {saved === 0
          ? 'Nothing saved yet. Keep pieces here while you decide.'
          : `${saved === 1 ? 'One piece' : `${saved} pieces`} saved to this account, not to this browser.`}
      </p>
      <Action to="/dashboard/wishlist" variant="outline" size="sm" className="mt-5" withArrow>
        Open wishlist
      </Action>
    </>
  )
}
