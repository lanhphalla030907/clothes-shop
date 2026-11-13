import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard, AdminCardHeader } from '@/components/admin/AdminCard'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import {
  fetchFinanceOverview,
  fetchFinanceRevenueTrend,
} from '@/features/finance/api'
import { fetchAdminCustomerStats } from '@/features/adminCustomers/api'
import {
  useAdminBestSellers,
  useAdminProducts,
} from '@/features/adminProducts/useAdminProducts'
import { fetchOrderStatusCounts, fetchRecentOrders } from '@/features/adminDashboard/api'
import { BestSellersPanel } from '@/features/adminDashboard/components/BestSellersPanel'
import { InventoryStockAlerts } from '@/features/adminDashboard/components/InventoryStockAlerts'
import { KpiGrid } from '@/features/adminDashboard/components/KpiGrid'
import { OrderStatusOverview } from '@/features/adminDashboard/components/OrderStatusOverview'
import { PaymentBreakdownDonut } from '@/features/adminDashboard/components/PaymentBreakdownDonut'
import { PeriodSelector } from '@/features/adminDashboard/components/PeriodSelector'
import { QuickActions } from '@/features/adminDashboard/components/QuickActions'
import { RecentOrdersPanel } from '@/features/adminDashboard/components/RecentOrdersPanel'
import { SalesOrdersTrendChart } from '@/features/adminDashboard/components/SalesOrdersTrendChart'
import { useDashboardFilters } from '@/features/adminDashboard/hooks/useDashboardFilters'
import {
  formatReportingRange,
  granularityForRange,
  toReportingEndTimestamp,
  toReportingStartTimestamp,
} from '@/features/adminDashboard/reporting'
import { toUserMessage } from '@/lib/api/errors'

/**
 * The store overview: money, orders and operations for the whole business.
 *
 * Every figure comes from an existing admin API. The selected period is shared
 * by the finance, trend and order panels; recent orders stay "latest overall" and
 * customers/products are lifetime counters. Amounts are never added across
 * currencies — the finance API returns them per currency and so does this page.
 *
 * Catalogue records keep their own dashboard at `/admin/products/overview`.
 */
