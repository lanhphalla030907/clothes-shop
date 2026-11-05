import { Link } from 'react-router-dom'
import { ArrowUpRight, FolderTree, Package, Trophy, Users } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState } from '@/components/account/States'
import { Skeleton } from '@/components/account/Skeleton'
import { Money } from '@/components/account/Bits'
import { ProductStatusBadge } from '@/features/adminProducts/components/ProductBadges'
import DeliveryStaffManagement from '@/features/adminUsers/DeliveryStaffManagement'
import { useAdminCategories, useAdminProducts, useAdminBestSellers } from '@/features/adminProducts/useAdminProducts'
import { displayName, useAuth } from '@/features/auth/useAuth'
import { toUserMessage } from '@/lib/api/errors'

/**
 * The admin landing screen.
 *
 * Every figure is counted from the real admin responses — products and
 * categories. There is no admin orders, payments, customer-list or analytics
 * endpoint, so none is shown as a tile with an invented number. Customer lookup,
 * gallery media, variants and stock are real capabilities and are linked from
 * here.
 */
export default function AdminDashboard() {
  const { user } = useAuth()
  const products = useAdminProducts({})
  const categories = useAdminCategories()
  const bestSellers = useAdminBestSellers(10)

  const list = products.data ?? []
  const active = list.filter((product) => product.status === 'ACTIVE' && product.isActive).length
  const drafts = list.filter((product) => product.status === 'DRAFT').length
  const archived = list.filter((product) => product.status === 'ARCHIVED').length
  const activeCategories = (categories.data ?? []).filter((category) => category.isActive).length
  const recent = [...list]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Studio overview"
        title="Dashboard"
        description={`Signed in as ${displayName(user) || 'an administrator'}. Catalogue records, delivery staff, gallery media, variants, options and stock are managed here; customer records are lookup-only.`}
        action={
          <Action to="/admin/products/new" size="sm" withArrow>
            New product
          </Action>
        }
      />

      <DeliveryStaffManagement />

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
          <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
            <Stat
              label="Products"
              value={list.length}
              loading={products.isLoading}
              hint="All statuses"
            />
            <Stat label="Active" value={active} loading={products.isLoading} hint="Live on the storefront" />
            <Stat label="Drafts" value={drafts} loading={products.isLoading} hint="Not yet published" />
            <Stat label="Archived" value={archived} loading={products.isLoading} hint="Withdrawn records" />
            <Stat
              label="Categories"
              value={categories.data?.length}
              loading={categories.isLoading}
              hint={`${activeCategories} active`}
            />
          </dl>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="border border-line bg-paper lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Recently updated</h2>
              <p className="mt-1 text-[13px] text-graphite">The five products edited most recently.</p>
            </div>
            <Link
              to="/admin/products"
              className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-graphite transition-colors hover:text-ink"
            >
              All products
              <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden />
            </Link>
          </div>

          {products.isLoading ? (
            <div className="space-y-3 p-5 sm:p-6">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : products.error !== undefined ? (
            <div className="p-5 sm:p-6">
              <ErrorState message={toUserMessage(products.error)} onRetry={products.refetch} />
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
                    className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-bone/60 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">{product.name}</p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-graphite">
                        /{product.slug}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <ProductStatusBadge status={product.status} />
                      <Money amount={product.basePrice} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="border border-line bg-paper">
            <div className="flex items-center gap-2 border-b border-line px-5 py-4">
              <Trophy size={16} strokeWidth={1.6} aria-hidden className="text-graphite" />
              <h2 className="text-[15px] font-semibold text-ink">Best Sellers</h2>
            </div>
            {bestSellers.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : bestSellers.error ? (
              <div className="p-4">
                <ErrorState message={toUserMessage(bestSellers.error)} onRetry={bestSellers.refetch} />
              </div>
            ) : (bestSellers.data?.length ?? 0) === 0 ? (
              <div className="p-4">
                <EmptyState align="left" title="No sales yet" description="Best-selling products will appear here." />
              </div>
            ) : (
              <ul className="divide-y divide-line-soft">
                {bestSellers.data!.slice(0, 10).map((item) => (
                  <li key={item.productId} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-graphite">
                      {String(item.rank).padStart(2, '0')}
                    </span>
                    {item.image ? (
                      <img src={item.image} alt="" className="h-9 w-9 shrink-0 rounded object-cover bg-bone" />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded bg-bone" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">{item.name}</p>
                      <p className="text-[11px] text-graphite">{item.unitsSold} sold</p>
                    </div>
                    <Money amount={String(item.revenue ?? '0')} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-line bg-paper">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-semibold text-ink">Workspace</h2>
            </div>
            <div className="p-3">
              <Link
                to="/admin/products"
                className="flex min-h-12 items-center gap-3 px-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-bone"
              >
                <Package size={16} strokeWidth={1.6} aria-hidden className="text-graphite" />
                <span className="flex-1">Products</span>
                <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden className="text-ash" />
              </Link>
              <Link
                to="/admin/categories"
                className="flex min-h-12 items-center gap-3 px-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-bone"
              >
                <FolderTree size={16} strokeWidth={1.6} aria-hidden className="text-graphite" />
                <span className="flex-1">Categories</span>
                <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden className="text-ash" />
              </Link>
              <Link
                to="/admin/customers"
                className="flex min-h-12 items-center gap-3 px-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-bone"
              >
                <Users size={16} strokeWidth={1.6} aria-hidden className="text-graphite" />
                <span className="flex-1">Customer lookup</span>
                <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden className="text-ash" />
              </Link>
            </div>
          </section>

          <section className="border border-line bg-paper p-5">
            <p className="eyebrow text-graphite">Admin API coverage</p>
            <p className="mt-3 text-[13px] leading-relaxed text-graphite">
              Products, categories, images, variants, options, per-variant stock and delivery-staff
              accounts are managed here. Customer records can be looked up by id. The backend
              exposes no admin order list, order-status change, payment record, customer
              list/search or sales report, so none of those are shown here.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

const Stat = ({
  label,
  value,
  loading,
  hint,
}: {
  label: string
  value: number | undefined
  loading: boolean
  hint: string
}) => (
  <div className="bg-paper px-5 py-5 sm:px-6">
    <dt className="text-[12px] font-medium text-graphite">{label}</dt>
    <dd className="mt-2">
      {loading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <span className="font-mono text-[1.75rem] leading-none tabular-nums text-ink">
          {String(value ?? 0).padStart(2, '0')}
        </span>
      )}
      <span className="mt-2 block text-[12px] leading-relaxed text-graphite">{hint}</span>
    </dd>
  </div>
)
