import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { PageHeader } from '@/components/account/PageHeader'
import { Money, StatusBadge } from '@/components/account/Bits'
import { EmptyState, ErrorState } from '@/components/account/States'
import { SkeletonCard } from '@/components/account/Skeleton'
import { useOrders } from '@/features/orders/useOrders'
import { ORDER_STATUS, type OrderSummary, type OrderStatus } from '@/types/api'
import { toUserMessage } from '@/lib/api/errors'

/**
 * Every order this account has placed.
 *
 * Read-only, because the API has no way to change an order — so there is no
 * cancel button, no reorder and no "pay now" here. An order awaiting payment is
 * finished from the checkout screen, and offering the action in two places would
 * mean two places to keep correct.
 */

const FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const

type Filter = (typeof FILTERS)[number]['value']

/**
 * "Open" means anything still moving. Filtering happens here rather than
 * server-side because `GET /orders` takes no parameters — the whole list is
 * already on screen, so a round trip to narrow it would be slower for no gain.
 */
const matches = (status: OrderStatus, filter: Filter): boolean => {
  if (filter === 'ALL') return true
  if (filter === 'DELIVERED') return status === ORDER_STATUS.DELIVERED
  if (filter === 'CANCELLED') return status === ORDER_STATUS.CANCELLED
  return status !== ORDER_STATUS.DELIVERED && status !== ORDER_STATUS.CANCELLED
}

export default function Orders() {
  const orders = useOrders()
  const [filter, setFilter] = useState<Filter>('ALL')

  const visible = (orders.data ?? []).filter((order) => matches(order.status, filter))

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Orders"
        description="Each order is a snapshot: the pieces, the prices you paid and the address are exactly as they were when you placed it."
      />

      {orders.isLoading ? (
        <div className="space-y-4">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </div>
      ) : orders.error ? (
        <ErrorState message={toUserMessage(orders.error)} onRetry={orders.refetch} />
      ) : (orders.data?.length ?? 0) === 0 ? (
        <EmptyState
          eyebrow="No orders"
          title="You have not ordered anything yet"
          description="Once you place an order it will appear here with its status, its total and every line that made it up."
          action={
            <Action to="/dashboard/bag" withArrow>
              Go to your bag
            </Action>
          }
        />
      ) : (
        <>
          {/* Only offered when there is something to narrow — a filter row over
              one result is just noise. */}
          {(orders.data?.length ?? 0) > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((option) => {
                const isActive = option.value === filter
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    aria-pressed={isActive}
                    className={`label-micro h-9 border px-4 transition-colors duration-200 ${
                      isActive
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line bg-paper text-graphite hover:border-ink hover:text-ink'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              eyebrow="Nothing here"
              title="No orders in this view"
              description="Try a different filter to see the rest of your history."
              action={
                <Action variant="outline" size="sm" onClick={() => setFilter('ALL')}>
                  Show all orders
                </Action>
              }
            />
          ) : (
            <ul className="space-y-4">
              {visible.map((order) => (
                <li key={order.id}>
                  <OrderRow order={order} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

const OrderRow = ({ order }: { order: OrderSummary }) => (
  <Link
    to={`/dashboard/orders/${order.id}`}
    className="group block border border-line bg-paper transition-colors duration-300 hover:border-ink"
  >
    <div className="flex flex-col gap-4 border-b border-line-soft px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="font-mono text-sm text-ink">{order.orderNumber}</span>
        <StatusBadge status={order.status} />
      </div>

      <span className="text-xs text-graphite">
        {new Date(order.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    </div>

    <div className="flex flex-wrap items-end justify-between gap-6 px-6 py-5">
      <dl className="flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <dt className="label-micro text-ash">Items</dt>
          <dd className="mt-2 font-mono text-sm text-ink">
            {order.itemCount} across {order.lineCount} {order.lineCount === 1 ? 'line' : 'lines'}
          </dd>
        </div>
        <div>
          <dt className="label-micro text-ash">Delivering to</dt>
          <dd className="mt-2 text-sm text-ink">
            {order.shippingRecipientName}, {order.shippingCity}
          </dd>
        </div>
        <div>
          <dt className="label-micro text-ash">Total</dt>
          <dd className="mt-2">
            <Money amount={order.totalAmount} currency={order.currency} />
          </dd>
        </div>
      </dl>

      <span className="label-micro inline-flex items-center gap-2 text-graphite transition-colors duration-300 group-hover:text-ink">
        View
        <ArrowUpRight
          size={13}
          strokeWidth={1.5}
          aria-hidden
          className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </span>
    </div>
  </Link>
)
