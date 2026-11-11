import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { Action } from '@/components/ui/Action'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState, ErrorState, InlineNotice } from '@/components/account/States'
import { SelectField, TextField } from '@/components/account/Field'
import { Money } from '@/components/account/Bits'
import { DeleteProductModal } from '@/features/adminProducts/components/DeleteProductModal'
import { ProductActiveBadge, ProductStatusBadge } from '@/features/adminProducts/components/ProductBadges'
import { deleteAdminProduct } from '@/features/adminProducts/api'
import { useAdminCategories, useAdminProducts } from '@/features/adminProducts/useAdminProducts'
import { useMutation } from '@/hooks/useMutation'
import { useFeedback } from '@/context/feedbackContext'
import { toUserMessage } from '@/lib/api/errors'
import type {
  AdminProductQuery,
  ISODateTime,
  Product,
  ProductStatus,
  UUID,
} from '@/types/api'

/**
 * The product list.
 *
 * Filter state lives in the URL (the existing storefront convention) and every
 * filter is exactly what `GET /admin/products` accepts by those names, so the
 * browser history stays shareable and the server does all the narrowing — no
 * client-side filtering. There is no pagination because the endpoint has none;
 * the count shown is the length of the real response.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUS_VALUES: ReadonlyArray<ProductStatus> = ['DRAFT', 'ACTIVE', 'ARCHIVED']

const isProductStatus = (value: string | null): value is ProductStatus =>
  (STATUS_VALUES as readonly string[]).includes(value ?? '')

const formatUpdated = (value: ISODateTime): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProductsIndex() {
  const { showFeedback } = useFeedback()
  const [params, setParams] = useSearchParams()

  const searchParam = params.get('search') ?? ''
  const statusParam = params.get('status')
  const isActiveParam = params.get('isActive')
  const categoryIdParam = params.get('categoryId')

  const [searchDraft, setSearchDraft] = useState(searchParam)

  const appliedSearch = searchParam
  const appliedStatus = isProductStatus(statusParam) ? statusParam : undefined
  const appliedIsActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined
  const appliedCategory =
    categoryIdParam !== null && UUID_PATTERN.test(categoryIdParam) ? categoryIdParam : undefined

  const query = useMemo<AdminProductQuery>(
    () => ({
      search: appliedSearch === '' ? undefined : appliedSearch,
      status: appliedStatus,
      isActive: appliedIsActive,
      categoryId: appliedCategory,
    }),
    [appliedSearch, appliedStatus, appliedIsActive, appliedCategory],
  )

  const products = useAdminProducts(query)
  const categories = useAdminCategories()
  // A derived, non-undefined list so render conditions narrow past property checks.
  const list = useMemo(() => products.data ?? [], [products.data])
  const categoryName = useMemo(
    () => new Map((categories.data ?? []).map((category) => [category.id, category.name])),
    [categories.data],
  )

  const hasFilters =
    appliedSearch !== '' || appliedStatus !== undefined || appliedIsActive !== undefined || appliedCategory !== undefined

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    updateParam('search', searchDraft.trim())
  }

  const clearFilters = () => {
    setSearchDraft('')
    setParams({}, { replace: true })
  }

  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  const deleteMutation = useMutation(
    (id: UUID) => deleteAdminProduct(id).then(() => true as const),
    {
      onSuccess: () => {
        products.refetch()
        showFeedback({
          type: 'success',
          title: 'Product deleted',
          message: 'The product was removed from the catalogue.',
        })
      },
    },
  )

  const requestDelete = (product: Product) => {
    deleteMutation.reset()
    setPendingDelete(product)
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Manage the catalogue. The storefront only ever shows a product that is ACTIVE and enabled."
        action={
          <Action to="/admin/products/new" size="sm" withArrow>
            New product
          </Action>
        }
      />

      <div className="space-y-4">
        <form
          onSubmit={submitSearch}
          className="flex flex-wrap items-end gap-x-4 gap-y-4 rounded-xl border border-line bg-paper-pure p-5 shadow-xs"
        >
          <div className="w-full sm:min-w-56 sm:flex-1">
            <TextField
              name="search"
              label="Search products"
              placeholder="Filter by name or slug…"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="w-full sm:w-40">
            <SelectField
              name="status"
              label="Status"
              value={statusParam ?? ''}
              onChange={(event) => updateParam('status', event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_VALUES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="w-full sm:w-40">
            <SelectField
              name="isActive"
              label="Enabled"
              value={isActiveParam ?? ''}
              onChange={(event) => updateParam('isActive', event.target.value)}
            >
              <option value="">Active or inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </SelectField>
          </div>
          <div className="w-full sm:w-48">
            <SelectField
              name="categoryId"
              label="Category"
              value={categoryIdParam ?? ''}
              onChange={(event) => updateParam('categoryId', event.target.value)}
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
              {/* Keeps a category that is no longer listed selectable rather than
                  silently resetting the filter when the list re-renders. */}
              {appliedCategory !== undefined &&
                !(categories.data ?? []).some((category) => category.id === appliedCategory) && (
                  <option value={appliedCategory}>Unknown category</option>
                )}
            </SelectField>
          </div>
          <div className="flex items-center gap-2">
            <Action type="submit" size="sm">
              Search
            </Action>
            {hasFilters && (
              <Action type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Action>
            )}
          </div>
        </form>

        {categories.error !== undefined && (
          <InlineNotice
            message={toUserMessage(categories.error)}
            onDismiss={() => undefined}
          />
        )}

        {products.isLoading && <ProductListSkeleton />}

        {!products.isLoading && products.error !== undefined && (
          <ErrorState message={toUserMessage(products.error)} onRetry={products.refetch} />
        )}

        {!products.isLoading && products.error === undefined && list.length === 0 && (
          <EmptyState
            align="left"
            eyebrow={hasFilters ? 'No matches' : 'No products yet'}
            title={hasFilters ? 'No products match these filters' : 'The catalogue is empty'}
            description={
              hasFilters
                ? 'Try loosening the search, or clear the filters to see everything.'
                : 'Create a product to start building the catalogue.'
            }
            action={
              hasFilters ? (
                <Action variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Action>
              ) : (
                <Action to="/admin/products/new" size="sm" withArrow>
                  New product
                </Action>
              )
            }
          />
        )}

        {!products.isLoading && products.error === undefined && list.length > 0 && (
          <>
            <p className="text-[12px] text-graphite" aria-live="polite">
              {list.length} {list.length === 1 ? 'product' : 'products'}
            </p>

            <div className="overflow-hidden rounded-xl border border-line bg-paper-pure shadow-xs">
              {/* Desktop: a real table with real column headers. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-canvas/40">
                      <th scope="col" className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                        Base price
                      </th>
                      <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                        Enabled
                      </th>
                      <th scope="col" className="px-4 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite">
                        Updated
                      </th>
                      <th scope="col" className="px-5 py-3 text-[11.5px] font-semibold uppercase tracking-wider text-graphite text-right">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {list.map((product) => (
                      <tr key={product.id} className={`transition-colors hover:bg-bone/40 ${rowDimmed(product, pendingDelete, deleteMutation.isPending)}`}>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/admin/products/${product.id}`}
                            className="font-semibold text-ink underline-offset-4 hover:underline"
                          >
                            {product.name}
                          </Link>
                          <span className="mt-0.5 block font-mono text-[11px] text-graphite">/{product.slug}</span>
                        </td>
                        <td className="px-4 py-3.5 text-graphite">
                          {categoryName.get(product.categoryId) ?? '—'}
                        </td>
                        <td className="px-4 py-3.5 tabular-nums text-ink font-medium">
                          <Money amount={product.basePrice} />
                        </td>
                        <td className="px-4 py-3.5">
                          <ProductStatusBadge status={product.status} />
                        </td>
                        <td className="px-4 py-3.5">
                          <ProductActiveBadge isActive={product.isActive} />
                        </td>
                        <td className="px-4 py-3.5 text-[12.5px] text-graphite">{formatUpdated(product.updatedAt)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              to={`/admin/products/${product.id}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-graphite transition-colors hover:bg-bone hover:text-ink"
                            >
                              <Pencil size={13} strokeWidth={1.8} aria-hidden />
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => requestDelete(product)}
                              aria-label={`Delete ${product.name}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-graphite transition-colors hover:bg-rose-50 hover:text-signal"
                            >
                              <Trash2 size={13} strokeWidth={1.8} aria-hidden />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: flat cards */}
              <ul className="divide-y divide-line-soft md:hidden">
                {list.map((product) => (
                  <li key={product.id} className={`p-4 sm:p-5 ${rowDimmed(product, pendingDelete, deleteMutation.isPending)}`}>
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="font-semibold text-ink underline-offset-4 hover:underline"
                        >
                          {product.name}
                        </Link>
                        <Money amount={product.basePrice} className="font-semibold" />
                      </div>
                      <span className="mt-0.5 block font-mono text-[11px] text-graphite">/{product.slug}</span>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <ProductStatusBadge status={product.status} />
                        <ProductActiveBadge isActive={product.isActive} />
                      </div>
                      <p className="mt-2.5 text-[12.5px] text-graphite">
                        {categoryName.get(product.categoryId) ?? 'Unknown category'}
                        <span className="text-graphite/70"> · updated {formatUpdated(product.updatedAt)}</span>
                      </p>
                      <div className="mt-3.5 flex items-center gap-2 border-t border-line-soft pt-3">
                        <Link
                          to={`/admin/products/${product.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-paper px-3 text-[12px] font-medium text-graphite transition-colors hover:border-ink hover:text-ink"
                        >
                          <Pencil size={13} strokeWidth={1.8} aria-hidden />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => requestDelete(product)}
                          aria-label={`Delete ${product.name}`}
                          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-graphite transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-signal"
                        >
                          <Trash2 size={13} strokeWidth={1.8} aria-hidden />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {pendingDelete !== null && (
        <DeleteProductModal
          product={pendingDelete}
          isDeleting={deleteMutation.isPending}
          error={deleteMutation.error}
          onClose={() => {
            setPendingDelete(null)
            deleteMutation.reset()
          }}
          onConfirm={async () => {
            if (await deleteMutation.run(pendingDelete.id)) setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}

const rowDimmed = (product: Product, pendingDelete: Product | null, isDeleting: boolean): string =>
  isDeleting && pendingDelete?.id === product.id ? 'opacity-50' : ''

const ProductListSkeleton = () => (
  <div className="border border-line bg-paper p-5 sm:p-6" role="status" aria-busy="true">
    <span className="sr-only">Loading products</span>
    {Array.from({ length: 5 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-3">
        <div className="h-3 w-2/5 animate-pulse bg-line-soft" />
        <div className="ml-auto h-3 w-1/6 animate-pulse bg-line-soft" />
      </div>
    ))}
  </div>
)