export default function AdminDashboard() {
  const filters = useDashboardFilters()
  const granularity = granularityForRange(filters.range)
  const createdFrom = toReportingStartTimestamp(filters.range.from)
  const createdTo = toReportingEndTimestamp(filters.range.to)

  const finance = useAsyncResource(
    (signal) =>
      fetchFinanceOverview(
        {
          from: filters.range.from,
          to: filters.range.to,
          basis: 'delivered',
        },
        signal,
      ),
    [filters.range.from, filters.range.to],
  )

  const trend = useAsyncResource(
    (signal) =>
      fetchFinanceRevenueTrend(
        {
          from: filters.range.from,
          to: filters.range.to,
          basis: 'delivered',
          granularity,
        },
        signal,
      ),
    [filters.range.from, filters.range.to, granularity],
  )

  const orderCounts = useAsyncResource(
    (signal) => fetchOrderStatusCounts({ createdFrom, createdTo }, signal),
    [createdFrom, createdTo],
  )

  // Recent orders are the latest overall, not the latest inside the period: the
  // operator wants to see what just happened even when reviewing last month.
  const recentOrders = useAsyncResource(
    (signal) => fetchRecentOrders(7, signal),
    [],
  )

  const customers = useAsyncResource(
    (signal) => fetchAdminCustomerStats(signal),
    [],
  )

  const products = useAdminProducts({})
  const bestSellers = useAdminBestSellers(6)

  const cashRows = finance.data?.cashByCurrency ?? []
  const trendSeries = trend.data?.series ?? []
  const availableCurrencies = Array.from(
    new Set([
      ...cashRows.map((row) => row.currency),
      ...trendSeries.map((series) => series.currency),
    ]),
  ).sort((a, b) => {
    // Prefer the store's primary currency, then keep the rest deterministic.
    if (a === 'USD') return -1
    if (b === 'USD') return 1
    return a.localeCompare(b)
  })

  const activeCurrency =
    filters.currency && availableCurrencies.includes(filters.currency)
      ? filters.currency
      : availableCurrencies[0]

  const activeSeries =
    trendSeries.find((series) => series.currency === activeCurrency) ??
    trendSeries[0]

  const chartCurrency = activeSeries?.currency ?? activeCurrency

  const kpiError =
    finance.error ?? orderCounts.error ?? customers.error ?? products.error

  const retryKpis = () => {
    if (finance.error !== undefined) finance.refetch()
    if (orderCounts.error !== undefined) orderCounts.refetch()
    if (customers.error !== undefined) customers.refetch()
    if (products.error !== undefined) products.refetch()
  }

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Store"
        title="Store Overview"
        description="Your store performance at a glance. Monitor sales, orders, payments, customers, and operations."
        action={
          <Action to="/admin/products/overview" variant="outline" size="sm">
            Product dashboard
          </Action>
        }
      />

      <PeriodSelector
        preset={filters.preset}
        range={filters.range}
        isRefreshing={
          finance.isRefreshing ||
          trend.isRefreshing ||
          orderCounts.isRefreshing
        }
        onPreset={filters.applyPreset}
        onCustom={filters.applyCustom}
      />

      {kpiError !== undefined && (
        <ErrorState message={toUserMessage(kpiError)} onRetry={retryKpis} />
      )}

      <KpiGrid
        overview={finance.data?.byCurrency}
        cash={finance.data?.cashByCurrency}
        orderCounts={orderCounts.data}
        customerStats={customers.data}
        productCount={products.data?.length}
        financeLoading={finance.isLoading}
        ordersLoading={orderCounts.isLoading}
        customersLoading={customers.isLoading}
        productsLoading={products.isLoading}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminCard className="xl:col-span-2">
          <AdminCardHeader
            title="Sales & orders trend"
            description={`Net revenue and order count for ${formatReportingRange(filters.range)}.`}
            action={
              availableCurrencies.length > 1 ? (
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Trend currency"
                >
                  {availableCurrencies.map((currency) => (
                    <button
                      key={currency}
                      type="button"
                      aria-pressed={currency === chartCurrency}
                      onClick={() => filters.setCurrency(currency)}
                      className={`min-h-8 rounded-lg border px-2.5 font-mono text-[11.5px] font-semibold transition-colors ${
                        currency === chartCurrency
                          ? 'border-ink bg-ink text-paper'
                          : 'border-line bg-paper-pure text-ink hover:border-ink'
                      }`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          />
          <div className="p-5 sm:p-6">
            {trend.isLoading ? (
              <div className="space-y-3" role="status" aria-busy="true">
                <span className="sr-only">Loading sales and orders trend</span>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ) : trend.error !== undefined ? (
              <ErrorState
                message={toUserMessage(trend.error)}
                onRetry={trend.refetch}
              />
            ) : activeSeries === undefined ||
              activeSeries.buckets.length === 0 ? (
              <EmptyState
                align="left"
                eyebrow="No trend"
                title="No sales in this reporting window"
                description="Choose a wider period, or wait for the first delivered order in this range."
              />
            ) : (
              <SalesOrdersTrendChart
                buckets={activeSeries.buckets}
                currency={activeSeries.currency}
                granularity={trend.data!.granularity}
                range={trend.data!.range}
                timezone={trend.data!.timezone}
              />
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Payment collection breakdown"
            description="Collected cash by payment method."
          />
          <div className="p-5 sm:p-6">
            {finance.isLoading ? (
              <div className="space-y-3" role="status" aria-busy="true">
                <span className="sr-only">Loading payment collection</span>
                <Skeleton className="h-36 w-36 self-center rounded-full" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            ) : finance.error !== undefined ? (
              <ErrorState
                message={toUserMessage(finance.error)}
                onRetry={finance.refetch}
              />
            ) : (
              <PaymentBreakdownDonut
                rows={cashRows}
                currency={activeCurrency}
                onCurrencyChange={filters.setCurrency}
              />
            )}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Order status overview"
          description="Orders created in the selected period. Click a status to review those orders."
          action={
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-graphite transition-colors hover:text-ink"
            >
              <span>All orders</span>
              <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
            </Link>
          }
        />
        <div className="p-5 sm:p-6">
          {orderCounts.error !== undefined ? (
            <ErrorState
              message={toUserMessage(orderCounts.error)}
              onRetry={orderCounts.refetch}
            />
          ) : (
            <OrderStatusOverview
              counts={orderCounts.data}
              isLoading={orderCounts.isLoading}
            />
          )}
        </div>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminCard className="xl:col-span-2">
          <AdminCardHeader
            title="Recent orders"
            description="The latest orders across every status."
            action={
              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-graphite transition-colors hover:text-ink"
              >
                <span>View all orders</span>
                <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
              </Link>
            }
          />
          {recentOrders.error !== undefined ? (
            <div className="p-5 sm:p-6">
              <ErrorState
                message={toUserMessage(recentOrders.error)}
                onRetry={recentOrders.refetch}
              />
            </div>
          ) : (
            <RecentOrdersPanel
              orders={recentOrders.data?.items}
              isLoading={recentOrders.isLoading}
            />
          )}
        </AdminCard>

        <AdminCard>
          <AdminCardHeader
            title="Best-selling products"
            description="All-time units sold and revenue."
            action={
              <Link
                to="/admin/products/overview"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-graphite transition-colors hover:text-ink"
              >
                <span>Products</span>
                <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
              </Link>
            }
          />
          {bestSellers.error !== undefined ? (
            <div className="p-5">
              <ErrorState
                message={toUserMessage(bestSellers.error)}
                onRetry={bestSellers.refetch}
              />
            </div>
          ) : (
            <BestSellersPanel
              items={bestSellers.data}
              isLoading={bestSellers.isLoading}
            />
          )}
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader
          title="Inventory stock"
          description="Variants that need attention, based on available stock."
          action={
            <Link
              to="/admin/product-variants"
              className="inline-flex min-h-9 items-center rounded-lg border border-line bg-paper px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-ink"
            >
              Manage stock
            </Link>
          }
        />
        <InventoryStockAlerts />
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Quick actions"
          description="Jump straight to an existing admin workspace."
        />
        <QuickActions />
      </AdminCard>
    </div>
  )
}
