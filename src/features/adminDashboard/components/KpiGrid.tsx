import {
  Banknote,
  ClipboardList,
  Clock3,
  Package,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { formatCount } from '@/features/finance/utils'
import { formatMoney } from '@/lib/money'
import type {
  AdminCustomerStats,
  CashReconciliationCurrency,
  FinanceOverviewCurrency,
  MoneyString,
} from '@/types/api'
import {
  sumOrderStatusCounts,
} from '../reporting'
import type { OrderStatusCounts } from '../api'

type KpiGridProps = {
  overview?: FinanceOverviewCurrency[]
  cash?: CashReconciliationCurrency[]
  orderCounts?: OrderStatusCounts
  customerStats?: AdminCustomerStats
  productCount?: number
  financeLoading: boolean
  ordersLoading: boolean
  customersLoading: boolean
  productsLoading: boolean
}

type MoneyLine = {
  currency: string
  amount: MoneyString
}

const moneyLines = <T extends { currency: string }>(
  rows: readonly T[] | undefined,
  valueOf: (row: T) => MoneyString,
): MoneyLine[] =>
  (rows ?? []).map((row) => ({
    currency: row.currency,
    amount: valueOf(row),
  }))

const MoneyStack = ({
  lines,
  large = false,
}: {
  lines: MoneyLine[]
  large?: boolean
}) => {
  if (lines.length === 0) {
    return <span className="text-[1.5rem] text-ash">—</span>
  }

  return (
    <span className="flex flex-col gap-0.5">
      {lines.map((line) => (
        <span
          key={line.currency}
          className={`font-mono font-semibold tracking-tight text-ink tabular-nums ${
            large ? 'text-[1.45rem]' : 'text-[1.25rem]'
          }`}
        >
          {formatMoney(line.amount, line.currency)}
        </span>
      ))}
    </span>
  )
}

/**
 * The headline store counters.
 *
 * Revenue and cash are per currency — the finance API never combines currencies,
 * so neither does this grid. Orders, customers and products are counts and are
 * not currency-specific. Every hint says whether the figure covers the selected
 * period or the lifetime of the store.
 */
export function KpiGrid({
  overview,
  cash,
  orderCounts,
  customerStats,
  productCount,
  financeLoading,
  ordersLoading,
  customersLoading,
  productsLoading,
}: KpiGridProps) {
  const revenueLines = moneyLines(overview, (row: FinanceOverviewCurrency) => row.netRevenue)
  const cashLines = moneyLines(cash, (row: CashReconciliationCurrency) => row.cashCollected)
  const orderTotal =
    orderCounts === undefined ? undefined : sumOrderStatusCounts(orderCounts)

  return (
    <section aria-label="Store summary" className="space-y-3">
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
        <AdminStatCard
          label="Total revenue"
          value={<MoneyStack lines={revenueLines} large />}
          loading={financeLoading}
          hint="Net revenue · selected period · delivered basis"
          icon={ShoppingBag}
          emphasis
        />
        <AdminStatCard
          label="Total orders"
          value={orderTotal === undefined ? '—' : formatCount(orderTotal)}
          loading={ordersLoading}
          hint="Every status · created in selected period"
          icon={ClipboardList}
          emphasis
        />
        <AdminStatCard
          label="Total customers"
          value={
            customerStats === undefined
              ? '—'
              : formatCount(customerStats.totalCustomers)
          }
          loading={customersLoading}
          hint="Lifetime customer accounts"
          icon={UserRound}
        />
        <AdminStatCard
          label="Total products"
          value={productCount === undefined ? '—' : formatCount(productCount)}
          loading={productsLoading}
          hint="Lifetime catalogue records"
          icon={Package}
        />
        <AdminStatCard
          label="Pending orders"
          value={
            orderCounts === undefined ? '—' : formatCount(orderCounts.PENDING)
          }
          loading={ordersLoading}
          hint="Created in selected period · needs attention"
          icon={Clock3}
        />
        <AdminStatCard
          label="Cash collected"
          value={<MoneyStack lines={cashLines} />}
          loading={financeLoading}
          hint="Received in selected period · ABA and COD"
          icon={Banknote}
        />
      </div>

      {revenueLines.length > 1 && (
        <p className="text-[11.5px] text-graphite">
          Revenue and cash are shown per currency. Amounts in different
          currencies are never added together.
        </p>
      )}
    </section>
  )
}
