import { useParams } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { DefinitionRow, Money } from '@/components/account/Bits'
import { SkeletonCard } from '@/components/account/Skeleton'
import { fetchAdminCustomer } from '@/features/adminCustomers/api'
import {
  formatCustomerDate,
  formatCustomerDateTime,
  formatCustomerMoney,
} from '@/features/adminCustomers/rules'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import type { AdminCustomerDetail } from '@/types/api'

/**
 * Read-only customer detail.
 *
 * Profile, contact, account status, order aggregates and spending per currency,
 * recent orders and the address book. Nothing here can change a customer —
 * there are no edit or delete actions by design.
 */
export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()

  const customer = useAsyncResource<AdminCustomerDetail>(
    (signal) =>
      id !== undefined ? fetchAdminCustomer(id, signal) : Promise.reject(new Error('No customer id')),
    [id],
  )

  const data = customer.data
  const hasOrders = data !== undefined && data.totalOrders > 0

  if (customer.isLoading) {
    return (
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Customers" title="Customer" description="" />
        <SkeletonCard rows={4} />
      </div>
    )
  }

  if (customer.error !== undefined) {
    return (
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Customers" title="Customer" description="" />
        <ErrorState message={toUserMessage(customer.error)} onRetry={customer.refetch} />
      </div>
    )
  }

  if (data === undefined) {
    return (
      <div className="space-y-8">
        <AdminPageHeader eyebrow="Customers" title="Customer" description="" />
        <EmptyState
          align="left"
          eyebrow="Not found"
          title="This customer does not exist"
          description="The id may belong to an administrator or delivery staff account, which are not customer records."
          action={
            <Action to="/admin/customers" size="sm" variant="outline">
              <ArrowLeft size={14} strokeWidth={1.6} aria-hidden />
              Back to customers
            </Action>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Customers"
        title="Customer"
        description={`Account ${data.firstName} ${data.lastName} — read-only profile, order history and address book.`}
        action={
          <Action to="/admin/customers" size="sm" variant="outline">
            <ArrowLeft size={14} strokeWidth={1.6} aria-hidden />
            Back to customers
          </Action>
        }
      />

      <section
        aria-label="Customer profile"
        className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-bone text-graphite">
                <User size={18} strokeWidth={1.8} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-graphite/80">
                  Customer profile
                </p>
                <h2 className="mt-0.5 text-xl font-semibold tracking-[-0.015em] text-ink">
                  {data.firstName} {data.lastName}
                </h2>
                <p className="mt-0.5 break-all text-[13.5px] text-graphite">{data.email}</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-px overflow-hidden rounded-lg bg-line sm:grid-cols-2">
              <DefinitionRow label="Customer id">{data.id}</DefinitionRow>
              <DefinitionRow label="Phone">{data.phone ?? '—'}</DefinitionRow>
              <DefinitionRow label="Email verified">
                {formatCustomerDateTime(data.emailVerifiedAt)}
              </DefinitionRow>
              <DefinitionRow label="Last login">{formatCustomerDateTime(data.lastLoginAt)}</DefinitionRow>
              <DefinitionRow label="Registered">{formatCustomerDate(data.createdAt)}</DefinitionRow>
              <DefinitionRow label="Last updated">{formatCustomerDate(data.updatedAt)}</DefinitionRow>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <CustomerStatusBadge status={data.status} />
          </div>
        </div>
      </section>

      <section
        aria-label="Order summary"
        className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs"
      >
        <div className="border-b border-line bg-canvas/40 px-5 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold text-ink">Order summary</h2>
        </div>
        <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          <DefinitionRow label="Total orders">{data.totalOrders}</DefinitionRow>
          <DefinitionRow label="Cancelled orders">{data.cancelledOrders}</DefinitionRow>
          <DefinitionRow label="Spending orders">{data.spendingOrders}</DefinitionRow>
          <DefinitionRow label="Average order value">
            {data.averageOrderValueByCurrency.length === 0
              ? '—'
              : data.averageOrderValueByCurrency.map((entry) => formatCustomerMoney(entry)).join(' · ')}
          </DefinitionRow>
          <DefinitionRow label="Total spent">
            {data.totalSpentByCurrency.length === 0
              ? '—'
              : data.totalSpentByCurrency.map((entry) => formatCustomerMoney(entry)).join(' · ')}
          </DefinitionRow>
          <DefinitionRow label="Last order">
            {data.lastOrderAt === null ? '—' : formatCustomerDate(data.lastOrderAt)}
          </DefinitionRow>
        </dl>
      </section>

      {hasOrders && (
        <section
          aria-label="Recent orders"
          className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs"
        >
          <div className="border-b border-line bg-canvas/40 px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold text-ink">Recent orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-canvas/40">
                  <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                    Order
                  </th>
                  <th className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                    Total
                  </th>
                  <th className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                    Items
                  </th>
                  <th className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                    Placed
                  </th>
                  <th className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-bone/40">
                    <td className="px-5 py-3.5 font-mono text-[12.5px] font-medium text-ink">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <OrderStatusPill status={order.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Money amount={order.totalAmount} currency={order.currency} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[12.5px] tabular-nums text-ink">
                      {order.itemCount}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-graphite">
                      {formatCustomerDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-[12.5px] text-graphite">
                      {order.isPaid ? 'Paid' : 'Not paid'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section
        aria-label="Address book"
        className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs"
      >
        <div className="border-b border-line bg-canvas/40 px-5 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold text-ink">Address book</h2>
        </div>
        {data.addresses.length === 0 ? (
          <div className="p-5 sm:p-6">
            <p className="text-[13px] text-graphite">
              No saved addresses. Orders were placed with one-off shipping details.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-line-soft">
            {data.addresses.map((address) => (
              <div key={address.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{address.label}</p>
                    <p className="mt-0.5 text-[12.5px] text-graphite">{address.recipientName}</p>
                  </div>
                  {address.isDefault && (
                    <span className="inline-flex h-6 items-center rounded-md border border-success/25 bg-success-soft px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-success">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-line text-[12.5px] text-ink">
                  {address.addressLine1}
                  {address.addressLine2 !== null && address.addressLine2 !== '' ? (
                    <>
                      <br />
                      {address.addressLine2}
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-[12px] text-graphite">
                  {[address.city, address.stateProvince, address.postalCode, address.countryCode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <p className="mt-1 font-mono text-[12px] text-graphite">{address.phone}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CustomerStatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return (
    <span
      className={`inline-flex h-6 items-center rounded-md border px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
        active ? 'border-line bg-bone text-ink' : 'border-signal/25 bg-signal-soft text-signal'
      }`}
    >
      {status}
    </span>
  )
}

function OrderStatusPill({ status }: { status: string }) {
  const tone =
    status === 'CANCELLED'
      ? 'border-signal/25 bg-signal-soft text-signal'
      : status === 'DELIVERED'
        ? 'border-success/25 bg-success-soft text-success'
        : status === 'SHIPPED'
          ? 'border-info/25 bg-info-soft text-info'
          : 'border-line bg-bone text-ink'

  return (
    <span
      className={`inline-flex h-6 items-center rounded-md border px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] ${tone}`}
    >
      {status}
    </span>
  )
}
