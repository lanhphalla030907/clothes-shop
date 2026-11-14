import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  FileEdit,
  FolderTree,
  Package,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminCard, AdminCardHeader } from '@/components/admin/AdminCard'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { Money } from '@/components/account/Bits'
import { ProductStatusBadge } from '@/features/adminProducts/components/ProductBadges'
import {
  useAdminCategories,
  useAdminProducts,
  useAdminBestSellers,
} from '@/features/adminProducts/useAdminProducts'
import { fetchStockAlerts } from '@/features/adminDashboard/api'
import { InventorySummary } from '@/features/adminDashboard/components/InventorySummary'
import InventoryStockTable from '@/features/adminProducts/components/InventoryStockTable'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { toUserMessage } from '@/lib/api/errors'
import type { StockAlertsResponse } from '@/types/api'

/**
 * The product-focused dashboard.
 *
 * This is the store dashboard's catalogue content, moved intact from `/admin`:
 * the same product/category queries, the same recently updated list, the same
 * best sellers and the same shortcuts. The store overview at `/admin` is the new
 * home for sales, orders and cash.
 */
export default function ProductOverview() {
  const { user } = useAuth()
  const products = useAdminProducts({})
  const categories = useAdminCategories()
  const bestSellers = useAdminBestSellers(10)

  const stock = useAsyncResource<StockAlertsResponse>(
    (signal) => fetchStockAlerts({ page: 1, limit: 10, status: 'all' }, signal),
    [],
  )

  const list = products.data ?? []
  const active = list.filter(
    (product) => product.status === 'ACTIVE' && product.isActive,
  ).length
  const drafts = list.filter((product) => product.status === 'DRAFT').length
  const archived = list.filter((product) => product.status === 'ARCHIVED').length
  const activeCategories = (categories.data ?? []).filter(
    (category) => category.isActive,
  ).length
  const recent = [...list]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Product Overview"
        description={`Signed in as ${
          displayName(user) || 'an administrator'
        }. Catalogue records, gallery media, variants, options and stock are managed here; customers are managed on the Customers page. Delivery staff accounts are managed on the Delivery staff page.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Action to="/admin" variant="outline" size="sm">
              Store overview
            </Action>
            <Action to="/admin/products/new" size="sm" withArrow>
              New product
            </Action>
          </div>
        }
      />

      <section aria-label="Catalogue summary">
        {products.error !== undefined || categories.error !== undefined ? (
          <ErrorState
            message={toUserMessage(products.error ?? categories.error)}
            onRetry={() => {
              if (products.error !== undefined) products.refetch()
              if (categories.error !== undefined) categories.refetch()
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            <AdminStatCard
              label="Total Products"
              value={list.length}
              loading={products.isLoading}
              hint="All catalogue records"
              icon={Package}
            />
            <AdminStatCard
              label="Active"
              value={active}
              loading={products.isLoading}
              hint="Live on storefront"
              icon={CheckCircle2}
            />
            <AdminStatCard
              label="Drafts"
              value={drafts}
              loading={products.isLoading}
              hint="Unpublished drafts"
              icon={FileEdit}
            />
            <AdminStatCard
              label="Archived"
              value={archived}
              loading={products.isLoading}
              hint="Withdrawn records"
              icon={Archive}
            />
            <AdminStatCard
              label="Categories"
              value={categories.data?.length ?? 0}
              loading={categories.isLoading}
              hint={`${activeCategories} active`}
              icon={FolderTree}
            />
          </div>
        )}
      </section>

      <section aria-label="Inventory summary">
        {stock.error !== undefined ? (
          <ErrorState
            message={toUserMessage(stock.error)}
            onRetry={stock.refetch}
          />
        ) : (
          <InventorySummary
            summary={stock.data?.summary}
            loading={stock.isLoading}
          />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <AdminCardHeader
            title="Recently updated"
            description="The five products edited most recently."
            action={
              <Link
                to="/admin/products"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-graphite transition-colors hover:text-ink"
              >
                <span>View catalogue</span>
                <ArrowUpRight size={13} strokeWidth={1.8} aria-hidden />
              </Link>
            }
          />

          {products.isLoading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : products.error !== undefined ? (
            <div className="p-5 sm:p-6">
              <ErrorState
                message={toUserMessage(products.error)}
                onRetry={products.refetch}
              />
            </div>
          ) : recent.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                align="left"
                eyebrow="No products"
                title="The catalogue is empty"
                description="Create the first product to start building the release."
                action={
                  <Action to="/admin/products/new" size="sm" withArrow>
                    New product
                  </Action>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {recent.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/admin/products/${product.id}`}
                    className="group flex flex-col justify-between gap-2 px-4 py-3.5 transition-colors hover:bg-bone/50 sm:flex-row sm:items-center sm:gap-3 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink group-hover:text-ink">
                        {product.name}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-graphite">
                        /{product.slug}
                      </p>
                    </div>

                    <div className="mt-1 flex shrink-0 items-center justify-between gap-3 sm:mt-0 sm:w-auto sm:justify-end">
                      <ProductStatusBadge status={product.status} />
                      <Money
                        amount={product.basePrice}
                        className="text-[13px] font-semibold"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <div className="space-y-6">
          <AdminCard>
            <div className="flex items-center gap-2 border-b border-line px-5 py-4">
              <div className="grid size-7 place-items-center rounded-md bg-amber-50 text-amber-600">
                <Trophy size={15} strokeWidth={1.8} aria-hidden />
              </div>
              <h2 className="text-[14.5px] font-semibold text-ink">
                Best Sellers
              </h2>
            </div>
            {bestSellers.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : bestSellers.error ? (
              <div className="p-4">
                <ErrorState
                  message={toUserMessage(bestSellers.error)}
                  onRetry={bestSellers.refetch}
                />
              </div>
            ) : (bestSellers.data?.length ?? 0) === 0 ? (
              <div className="p-4">
                <EmptyState
                  align="left"
                  title="No sales yet"
                  description="Best-selling products will appear here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-line-soft">
                {bestSellers.data!.slice(0, 6).map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-bone font-mono text-[11px] font-semibold text-graphite">
                      {item.rank}
                    </span>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="size-9 shrink-0 rounded-md bg-bone object-cover"
                      />
                    ) : (
                      <div className="size-9 shrink-0 rounded-md bg-bone" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-graphite">
                          {item.unitsSold} sold
                        </p>
                      </div>
                      <Money
                        amount={String(item.revenue ?? '0')}
                        className="shrink-0 text-[11px] font-semibold sm:text-xs"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard>
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="text-[14px] font-semibold text-ink">
                Quick Shortcuts
              </h2>
            </div>
            <div className="space-y-0.5 p-2">
              <Link
                to="/admin/products"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-bone"
              >
                <Package
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden
                  className="text-graphite"
                />
                <span className="flex-1">Manage Products</span>
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.8}
                  aria-hidden
                  className="text-ash"
                />
              </Link>
              <Link
                to="/admin/categories"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-bone"
              >
                <FolderTree
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden
                  className="text-graphite"
                />
                <span className="flex-1">Category Hierarchy</span>
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.8}
                  aria-hidden
                  className="text-ash"
                />
              </Link>
              <Link
                to="/admin/customers"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-bone"
              >
                <Users
                  size={15}
                  strokeWidth={1.8}
                  aria-hidden
                  className="text-graphite"
                />
                <span className="flex-1">Customers Directory</span>
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.8}
                  aria-hidden
                  className="text-ash"
                />
              </Link>
            </div>
          </AdminCard>

          <div className="rounded-xl border border-line-soft bg-paper-pure p-5 shadow-2xs">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-graphite uppercase">
              <Sparkles size={13} className="text-amber-500" />
              <span>Studio Architecture</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-graphite">
              Products, categories, images, variants, options and stock are
              managed here. Customers and delivery staff accounts are accessible
              via dedicated sections.
            </p>
          </div>
        </div>
      </div>

      <section aria-label="Inventory stock table">
        <InventoryStockTable />
      </section>
    </div>
  )
}
