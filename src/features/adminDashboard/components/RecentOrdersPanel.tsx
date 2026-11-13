import { Link } from 'react-router-dom'
import { Money, StatusBadge } from '@/components/account/Bits'
import { EmptyState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { PaymentStatusBadge } from '@/features/adminOrders/components/PaymentStatusBadge'
import {
  effectivePaymentStatus,
  formatAdminOrderDate,
  paymentCodeLabel,
} from '@/features/adminOrders/rules'
import type { AdminOrderSummary } from '@/types/api'
import { orderCustomerName } from '../reporting'

type RecentOrdersPanelProps = {
  orders?: readonly AdminOrderSummary[]
  isLoading: boolean
}

/**
 * The latest orders, with the same payment and status facts the order list uses.
 *
 * No money is recomputed: `totalAmount` and `currency` come from the order row.
 */
export function RecentOrdersPanel({
  orders,
  isLoading,
}: RecentOrdersPanelProps) {
  if (isLoading && orders === undefined) {
    return (
      <div className="space-y-3 p-5 sm:p-6" role="status" aria-busy="true">
        <span className="sr-only">Loading recent orders</span>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if ((orders?.length ?? 0) === 0) {
    return (
      <div className="p-5 sm:p-6">
        <EmptyState
          align="left"
          eyebrow="No orders"
          title="No orders have been placed yet"
          description="Orders appear here as soon as checkout creates one."
        />
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line bg-canvas/40">
              <th scope="col" className="px-5 py-3 text-[11.5px] font-medium text-graphite">
                Order
              </th>
              <th scope="col" className="px-3 py-3 text-[11.5px] font-medium text-graphite">
                Customer
              </th>
              <th scope="col" className="px-3 py-3 text-[11.5px] font-medium text-graphite">
                Date
              </th>
              <th scope="col" className="px-3 py-3 text-[11.5px] font-medium text-graphite">
                Total
              </th>
              <th scope="col" className="px-3 py-3 text-[11.5px] font-medium text-graphite">
                Payment
              </th>
              <th scope="col" className="px-3 py-3 text-[11.5px] font-medium text-graphite">
                Payment status
              </th>
              <th scope="col" className="px-5 py-3 text-[11.5px] font-medium text-graphite">
                Order status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {orders!.map((order) => (
              <tr key={order.id}>
                <td className="px-5 py-3.5">
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="font-mono text-[12.5px] font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="max-w-44 px-3 py-3.5">
                  <p className="truncate text-[13px] font-medium text-ink">
                    {orderCustomerName(order)}
                  </p>
                  <p className="truncate text-[11.5px] text-graphite">
                    {order.customer.email}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px] text-graphite">
                  {formatAdminOrderDate(order.createdAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5">
                  <Money
                    amount={order.totalAmount}
                    currency={order.currency}
                    className="font-mono text-[12.5px] font-medium"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-[12.5px] text-graphite">
                  {paymentCodeLabel(order.paymentMethod)}
                </td>
                <td className="px-3 py-3.5">
                  <PaymentStatusBadge
                    status={effectivePaymentStatus(
                      order.hasPaidPayment,
                      order.payment?.status ?? null,
                      order.paymentMethod,
                    )}
                  />
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line-soft lg:hidden">
        {orders!.map((order) => (
          <li key={order.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/admin/orders/${order.id}`}
                  className="font-mono text-[12.5px] font-medium text-ink underline-offset-4 hover:underline"
                >
                  {order.orderNumber}
                </Link>
                <p className="mt-1 truncate text-[13px] font-medium text-ink">
                  {orderCustomerName(order)}
                </p>
                <p className="truncate text-[11.5px] text-graphite">
                  {order.customer.email}
                </p>
              </div>
              <div className="text-right">
                <Money
                  amount={order.totalAmount}
                  currency={order.currency}
                  className="font-mono text-[13px] font-medium"
                />
                <p className="mt-1 text-[11.5px] text-graphite">
                  {formatAdminOrderDate(order.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <PaymentStatusBadge
                status={effectivePaymentStatus(
                  order.hasPaidPayment,
                  order.payment?.status ?? null,
                  order.paymentMethod,
                )}
              />
              <span className="text-[11.5px] text-graphite">
                {paymentCodeLabel(order.paymentMethod)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
