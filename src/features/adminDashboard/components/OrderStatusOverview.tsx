import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Skeleton } from '@/components/account/Skeleton'
import { ORDER_STATUS_OPTIONS } from '@/features/adminOrders/rules'
import type { OrderStatus } from '@/types/api'
import { formatCount } from '@/features/finance/utils'
import {
  sumOrderStatusCounts,
} from '../reporting'
import type { OrderStatusCounts } from '../api'

type StatusMeta = {
  label: string
  tone: string
  dot: string
}

/** Dashboard wording matches the brief; order screens keep their own labels. */
const STATUS_META: Record<OrderStatus, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    tone: 'border-amber-200/80 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    tone: 'border-sky-200/80 bg-sky-50 text-sky-800',
    dot: 'bg-sky-500',
  },
  PROCESSING: {
    label: 'Processing',
    tone: 'border-indigo-200/80 bg-indigo-50 text-indigo-800',
    dot: 'bg-indigo-500',
  },
  SHIPPED: {
    label: 'Shipped',
    tone: 'border-blue-200/80 bg-blue-50 text-blue-800',
    dot: 'bg-blue-500',
  },
  DELIVERED: {
    label: 'Delivered',
    tone: 'border-emerald-200/80 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Cancelled',
    tone: 'border-rose-200/80 bg-rose-50 text-rose-800',
    dot: 'bg-rose-500',
  },
}

type OrderStatusOverviewProps = {
  counts?: OrderStatusCounts
  isLoading: boolean
}

/**
 * Every order status as a link to the existing filtered order list.
 *
 * Counts come from six real listing totals for the selected creation period.
 * No status is inferred from another, and no missing status is shown as zero.
 */
export function OrderStatusOverview({
  counts,
  isLoading,
}: OrderStatusOverviewProps) {
  const total = counts === undefined ? undefined : sumOrderStatusCounts(counts)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[12px] text-graphite">
          Counts for orders created in the selected period.
        </p>
        <p className="text-[12px] text-graphite" aria-live="polite">
          {total === undefined ? 'Loading total…' : `${formatCount(total)} total`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {ORDER_STATUS_OPTIONS.map((status) => {
          const meta = STATUS_META[status]
          const count = counts?.[status]

          if (isLoading && counts === undefined) {
            return (
              <div
                key={status}
                className="rounded-lg border border-line bg-paper-pure p-3.5"
              >
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-3 h-7 w-10" />
              </div>
            )
          }

          return (
            <Link
              key={status}
              to={`/admin/orders?status=${status}`}
              className={`group rounded-lg border p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${meta.tone}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold">
                  <span
                    aria-hidden
                    className={`size-1.5 rounded-full ${meta.dot}`}
                  />
                  {meta.label}
                </span>
                <ArrowUpRight
                  size={12}
                  strokeWidth={1.8}
                  aria-hidden
                  className="opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </span>
              <span className="mt-1.5 block font-mono text-[1.4rem] font-semibold tracking-tight tabular-nums">
                {count === undefined ? '—' : formatCount(count)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
