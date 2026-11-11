import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  MapPin,
  ShoppingBag,
  Package,
  Clock,
  CheckCircle2,
  User,
  Heart,
  ChevronRight,
} from 'lucide-react'
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
import { useAuth } from '@/features/auth/useAuth'
import { STORE_CURRENCY } from '@/lib/api/config'
import { toUserMessage } from '@/lib/api/errors'
import { formatAddressLines, ORDER_STATUS } from '@/types/api'

const WIDE = 'lg:col-span-2'

export default function Overview() {
  const { user } = useAuth()
  const orders = useOrders()
  const cart = useCartActions()
  const wishlist = useWishlistActions()
  const addresses = useAddressActions()

  const firstName = user?.firstName?.trim()

  // Real statistics computed across all customer orders (unpaginated server endpoint)
  const totalOrders = orders.data?.length ?? 0
  const pendingOrders =
    orders.data?.filter((order) => order.status === ORDER_STATUS.PENDING).length ?? 0
  const deliveredOrders =
    orders.data?.filter((order) => order.status === ORDER_STATUS.DELIVERED).length ?? 0

  return (
    <div className="space-y-8">
      {/* Customer Welcome Header */}
      <header className="border-b border-line pb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-graphite">Customer Account</p>
            <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[2.1rem]">
              {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-graphite">
              {user?.email
                ? `Signed in as ${user.email}. Manage your orders, delivery addresses, and personal profile.`
                : 'Your orders, bag, saved pieces and delivery addresses live here.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Action to="/shop" size="sm" withArrow>
              Continue shopping
            </Action>
            <Action to="/dashboard/orders" variant="outline" size="sm">
              My orders
            </Action>
          </div>
        </div>
      </header>

      {/* Real Statistics Cards */}
      <section aria-label="Order summary statistics" className="grid gap-4 sm:grid-cols-3">
        {/* Total Orders Card */}
        <div className="flex flex-col justify-between rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-medium text-graphite">Total Orders</span>
            <div className="grid size-8 place-items-center rounded-lg bg-bone text-graphite">
              <Package size={16} strokeWidth={1.8} aria-hidden />
            </div>
          </div>
          <div className="mt-3">
            {orders.isLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <span className="font-mono text-3xl font-bold tracking-tight text-ink tabular-nums">
                {String(totalOrders).padStart(2, '0')}
              </span>
            )}
            <p className="mt-1 text-[11.5px] text-graphite">All orders placed with this account</p>
          </div>
        </div>

        {/* Pending Orders Card */}
        <div className="flex flex-col justify-between rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-medium text-graphite">Pending Orders</span>
            <div className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <Clock size={16} strokeWidth={1.8} aria-hidden />
            </div>
          </div>
          <div className="mt-3">
            {orders.isLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <span className="font-mono text-3xl font-bold tracking-tight text-ink tabular-nums">
                {String(pendingOrders).padStart(2, '0')}
              </span>
            )}
            <p className="mt-1 text-[11.5px] text-graphite">Awaiting confirmation or payment</p>
          </div>
        </div>

        {/* Delivered Orders Card */}
        <div className="flex flex-col justify-between rounded-xl border border-line bg-paper-pure p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-medium text-graphite">Delivered Orders</span>
            <div className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={16} strokeWidth={1.8} aria-hidden />
            </div>
          </div>
          <div className="mt-3">
            {orders.isLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <span className="font-mono text-3xl font-bold tracking-tight text-ink tabular-nums">
                {String(deliveredOrders).padStart(2, '0')}
              </span>
            )}
            <p className="mt-1 text-[11.5px] text-graphite">Successfully fulfilled orders</p>
          </div>
        </div>
      </section>

      {/* Quick Navigation Cards */}
      <section aria-label="Account quick navigation" className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/dashboard/orders"
          className="group flex items-center justify-between rounded-lg border border-line bg-paper p-4 transition-all hover:border-ink hover:bg-bone/40"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md bg-canvas text-ink">
              <Package size={16} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-ink">My Orders</p>
              <p className="text-[11.5px] text-graphite">View order history & tracking</p>
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-ash transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </Link>

        <Link
          to="/dashboard/addresses"
          className="group flex items-center justify-between rounded-lg border border-line bg-paper p-4 transition-all hover:border-ink hover:bg-bone/40"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md bg-canvas text-ink">
              <MapPin size={16} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-ink">Delivery Addresses</p>
              <p className="text-[11.5px] text-graphite">Manage shipping locations</p>
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-ash transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </Link>

        <Link
          to="/dashboard/profile"
          className="group flex items-center justify-between rounded-lg border border-line bg-paper p-4 transition-all hover:border-ink hover:bg-bone/40"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-md bg-canvas text-ink">
              <User size={16} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold text-ink">Account Profile</p>
              <p className="text-[11.5px] text-graphite">Personal details & security</p>
            </div>
          </div>
          <ChevronRight
            size={16}
            className="text-ash transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
          />
        </Link>
      </section>

      {/* Main Grid: Left = Recent Orders, Right = Bag & Saved Pieces */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className={`${WIDE} flex flex-col`}>
          <PanelHeader
            title="Recent orders"
            hint="The last five orders, newest first."
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

        {/* Right Side: Bag and Wishlist summaries */}
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
                  <Heart size={14} className="text-ash" />
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

        {/* Full-width bottom row: Addresses and Assistance */}
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
          <PanelHeader title="Need assistance?" />
          <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
            <p className="text-[13.5px] leading-relaxed text-graphite">
              Review your saved delivery locations before checkout, or check an existing order for
              live status and digital receipts.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Action to="/dashboard/orders" variant="outline" size="sm">
                Track orders
              </Action>
              <Action to="/dashboard/addresses" variant="ghost" size="sm">
                Delivery details
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
